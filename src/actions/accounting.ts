"use server";

import { requireAuth } from "@/lib/auth";
import {
  BusinessProfile,
  Account,
  JournalEntry,
  JournalEntryLine,
  GSTSummary,
  FinancialStatements,
  TaxInvoice,
  AccountingDashboardMetrics,
} from "@/lib/types/accounting";
import { DatabaseError, ValidationError } from "@/lib/errors";

// In-memory accounting store per tenant
const businessProfilesStore = new Map<string, BusinessProfile>();
const accountsStore = new Map<string, Account[]>();
const journalEntriesStore = new Map<string, JournalEntry[]>();
const invoicesStore = new Map<string, TaxInvoice[]>();

function ensureSeedAccounting(userId: number, userName: string) {
  const businessId = `biz_${userId}_01`;
  if (!businessProfilesStore.has(businessId)) {
    const profile: BusinessProfile = {
      id: businessId,
      userId,
      businessName: "SplitLedger AI Technologies",
      legalName: "SplitLedger AI Technologies Private Limited",
      businessType: "Startup",
      gstin: "27AAPFU0939F1ZV",
      pan: "AAPFU0939F",
      tan: "PNEP12345F",
      financialYear: "2026-2027",
      state: "Maharashtra (27)",
      country: "India",
      currency: "INR",
      isDefault: true,
      createdAt: new Date().toISOString(),
    };
    businessProfilesStore.set(businessId, profile);

    // Initial Chart of Accounts (Strictly Balanced: Assets + Expenses == Liabilities + Equity + Income)
    const defaultAccounts: Account[] = [
      { id: `acc_${businessId}_1000`, code: "1000", name: "Cash on Hand", type: "asset", balance: 25000, currency: "INR" },
      { id: `acc_${businessId}_1010`, code: "1010", name: "HDFC Current Account", type: "asset", balance: 450000, currency: "INR" },
      { id: `acc_${businessId}_1020`, code: "1020", name: "Accounts Receivable", type: "asset", balance: 85000, currency: "INR" },
      { id: `acc_${businessId}_1030`, code: "1030", name: "Office IT Equipment", type: "asset", balance: 120000, currency: "INR" },
      { id: `acc_${businessId}_2000`, code: "2000", name: "Accounts Payable", type: "liability", balance: 35000, currency: "INR" },
      { id: `acc_${businessId}_2010`, code: "2010", name: "GST Output Payable", type: "liability", balance: 18000, currency: "INR" },
      { id: `acc_${businessId}_2020`, code: "2020", name: "GST Input Tax Credit (ITC)", type: "asset", balance: 6500, currency: "INR" },
      { id: `acc_${businessId}_3000`, code: "3000", name: "Owner's Equity / Capital", type: "equity", balance: 410500, currency: "INR" },
      { id: `acc_${businessId}_4000`, code: "4000", name: "Software License & API Revenue", type: "income", balance: 320000, currency: "INR" },
      { id: `acc_${businessId}_5000`, code: "5000", name: "Cloud Hosting & Server Costs", type: "expense", balance: 52000, currency: "INR" },
      { id: `acc_${businessId}_5010`, code: "5010", name: "Office Rent & Utilities", type: "expense", balance: 45000, currency: "INR" },
    ];
    accountsStore.set(businessId, defaultAccounts);

    // Initial Journal Entry (Balanced)
    const initialEntry: JournalEntry = {
      id: `je_${businessId}_001`,
      businessId,
      date: new Date().toISOString().split("T")[0],
      description: "Enterprise API Subscription License Payment",
      reference: "INV-2026-001",
      lines: [
        { accountId: `acc_${businessId}_1010`, accountCode: "1010", accountName: "HDFC Current Account", debit: 118000, credit: 0 },
        { accountId: `acc_${businessId}_4000`, accountCode: "4000", accountName: "Software License & API Revenue", debit: 0, credit: 100000 },
        { accountId: `acc_${businessId}_2010`, accountCode: "2010", accountName: "GST Output Payable", debit: 0, credit: 18000 },
      ],
      totalDebit: 118000,
      totalCredit: 118000,
      createdAt: new Date().toISOString(),
    };
    journalEntriesStore.set(businessId, [initialEntry]);

    // Initial Tax Invoice
    const invoice: TaxInvoice = {
      id: `inv_${businessId}_01`,
      businessId,
      invoiceNumber: "INV-2026-001",
      customerName: "Acme Enterprises India Pvt Ltd",
      customerGstin: "27ABCDE1234F1Z5",
      items: [
        { name: "SplitLedger Enterprise Annual License", quantity: 1, unitPrice: 100000, total: 100000 },
      ],
      subtotal: 100000,
      cgst: 9000,
      sgst: 9000,
      igst: 0,
      total: 118000,
      currency: "INR",
      status: "paid",
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };
    invoicesStore.set(businessId, [invoice]);
  }
}

/**
 * Record a Double-Entry Journal Entry with Balance Validation (Debit == Credit)
 */
export async function recordJournalEntry(data: {
  businessId?: string;
  description: string;
  reference?: string;
  lines: JournalEntryLine[];
}): Promise<JournalEntry> {
  const user = await requireAuth();
  ensureSeedAccounting(user.id, user.name || "User");
  const businessId = data.businessId || `biz_${user.id}_01`;

  const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new ValidationError(
      `Double-Entry Bookkeeping Error: Total Debits (₹${totalDebit.toLocaleString("en-IN")}) must equal Total Credits (₹${totalCredit.toLocaleString("en-IN")}).`
    );
  }

  const entry: JournalEntry = {
    id: `je_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    businessId,
    date: new Date().toISOString().split("T")[0],
    description: data.description,
    reference: data.reference || `REF-${Date.now().toString().slice(-5)}`,
    lines: data.lines,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    createdAt: new Date().toISOString(),
  };

  const currentEntries = journalEntriesStore.get(businessId) || [];
  currentEntries.push(entry);
  journalEntriesStore.set(businessId, currentEntries);

  // Update account balances
  const accounts = accountsStore.get(businessId) || [];
  for (const line of data.lines) {
    const acc = accounts.find((a) => a.id === line.accountId || a.code === line.accountCode);
    if (acc) {
      if (acc.type === "asset" || acc.type === "expense") {
        acc.balance += (line.debit || 0) - (line.credit || 0);
      } else {
        acc.balance += (line.credit || 0) - (line.debit || 0);
      }
    }
  }

  return entry;
}

/**
 * Generate Comprehensive Financial Statements (Trial Balance, P&L, Balance Sheet)
 */
export async function generateFinancialStatements(businessId?: string): Promise<FinancialStatements> {
  const user = await requireAuth();
  ensureSeedAccounting(user.id, user.name || "User");
  const bId = businessId || `biz_${user.id}_01`;
  const accounts = accountsStore.get(bId) || [];

  // 1. Trial Balance Items
  let totalDebit = 0;
  let totalCredit = 0;

  const trialBalanceItems = accounts.map((acc) => {
    let debit = 0;
    let credit = 0;
    if (acc.type === "asset" || acc.type === "expense") {
      debit = Math.max(0, acc.balance);
      credit = acc.balance < 0 ? Math.abs(acc.balance) : 0;
    } else {
      credit = Math.max(0, acc.balance);
      debit = acc.balance < 0 ? Math.abs(acc.balance) : 0;
    }
    totalDebit += debit;
    totalCredit += credit;

    return {
      accountCode: acc.code,
      accountName: acc.name,
      type: acc.type,
      debit,
      credit,
    };
  });

  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  // 2. Profit & Loss Statement
  const revenue = accounts.filter((a) => a.type === "income").reduce((sum, a) => sum + a.balance, 0);
  const operatingExpenses = accounts.filter((a) => a.type === "expense").reduce((sum, a) => sum + a.balance, 0);
  const netProfit = revenue - operatingExpenses;

  // 3. Balance Sheet
  const totalAssets = accounts.filter((a) => a.type === "asset").reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.type === "liability").reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = accounts.filter((a) => a.type === "equity").reduce((sum, a) => sum + a.balance, 0) + netProfit;

  return {
    trialBalance: {
      items: trialBalanceItems,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced,
    },
    profitAndLoss: {
      revenue,
      costOfSales: 0,
      grossProfit: revenue,
      operatingExpenses,
      netProfit,
      currency: "INR",
    },
    balanceSheet: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 10,
      currency: "INR",
    },
  };
}

/**
 * Calculate Indian GST Breakdown & Input Tax Credit (ITC) Summary
 */
export async function calculateGstSummary(businessId?: string): Promise<GSTSummary> {
  const user = await requireAuth();
  ensureSeedAccounting(user.id, user.name || "User");
  const bId = businessId || `biz_${user.id}_01`;
  const accounts = accountsStore.get(bId) || [];

  const gstOutput = accounts.find((a) => a.code === "2010")?.balance || 18000;
  const gstInput = accounts.find((a) => a.code === "2020")?.balance || 6500;
  const revenue = accounts.find((a) => a.code === "4000")?.balance || 100000;

  const cgstPayable = Math.round((gstOutput / 2) * 100) / 100;
  const sgstPayable = Math.round((gstOutput / 2) * 100) / 100;
  const netGstPayable = Math.max(0, gstOutput - gstInput);

  return {
    taxableSales: revenue,
    cgstPayable,
    sgstPayable,
    igstPayable: 0,
    totalOutputGst: gstOutput,
    itcAvailable: gstInput,
    netGstPayable,
    currency: "INR",
  };
}

/**
 * Create a new GST-Compliant Tax Invoice
 */
export async function createTaxInvoice(data: {
  businessId?: string;
  customerName: string;
  customerGstin?: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  isInterstate?: boolean;
}): Promise<TaxInvoice> {
  const user = await requireAuth();
  ensureSeedAccounting(user.id, user.name || "User");
  const bId = data.businessId || `biz_${user.id}_01`;

  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const items = data.items.map((i) => ({ ...i, total: i.quantity * i.unitPrice }));

  const isInter = data.isInterstate || false;
  const cgst = isInter ? 0 : Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = isInter ? 0 : Math.round(subtotal * 0.09 * 100) / 100;
  const igst = isInter ? Math.round(subtotal * 0.18 * 100) / 100 : 0;
  const total = Math.round((subtotal + cgst + sgst + igst) * 100) / 100;

  const invoiceNumber = `INV-2026-${Date.now().toString().slice(-4)}`;
  const invoice: TaxInvoice = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    businessId: bId,
    invoiceNumber,
    customerName: data.customerName,
    customerGstin: data.customerGstin,
    items,
    subtotal,
    cgst,
    sgst,
    igst,
    total,
    currency: "INR",
    status: "sent",
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  };

  const invoices = invoicesStore.get(bId) || [];
  invoices.push(invoice);
  invoicesStore.set(bId, invoices);

  // Automatically record balanced double entry
  await recordJournalEntry({
    businessId: bId,
    description: `Tax Invoice ${invoiceNumber} issued to ${data.customerName}`,
    reference: invoiceNumber,
    lines: [
      { accountId: `acc_${bId}_1020`, accountCode: "1020", accountName: "Accounts Receivable", debit: total, credit: 0 },
      { accountId: `acc_${bId}_4000`, accountCode: "4000", accountName: "Software License & API Revenue", debit: 0, credit: subtotal },
      { accountId: `acc_${bId}_2010`, accountCode: "2010", accountName: "GST Output Payable", debit: 0, credit: cgst + sgst + igst },
    ],
  });

  return invoice;
}

/**
 * Get Comprehensive Business Accounting Dashboard Metrics
 */
export async function getAccountingDashboardSummary(businessId?: string): Promise<AccountingDashboardMetrics> {
  const user = await requireAuth();
  ensureSeedAccounting(user.id, user.name || "User");
  const bId = businessId || `biz_${user.id}_01`;

  const business = businessProfilesStore.get(bId)!;
  const accounts = accountsStore.get(bId) || [];
  const journalEntries = journalEntriesStore.get(bId) || [];
  const invoices = invoicesStore.get(bId) || [];

  const financialStatements = await generateFinancialStatements(bId);
  const gstSummary = await calculateGstSummary(bId);

  return {
    business,
    totalRevenue: financialStatements.profitAndLoss.revenue,
    totalExpenses: financialStatements.profitAndLoss.operatingExpenses,
    netProfit: financialStatements.profitAndLoss.netProfit,
    gstPayable: gstSummary.netGstPayable,
    itcAvailable: gstSummary.itcAvailable,
    outstandingInvoicesCount: invoices.filter((i) => i.status !== "paid").length,
    journalEntriesCount: journalEntries.length,
    financialStatements,
    gstSummary,
    invoices,
    accounts,
    journalEntries,
  };
}

/**
 * Export Accounting Records to Tally XML, JSON, or CSV
 */
export async function exportAccountingData(
  format: "json" | "csv" | "tally_xml",
  businessId?: string
): Promise<string> {
  const user = await requireAuth();
  ensureSeedAccounting(user.id, user.name || "User");
  const bId = businessId || `biz_${user.id}_01`;
  const summary = await getAccountingDashboardSummary(bId);

  if (format === "json") {
    return JSON.stringify(summary, null, 2);
  }

  if (format === "tally_xml") {
    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COMPANY>
            <NAME>${summary.business.legalName}</NAME>
            <GSTIN>${summary.business.gstin}</GSTIN>
          </COMPANY>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  // CSV output
  const lines = [
    "Date,Reference,Description,Account,Debit,Credit",
    ...summary.journalEntries.flatMap((e) =>
      e.lines.map((l) => `${e.date},${e.reference},"${e.description}",${l.accountName},${l.debit},${l.credit}`)
    ),
  ];
  return lines.join("\n");
}
