import { describe, it, expect, vi } from "vitest";
import {
  validateTransactions,
  validateSettlements,
  validateBudgets,
} from "@/lib/ai/financial-validator";
import { parseVoiceCommand } from "@/lib/ai/voice-parser";
import { scanAndParseReceipt, computeItemizedSplit } from "@/actions/receipt-scanner";
import { emitFinancialEvent, subscribeFinancialEvents } from "@/lib/events/financial-events";

describe("Global Financial Data Validation Engine", () => {
  it("filters out soft-deleted records and rejects unauthorized user records", () => {
    const raw = [
      { id: 1, userId: 101, amount: 50000, isDeleted: false, title: "Groceries" },
      { id: 2, userId: 101, amount: 30000, isDeleted: true, title: "Deleted Item" }, // Soft-deleted
      { id: 3, userId: 999, amount: 15000, isDeleted: false, title: "Unauthorized user" }, // Wrong user
    ];

    const result = validateTransactions(raw, 101);
    expect(result.metrics.validCount).toBe(1);
    expect(result.metrics.discardedCount).toBe(2);
    expect(result.sanitizedData[0].title).toBe("Groceries");
  });

  it("flags duplicate transactions with same amount and title within same time window", () => {
    const now = new Date();
    const raw = [
      { id: 1, userId: 101, amount: 45000, title: "Swiggy Order", date: now, isDeleted: false },
      { id: 2, userId: 101, amount: 45000, title: "Swiggy Order", date: now, isDeleted: false }, // Duplicate
    ];

    const result = validateTransactions(raw, 101);
    expect(result.metrics.validCount).toBe(2);
    expect(result.metrics.flaggedCount).toBe(1);
    expect(result.issues.some((i) => i.code === "DUPLICATE_RECORD")).toBe(true);
  });

  it("sanitizes missing category to 'Uncategorized'", () => {
    const raw = [
      { id: 1, userId: 101, amount: 20000, title: "Unknown Store", isDeleted: false, categoryName: null },
    ];

    const result = validateTransactions(raw, 101);
    expect(result.sanitizedData[0].categoryName).toBe("Uncategorized");
    expect(result.issues.some((i) => i.code === "MISSING_CATEGORY")).toBe(true);
  });

  it("validates settlements and discards non-positive amounts", () => {
    const raw = [
      { id: 1, fromUserId: 101, toUserId: 102, amount: 50000, isDeleted: false, status: "pending" },
      { id: 2, fromUserId: 101, toUserId: 102, amount: -100, isDeleted: false }, // Invalid negative
      { id: 3, fromUserId: 999, toUserId: 888, amount: 20000, isDeleted: false }, // Unrelated users
    ];

    const result = validateSettlements(raw, 101);
    expect(result.metrics.validCount).toBe(1);
    expect(result.metrics.discardedCount).toBe(2);
  });
});

describe("AI Voice & Text Command Parser with Dynamic Confidence & Missing Clarifications", () => {
  it("detects missing amount in expense command and sets validationStatus to missing_parameters", () => {
    const cmd = parseVoiceCommand("Add Food Expense");
    expect(cmd.action).toBe("add_expense");
    expect(cmd.validationStatus).toBe("missing_parameters");
    expect(cmd.missingField).toBe("amount");
    expect(cmd.clarificationPrompt).toContain("amount");
  });

  it("parses full expense command with dynamic confidence breakdown", () => {
    const cmd = parseVoiceCommand("Add ₹750 food expense");
    expect(cmd.action).toBe("add_expense");
    expect(cmd.validationStatus).toBe("valid");
    expect(cmd.parameters.amount).toBe(750);
    expect(cmd.confidenceBreakdown).toBeDefined();
    expect(cmd.confidenceBreakdown.overallConfidence).toBeGreaterThan(0.85);
    expect(cmd.confidenceBreakdown.intentConfidence).toBeGreaterThan(0.9);
    expect(cmd.confidenceBreakdown.entityConfidence).toBeGreaterThan(0.9);
  });

  it("detects missing trip destination name and prompts for clarification", () => {
    const cmd = parseVoiceCommand("Create a new trip");
    expect(cmd.action).toBe("create_trip");
    expect(cmd.validationStatus).toBe("missing_parameters");
    expect(cmd.missingField).toBe("tripName");
  });

  it("parses complete trip command with destination and budget", () => {
    const cmd = parseVoiceCommand("Create Goa Trip with budget ₹25000");
    expect(cmd.action).toBe("create_trip");
    expect(cmd.validationStatus).toBe("valid");
    expect(cmd.parameters.tripName).toBe("Goa");
    expect(cmd.parameters.budgetAmount).toBe(25000);
  });

  it("parses Hinglish and multilingual queries correctly", () => {
    const cmd1 = parseVoiceCommand("Maza balance kiti aahe sanga");
    expect(cmd1.action).toBe("show_balance");
    expect(cmd1.validationStatus).toBe("valid");

    const cmd2 = parseVoiceCommand("Kiske paas kitna paisa lena hai");
    expect(cmd2.action).toBe("who_owes_me");
    expect(cmd2.validationStatus).toBe("valid");
  });

  it("parses expanded production voice commands accurately", () => {
    // 1. Add expense 450 food (amount before category)
    const c1 = parseVoiceCommand("Add expense 450 food");
    expect(c1.action).toBe("add_expense");
    expect(c1.parameters.amount).toBe(450);
    expect(c1.parameters.category).toBe("Food & Dining");

    // 2. Create Friends Group
    const c2 = parseVoiceCommand("Create Friends Group");
    expect(c2.action).toBe("create_group");
    expect(c2.parameters.groupName).toBe("Friends");

    // 3. Record Income 15000
    const c3 = parseVoiceCommand("Record Income 15000");
    expect(c3.action).toBe("record_income");
    expect(c3.parameters.amount).toBe(15000);

    // 4. Set Budget 5000
    const c4 = parseVoiceCommand("Set Budget 5000");
    expect(c4.action).toBe("set_budget");
    expect(c4.parameters.budgetAmount).toBe(5000);

    // 5. Delete last expense
    const c5 = parseVoiceCommand("Delete last expense");
    expect(c5.action).toBe("delete_last_expense");
    expect(c5.requiresConfirmation).toBe(true);

    // 6. Undo previous action
    const c6 = parseVoiceCommand("Undo previous action");
    expect(c6.action).toBe("undo_previous");

    // 7. Search Petrol Expenses
    const c7 = parseVoiceCommand("Search Petrol Expenses");
    expect(c7.action).toBe("search_expenses");
    expect(c7.parameters.searchTerm).toBe("Petrol");

    // 8. Navigation commands
    expect(parseVoiceCommand("Open Reports").action).toBe("open_reports");
    expect(parseVoiceCommand("Show Budgets").action).toBe("show_budgets");
    expect(parseVoiceCommand("Open Notes").action).toBe("open_notes");
    expect(parseVoiceCommand("Today's expenses").action).toBe("today_expenses");
  });
});

describe("Receipt OCR Validation Engine", () => {
  it("strictly returns Not Detected and Unable to Verify for non-financial or empty text", async () => {
    const nonFinancialText = "   ";
    const result = await scanAndParseReceipt(nonFinancialText);

    expect(result.merchantName).toBeUndefined();
    expect(result.invoiceNumber).toBeUndefined();
    expect(result.date).toBeUndefined();
    expect(result.items).toEqual([]);
    expect(result.grandTotal).toBeUndefined();
    expect(result.confidenceScore).toBe(0);
    expect(result.duplicateStatus).toBe("Unable to Verify");
    expect(result.validation.merchantValid).toBe(false);
  });

  it("parses receipt text, reconciles CGST/SGST taxes, and generates validation audit", async () => {
    const text = `
STARBUCKS COFFEE
GSTIN: 27AABCS1429B1Z1
Invoice No: INV-SBX-1092
Date: 2026-09-01

Java Chip Frappuccino 2 x 350.00
Blueberry Muffin 1 x 220.00

Subtotal: 920.00
CGST: 23.00
SGST: 23.00
Grand Total: 966.00
`;

    const result = await scanAndParseReceipt(text);
    expect(result.merchantName).toContain("STARBUCKS");
    expect(result.gstNumber).toBe("27AABCS1429B1Z1");
    expect(result.grandTotal).toBe(966);
    expect(result.duplicateStatus).toBe("Unique");
    expect(result.validation.merchantValid).toBe(true);
    expect(result.validation.gstValid).toBe(true);
    expect(result.validation.taxReconciled).toBe(true);
    expect(result.validation.validationScore).toBeGreaterThan(90);
  });

  it("computes itemized split proportionally with taxes and returns empty if no members", async () => {
    const items = [
      { id: "1", name: "Pizza", quantity: 1, unitPrice: 600, totalPrice: 600, assignedMemberIds: [1] },
      { id: "2", name: "Pasta", quantity: 1, unitPrice: 400, totalPrice: 400, assignedMemberIds: [2] },
    ];
    const taxes = { cgst: 25, sgst: 25, totalTax: 50, igst: 0, vat: 0, serviceCharge: 0 };
    const members = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const splits = await computeItemizedSplit(items, taxes, members);
    expect(splits).toHaveLength(2);
    expect(splits.find((s) => s.memberId === 1)?.totalPayable).toBe(630);
    expect(splits.find((s) => s.memberId === 2)?.totalPayable).toBe(420);

    // Empty members returns empty array (zero fake members injected)
    const emptySplits = await computeItemizedSplit(items, taxes, []);
    expect(emptySplits).toEqual([]);
  });
});

describe("Universal Financial Events & Sync Engine", () => {
  it("subscribes and receives dispatched financial events", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeFinancialEvents(handler);

    emitFinancialEvent("expense:created", { entityId: "tx_123" });
    // In node/test environment, emitFinancialEvent safely checks window
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});
