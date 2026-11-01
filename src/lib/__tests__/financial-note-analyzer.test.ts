import { describe, it, expect } from "vitest";
import {
  extractExpensesFromNote,
  aggregateFinancialNotes,
  inferCategoryFromText,
  parseDateString,
  extractDateFromLine,
} from "../notes/financial-note-analyzer";

describe("Smart Financial Note Analyzer", () => {
  it("parses user's sample note with dates, item indexes, descriptions, amounts, and categories", () => {
    const sampleNote = `
Date: 01/11/2026
1. for bus travel - 500
2. Flipkart order - 375
3. Tea - 20
4. Grocery - 1500
    `;

    const expenses = extractExpensesFromNote(sampleNote, new Date(2026, 10, 1));
    expect(expenses).toHaveLength(4);

    expect(expenses[0].description).toBe("Bus travel");
    expect(expenses[0].amount).toBe(500);
    expect(expenses[0].category).toBe("Travel");
    expect(expenses[0].date).toBe("2026-11-01");
    expect(expenses[0].month).toBe("November");
    expect(expenses[0].year).toBe(2026);

    expect(expenses[1].description).toBe("Flipkart order");
    expect(expenses[1].amount).toBe(375);
    expect(expenses[1].category).toBe("Shopping");

    expect(expenses[2].description).toBe("Tea");
    expect(expenses[2].amount).toBe(20);
    expect(expenses[2].category).toBe("Food & Drinks");

    expect(expenses[3].description).toBe("Grocery");
    expect(expenses[3].amount).toBe(1500);
    expect(expenses[3].category).toBe("Groceries");
  });

  it("handles dates without 'Date:' prefix and formats like 1/11/2026 and 01-11-2026", () => {
    const sampleNote = `
1/11/2026
1. Bus Travel - 500
2. Flipkart order - 375
    `;

    const expenses = extractExpensesFromNote(sampleNote);
    expect(expenses).toHaveLength(2);
    expect(expenses[0].amount).toBe(500);
    expect(expenses[1].amount).toBe(375);
    expect(expenses[0].date).toBe("2026-11-01");
  });

  it("strictly ignores false positives like phone numbers, OTPs, UPI IDs, and invoice numbers", () => {
    const nonFinancialContent = `
Notes for meeting:
Call client at 9876543210
OTP for login was 481923
Invoice number: INV-2026-098
Payment via john@okhdfcbank
Order ID: OD987654321
1. Coffee with client - 120
    `;

    const expenses = extractExpensesFromNote(nonFinancialContent, new Date(2026, 10, 1));
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe("Coffee with client");
    expect(expenses[0].amount).toBe(120);
    expect(expenses[0].category).toBe("Food & Drinks");
  });

  it("aggregates monthly expense totals and computes historical comparisons", () => {
    const octNote = `
Date: 15/10/2026
1. Dinner party - 6000
2. Shopping mall - 2450
    `;

    const novNote = `
Date: 01/11/2026
1. Bus Travel - 500
2. Flipkart order - 375
3. Tea - 20
4. Grocery - 1500
    `;

    const octExpenses = extractExpensesFromNote(octNote, new Date(2026, 9, 15));
    const novExpenses = extractExpensesFromNote(novNote, new Date(2026, 10, 1));
    const all = [...octExpenses, ...novExpenses];

    const analytics = aggregateFinancialNotes(all);

    expect(analytics.totalExpensesCount).toBe(6);
    expect(analytics.allTimeTotalAmount).toBe(6000 + 2450 + 500 + 375 + 20 + 1500); // 10,845

    const octSummary = analytics.monthlySummaries.find((s) => s.monthKey === "2026-10");
    const novSummary = analytics.monthlySummaries.find((s) => s.monthKey === "2026-11");

    expect(octSummary?.totalAmount).toBe(8450);
    expect(novSummary?.totalAmount).toBe(2395);

    expect(octSummary?.highestExpense?.amount).toBe(6000);
    expect(novSummary?.lowestExpense?.amount).toBe(20);
  });
});

