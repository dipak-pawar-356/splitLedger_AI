import { describe, it, expect } from "vitest";
import {
  calculateApprovalSummary,
  PendingTransactionDraft,
} from "@/components/ai/transaction-approval-card";
import { ProposedTransaction } from "@/lib/ai/nlp-transaction-parser";

describe("Multi-Transaction Approval Calculation & Selection Engine", () => {
  const createMockDraft = (
    tempId: string,
    title: string,
    amount: number,
    type: "paid" | "received" | "lent" | "borrowed" = "paid",
    categoryName: string = "General",
    selected: boolean = true,
    status: "draft" | "approved" | "cancelled" = "draft"
  ): PendingTransactionDraft => {
    const proposal: ProposedTransaction = {
      tempId,
      title,
      description: title,
      type,
      amount,
      currency: "INR",
      date: "2026-11-02",
      formattedDate: "Today",
      time: "Current Time",
      categoryName,
      status,
    };

    return {
      id: tempId,
      selected,
      values: { ...proposal },
      originalExtraction: { ...proposal },
      status,
    };
  };

  it("Example 1: 3 transactions selected -> total equals all three; uncheck 1 -> immediately excludes it", () => {
    // Water Bottle ₹20, Food ₹300, T-Shirt ₹300
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Water Bottle", 20, "paid", "Groceries"),
      createMockDraft("2", "Food", 300, "paid", "Food & Dining"),
      createMockDraft("3", "T-Shirt", 300, "paid", "Shopping"),
    ];

    // Initial total
    let summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(3);
    expect(summary.approvalCount).toBe(3);
    expect(summary.selectedAmount).toBe(620);
    expect(summary.expenseTotal).toBe(620);
    expect(summary.incomeTotal).toBe(0);
    expect(summary.categoryCount).toBe(3);

    // User unchecks T-Shirt
    drafts[2].selected = false;
    summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(2);
    expect(summary.approvalCount).toBe(2);
    expect(summary.selectedAmount).toBe(320); // NOT 620
    expect(summary.expenseTotal).toBe(320);
    expect(summary.incomeTotal).toBe(0);
    expect(summary.categoryCount).toBe(2);

    // User checks T-Shirt again
    drafts[2].selected = true;
    summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(3);
    expect(summary.selectedAmount).toBe(620);
  });

  it("Example 2: Petrol ₹500, Tea ₹30, Recharge ₹399 -> Uncheck Recharge -> Selected 2, Total ₹530", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Petrol", 500, "paid", "Travel & Commute"),
      createMockDraft("2", "Tea", 30, "paid", "Food & Dining"),
      createMockDraft("3", "Recharge", 399, "paid", "Bills & Utilities"),
    ];

    let summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(3);
    expect(summary.selectedAmount).toBe(929);

    // User unchecks Recharge
    drafts[2].selected = false;
    summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(2);
    expect(summary.selectedAmount).toBe(530);
  });

  it("Example 3: Salary ₹25,000, Cashback ₹100, Petrol ₹500 -> Uncheck Petrol -> Income ₹25,100, Expense ₹0, Net Cashflow +₹25,100", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Salary", 25000, "received", "Salary"),
      createMockDraft("2", "Cashback", 100, "received", "Rewards"),
      createMockDraft("3", "Petrol", 500, "paid", "Travel"),
    ];

    // User unchecks Petrol
    drafts[2].selected = false;
    const summary = calculateApprovalSummary(drafts);

    expect(summary.selectedCount).toBe(2);
    expect(summary.selectedAmount).toBe(25100);
    expect(summary.incomeTotal).toBe(25100);
    expect(summary.expenseTotal).toBe(0);
    expect(summary.netCashflow).toBe(25100);
  });

  it("Deselect all: all totals become 0", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Water Bottle", 20, "paid", "Groceries", false),
      createMockDraft("2", "Food", 300, "paid", "Food & Dining", false),
      createMockDraft("3", "T-Shirt", 300, "paid", "Shopping", false),
    ];

    const summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(0);
    expect(summary.approvalCount).toBe(0);
    expect(summary.selectedAmount).toBe(0);
    expect(summary.expenseTotal).toBe(0);
    expect(summary.incomeTotal).toBe(0);
    expect(summary.receivableTotal).toBe(0);
    expect(summary.payableTotal).toBe(0);
    expect(summary.netCashflow).toBe(0);
    expect(summary.categoryCount).toBe(0);
  });

  it("Editing an item amount: summary updates immediately using the edited value", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Water Bottle", 20, "paid", "Groceries"),
      createMockDraft("2", "Food", 300, "paid", "Food & Dining"),
    ];

    let summary = calculateApprovalSummary(drafts);
    expect(summary.selectedAmount).toBe(320);

    // Food ₹300 edited to ₹450
    drafts[1].values.amount = 450;
    summary = calculateApprovalSummary(drafts);
    expect(summary.selectedAmount).toBe(470);
    expect(summary.expenseTotal).toBe(470);
  });

  it("Select only income: expense total becomes 0", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Freelance", 5000, "received", "Income", true),
      createMockDraft("2", "Dinner", 1200, "paid", "Food", false),
    ];

    const summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(1);
    expect(summary.incomeTotal).toBe(5000);
    expect(summary.expenseTotal).toBe(0);
    expect(summary.netCashflow).toBe(5000);
  });

  it("Select only expense: income total becomes 0", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Freelance", 5000, "received", "Income", false),
      createMockDraft("2", "Dinner", 1200, "paid", "Food", true),
    ];

    const summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(1);
    expect(summary.incomeTotal).toBe(0);
    expect(summary.expenseTotal).toBe(1200);
    expect(summary.netCashflow).toBe(-1200);
  });

  it("Mix of expense, income, payable, and receivable: all category & type totals remain accurate", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Salary", 50000, "received", "Salary"),
      createMockDraft("2", "Rent", 15000, "paid", "Housing"),
      createMockDraft("3", "Lent to Rahul", 2000, "lent", "Loans"),
      createMockDraft("4", "Borrowed from Amit", 1000, "borrowed", "Loans"),
    ];

    const summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(4);
    expect(summary.selectedAmount).toBe(68000);
    expect(summary.incomeTotal).toBe(50000);
    expect(summary.expenseTotal).toBe(15000);
    expect(summary.receivableTotal).toBe(2000);
    expect(summary.payableTotal).toBe(1000);
    expect(summary.netCashflow).toBe(35000); // 50000 - 15000
    expect(summary.categoryCount).toBe(3); // Salary, Housing, Loans
  });

  it("Ignored approved and cancelled drafts from active calculations", () => {
    const drafts: PendingTransactionDraft[] = [
      createMockDraft("1", "Pending Item", 500, "paid", "Food", true, "draft"),
      createMockDraft("2", "Already Approved", 1000, "paid", "Bills", true, "approved"),
      createMockDraft("3", "Cancelled Item", 300, "paid", "Misc", true, "cancelled"),
    ];

    const summary = calculateApprovalSummary(drafts);
    expect(summary.selectedCount).toBe(1);
    expect(summary.selectedAmount).toBe(500);
    expect(summary.expenseTotal).toBe(500);
  });
});

