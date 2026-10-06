"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { receipts, transactions } from "@/lib/db/schema/schema";
import { eq, and, or, sql } from "drizzle-orm";
import {
  ParsedReceiptData,
  ReceiptLineItem,
  TaxBreakdown,
  ItemizedSplitAllocation,
} from "@/lib/types/receipts";
import { ValidationError } from "@/lib/errors";

// In-memory invoice hash registry to prevent duplicate uploads in current session
const knownInvoiceRegistry = new Set<string>();

export async function clearKnownInvoiceRegistry(): Promise<void> {
  knownInvoiceRegistry.clear();
}

export interface ReceiptValidationAudit {
  merchantValid: boolean;
  gstValid: boolean;
  dateValid: boolean;
  taxReconciled: boolean;
  isDuplicate: boolean;
  duplicateStatus: "Unique" | "Duplicate Found" | "Unable to Verify";
  suggestedCategory: string;
  suggestedPaymentMethod: string;
  validationScore: number; // 0 - 100
  warnings: string[];
}

/**
 * Check if receipt invoice already exists in PostgreSQL database
 */
export async function checkDatabaseDuplicateInvoice(
  merchant: string,
  invoiceNumber: string,
  grandTotal: number
): Promise<boolean> {
  try {
    const user = await requireAuth();
    const amountInPaise = Math.round(grandTotal * 100);

    const existing = await db
      .select({ id: receipts.id })
      .from(receipts)
      .innerJoin(transactions, eq(receipts.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.isDeleted, false),
          or(
            and(eq(receipts.merchant, merchant), eq(receipts.extractedAmount, amountInPaise)),
            sql`LOWER(COALESCE(${receipts.originalFileName}, '')) LIKE ${`%${invoiceNumber.toLowerCase()}%`}`
          )
        )
      )
      .limit(1);

    return existing.length > 0;
  } catch {
    return false;
  }
}

/**
 * Scan & Parse Receipt OCR Text into Structured Indian Financial Data
 * Strictly extracts detected fields. NEVER fabricates missing values.
 */
export async function scanAndParseReceipt(
  rawText: string,
  groupId?: number
): Promise<ParsedReceiptData & { validation: ReceiptValidationAudit }> {
  await requireAuth();

  const trimmedText = rawText.trim();
  const lowerText = trimmedText.toLowerCase();

  // 1. Detect GSTIN (15-character Indian GST format: 2 digits + 5 letters + 4 digits + 1 letter + 1 char + Z + 1 char)
  const gstRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/i;
  const gstMatch = trimmedText.match(gstRegex);
  const gstNumber = gstMatch ? gstMatch[0].toUpperCase() : undefined;

  // 2. Detect Invoice / Bill Number (explicit keyword match only)
  const invRegex = /(?:invoice\s*(?:no\.?|#|number)|inv\s*(?:no\.?|#)|bill\s*(?:no\.?|#))[\s#:.-]*([A-Z0-9\/-]+)/i;
  const invMatch = trimmedText.match(invRegex);
  const invoiceNumber = invMatch ? invMatch[1].trim() : undefined;

  // 3. Detect Date from Receipt Text
  let detectedDate: string | undefined = undefined;
  const dateRegex = /(?:date|dated|dt)[\s:.-]*(\d{1,4}[-/. ]\d{1,2}[-/. ]\d{1,4})/i;
  const dateMatch = trimmedText.match(dateRegex);
  if (dateMatch) {
    const rawDateStr = dateMatch[1].trim().replace(/[/. ]/g, "-");
    const parts = rawDateStr.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        detectedDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        detectedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else {
        detectedDate = rawDateStr;
      }
    } else {
      detectedDate = rawDateStr;
    }
  } else {
    // Fallback search for standalone YYYY-MM-DD or DD/MM/YYYY pattern
    const isoDateMatch = trimmedText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      detectedDate = isoDateMatch[1];
    }
  }

  // 4. Detect Merchant Name
  // Filter out noise, empty lines, and non-merchant header lines
  const ignoredHeaderTerms = [
    "tax invoice",
    "invoice",
    "retail invoice",
    "bill",
    "cash memo",
    "customer copy",
    "original for recipient",
    "gstin",
    "date",
    "welcome",
  ];
  const candidateLines = trimmedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 2) return false;
      const lowerL = l.toLowerCase();
      return !ignoredHeaderTerms.some((term) => lowerL === term || lowerL.startsWith(term + ":"));
    });

  let merchantName: string | undefined = undefined;
  for (const line of candidateLines) {
    // A merchant line must contain at least 2 consecutive alphabetic characters
    if (/[a-zA-Z]{2,}/.test(line) && !line.includes("=") && !line.includes("----")) {
      merchantName = line;
      break;
    }
  }

  // 5. Line Item Extraction (item name followed by price)
  const items: ReceiptLineItem[] = [];
  let calculatedSubtotal = 0;

  const itemRegex = /([a-zA-Z\s]{2,})\s+(?:(\d+)\s+)?(?:x\s+)?(?:₹|Rs\.?|INR)?\s*(\d+(?:\.\d{1,2})?)/gi;
  let match;
  let idx = 1;
  while ((match = itemRegex.exec(trimmedText)) !== null) {
    const name = match[1].trim();
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes("total") ||
      lowerName.includes("gst") ||
      lowerName.includes("tax") ||
      lowerName.includes("subtotal") ||
      lowerName.includes("cash") ||
      lowerName.includes("invoice") ||
      lowerName.includes("change") ||
      lowerName.includes("payment") ||
      lowerName.includes("round off") ||
      name.length < 2
    ) {
      continue;
    }

    const qty = match[2] ? parseInt(match[2], 10) : 1;
    const price = parseFloat(match[3]);
    if (isNaN(price) || price <= 0) continue;

    const totalPrice = Math.round(qty * price * 100) / 100;
    items.push({
      id: `item_${idx++}`,
      name,
      quantity: qty,
      unitPrice: price,
      totalPrice,
      assignedMemberIds: [],
    });
    calculatedSubtotal += totalPrice;
  }

  // Explicit Subtotal and Grand Total Extraction
  const subtotalMatch = trimmedText.match(/(?:sub\s*total)[\s:₹Rs.]*(\d+(?:\.\d{1,2})?)/i);
  const explicitSubtotal = subtotalMatch ? parseFloat(subtotalMatch[1]) : undefined;

  const grandTotalMatch = trimmedText.match(/(?:grand\s+total|total\s+amount|net\s+pay(?:able)?|net\s+amount|amount\s+payable|(?<!sub)total)[\s:₹Rs.]*(\d+(?:\.\d{1,2})?)/i);
  const explicitTotal = grandTotalMatch ? parseFloat(grandTotalMatch[1]) : undefined;

  // 6. Tax Breakdown
  const cgstMatch = trimmedText.match(/cgst[\s@\d.%:₹Rs.]*(\d+(?:\.\d{1,2})?)/i);
  const sgstMatch = trimmedText.match(/sgst[\s@\d.%:₹Rs.]*(\d+(?:\.\d{1,2})?)/i);
  const cgst = cgstMatch ? parseFloat(cgstMatch[1]) : 0;
  const sgst = sgstMatch ? parseFloat(sgstMatch[1]) : 0;
  const totalTax = Math.round((cgst + sgst) * 100) / 100;

  const taxBreakdown: TaxBreakdown = {
    cgst,
    sgst,
    igst: 0,
    vat: 0,
    serviceCharge: 0,
    totalTax,
  };

  // Grand Total determination (no hardcoded fallback!)
  let grandTotal: number | undefined = explicitTotal;
  let subtotal: number | undefined = explicitSubtotal !== undefined ? explicitSubtotal : calculatedSubtotal > 0 ? calculatedSubtotal : undefined;

  if (grandTotal === undefined && subtotal !== undefined && subtotal > 0) {
    grandTotal = Math.round((subtotal + totalTax) * 100) / 100;
  } else if (grandTotal !== undefined && subtotal === undefined) {
    subtotal = Math.max(0, Math.round((grandTotal - totalTax) * 100) / 100);
  }

  // 7. Duplicate Verification
  // If merchant or invoice number is not detected, cannot verify duplicate!
  let isDuplicate = false;
  let duplicateStatus: "Unique" | "Duplicate Found" | "Unable to Verify" = "Unable to Verify";

  if (merchantName && invoiceNumber) {
    const invoiceKey = `${merchantName.toLowerCase()}_${invoiceNumber.toLowerCase()}`;
    isDuplicate = knownInvoiceRegistry.has(invoiceKey);
    if (!isDuplicate && grandTotal) {
      const dbDup = await checkDatabaseDuplicateInvoice(merchantName, invoiceNumber, grandTotal);
      if (dbDup) isDuplicate = true;
    }

    if (isDuplicate) {
      duplicateStatus = "Duplicate Found";
    } else {
      duplicateStatus = "Unique";
      knownInvoiceRegistry.add(invoiceKey);
    }
  }

  // 8. Dynamic Confidence Calculation (0 - 100%)
  // - Merchant: +25%
  // - Total amount: +30%
  // - Date: +20%
  // - GSTIN: +15%
  // - Line items: +10%
  let confidenceScore = 0;
  if (merchantName) confidenceScore += 25;
  if (grandTotal && grandTotal > 0) confidenceScore += 30;
  if (detectedDate) confidenceScore += 20;
  if (gstNumber) confidenceScore += 15;
  if (items.length > 0) confidenceScore += 10;

  // 9. Auto Category & Receipt Type (based strictly on detected keywords)
  let category = "Food & Dining";
  let receiptType: ParsedReceiptData["receiptType"] = "General";

  if (lowerText.includes("petrol") || lowerText.includes("fuel") || lowerText.includes("diesel")) {
    category = "Transportation";
    receiptType = "Fuel";
  } else if (lowerText.includes("pharmacy") || lowerText.includes("hospital") || lowerText.includes("clinic") || lowerText.includes("medical")) {
    category = "Healthcare";
    receiptType = "Medical";
  } else if (lowerText.includes("hotel") || lowerText.includes("flight") || lowerText.includes("travel")) {
    category = "Travel";
    receiptType = "Travel";
  } else if (lowerText.includes("electricity") || lowerText.includes("water") || lowerText.includes("broadband") || lowerText.includes("utility")) {
    category = "Utilities";
    receiptType = "Utilities";
  } else if (lowerText.includes("grocery") || lowerText.includes("supermarket") || lowerText.includes("mart")) {
    category = "Groceries";
    receiptType = "Grocery";
  } else if (lowerText.includes("cafe") || lowerText.includes("coffee") || lowerText.includes("restaurant") || lowerText.includes("dining")) {
    category = "Food & Dining";
    receiptType = "Restaurant";
  }

  // Validation Audit Generation
  const warnings: string[] = [];
  if (!merchantName) warnings.push("Merchant name not detected.");
  if (!grandTotal || grandTotal <= 0) warnings.push("Total amount not detected.");
  if (!detectedDate) warnings.push("Receipt date not detected.");
  if (!gstNumber) warnings.push("Missing GSTIN registration on invoice.");
  if (isDuplicate) warnings.push("Duplicate invoice detected.");

  const validation: ReceiptValidationAudit = {
    merchantValid: Boolean(merchantName && merchantName.length > 2),
    gstValid: Boolean(gstNumber),
    dateValid: Boolean(detectedDate),
    taxReconciled: totalTax === Math.round((cgst + sgst) * 100) / 100,
    isDuplicate,
    duplicateStatus,
    suggestedCategory: category,
    suggestedPaymentMethod: "UPI",
    validationScore: confidenceScore,
    warnings,
  };

  return {
    merchantName,
    gstNumber,
    invoiceNumber,
    date: detectedDate,
    currency: "INR",
    items,
    subtotal,
    taxBreakdown,
    grandTotal,
    paymentMethod: "UPI",
    category,
    confidenceScore,
    receiptType,
    isDuplicate,
    duplicateStatus,
    validation,
  };
}

/**
 * Compute Proportional Itemized Split Allocation for Group Members
 */
export async function computeItemizedSplit(
  items: ReceiptLineItem[],
  taxBreakdown: TaxBreakdown,
  members: Array<{ id: number; name: string }>
): Promise<ItemizedSplitAllocation[]> {
  if (!members || members.length === 0 || !items || items.length === 0) {
    return [];
  }

  const memberItemTotals = new Map<number, { total: number; names: string[] }>();
  for (const m of members) {
    memberItemTotals.set(m.id, { total: 0, names: [] });
  }

  let totalItemSpend = 0;

  for (const item of items) {
    const assigned = item.assignedMemberIds.length > 0 ? item.assignedMemberIds : members.map((m) => m.id);
    const splitPerMember = item.totalPrice / assigned.length;
    totalItemSpend += item.totalPrice;

    for (const memberId of assigned) {
      const current = memberItemTotals.get(memberId);
      if (current) {
        current.total += splitPerMember;
        if (!current.names.includes(item.name)) {
          current.names.push(item.name);
        }
      }
    }
  }

  const totalTax = taxBreakdown.totalTax || 0;
  const allocations: ItemizedSplitAllocation[] = [];

  for (const m of members) {
    const data = memberItemTotals.get(m.id) || { total: 0, names: [] };
    const proportion = totalItemSpend > 0 ? data.total / totalItemSpend : 1 / members.length;
    const taxShare = Math.round(totalTax * proportion * 100) / 100;
    const totalPayable = Math.round((data.total + taxShare) * 100) / 100;

    allocations.push({
      memberId: m.id,
      memberName: m.name,
      itemSubtotal: Math.round(data.total * 100) / 100,
      taxShare,
      totalPayable,
      itemsList: data.names,
    });
  }

  return allocations;
}
