import { describe, it, expect } from "vitest";
import { calculateUnifiedMetrics } from "../financial/unified-engine";

describe("Unified Financial Aggregation Engine", () => {
  it("calculates accurate period totals including manual, group, and note expenses", () => {
    const novNow = new Date(2026, 10, 15); // Nov 15, 2026
    const startDate = new Date(2026, 10, 1, 0, 0, 0, 0);
    const endDate = new Date(2026, 10, 30, 23, 59, 59, 999);
    const prevStartDate = new Date(2026, 9, 1, 0, 0, 0, 0);
    const prevEndDate = new Date(2026, 9, 31, 23, 59, 59, 999);

    const mockTransactions = [
      // Oct Transactions
      {
        id: 1,
        amount: 800000, // ₹8,000 paid
        type: "paid",
        date: new Date(2026, 9, 10),
      },
      // Nov Transactions
      {
        id: 2,
        amount: 50000, // ₹500 paid
        type: "paid",
        date: new Date(2026, 10, 2),
      },
      {
        id: 3,
        amount: 150000, // ₹1,500 received
        type: "received",
        date: new Date(2026, 10, 5),
      },
    ];

    const mockNoteExpenses = [
      {
        id: "exp_1",
        description: "Flipkart order",
        amount: 375,
        category: "Shopping",
        date: "2026-11-01",
        month: "November",
        year: 2026,
        monthKey: "2026-11",
        rawText: "Flipkart order - 375",
        lineNumber: 1,
      },
    ];

    const metrics = calculateUnifiedMetrics({
      transactions: mockTransactions,
      notesExpenses: mockNoteExpenses,
      receivablesRupees: 3333.33,
      payablesRupees: 0,
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      now: novNow,
    });

    expect(metrics.totalIncome).toBe(1500);
    expect(metrics.totalExpenses).toBe(500 + 375); // ₹875
    expect(metrics.netSavings).toBe(1500 - 875); // ₹625
    expect(metrics.netPosition).toBe(3333.33);

    // Previous month (October 2026)
    expect(metrics.previousMonthExpense.monthName).toBe("October Expense");
    expect(metrics.previousMonthExpense.amount).toBe(8000);
  });
});

