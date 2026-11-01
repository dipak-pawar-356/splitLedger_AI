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

  it("handles single-line notes with date prefix and multiple consecutive expenses", () => {
    // Exactly matches user note shown in screenshot:
    // "01/11/2026 Bus Travel - 500 Flipkart Order - 375 Tea - 20 Grocery - 1500"
    const singleLineNote = "01/11/2026 Bus Travel - 500 Flipkart Order - 375 Tea - 20 Grocery - 1500";
    const expenses = extractExpensesFromNote(singleLineNote, new Date(2026, 9, 27));

    expect(expenses).toHaveLength(4);
    expect(expenses[0].description).toBe("Bus Travel");
    expect(expenses[0].amount).toBe(500);
    expect(expenses[0].date).toBe("2026-11-01");
    expect(expenses[0].month).toBe("November");
    expect(expenses[0].year).toBe(2026);

    expect(expenses[1].description).toBe("Flipkart Order");
    expect(expenses[1].amount).toBe(375);

    expect(expenses[2].description).toBe("Tea");
    expect(expenses[2].amount).toBe(20);

    expect(expenses[3].description).toBe("Grocery");
    expect(expenses[3].amount).toBe(1500);
  });

  it("extracts a complete month's financial history written in a single note across multiple dates", () => {
    const fullMonthNote = `
October 2026

01/10/2026
Chips - 20
Petrol - 500
Flipkart Order - 300

04/10/2026
Mess - 40
Tea - 60

10/10/2026
Received Salary - 25000

12/10/2026
Received From Kunal - 1500

15/10/2026
Electric Bill - 1200

22/10/2026
Paid Rahul - 500

30/10/2026
Recharge - 399
Groceries - 1850
    `;

    const entries = extractExpensesFromNote(fullMonthNote, new Date(2026, 9, 1));
    expect(entries).toHaveLength(11);

    // Verify Date distribution
    const oct01 = entries.filter((e) => e.date === "2026-10-01");
    expect(oct01).toHaveLength(3);
    expect(oct01.reduce((s, e) => s + e.amount, 0)).toBe(820);

    const oct04 = entries.filter((e) => e.date === "2026-10-04");
    expect(oct04).toHaveLength(2);
    expect(oct04.reduce((s, e) => s + e.amount, 0)).toBe(100);

    const oct10 = entries.filter((e) => e.date === "2026-10-10");
    expect(oct10).toHaveLength(1);
    expect(oct10[0].type).toBe("income");
    expect(oct10[0].amount).toBe(25000);

    const oct12 = entries.filter((e) => e.date === "2026-10-12");
    expect(oct12).toHaveLength(1);
    expect(oct12[0].type).toBe("receivable");
    expect(oct12[0].amount).toBe(1500);
    expect(oct12[0].contactName).toBe("Kunal");

    const oct15 = entries.filter((e) => e.date === "2026-10-15");
    expect(oct15).toHaveLength(1);
    expect(oct15[0].type).toBe("expense");
    expect(oct15[0].amount).toBe(1200);

    const oct22 = entries.filter((e) => e.date === "2026-10-22");
    expect(oct22).toHaveLength(1);
    expect(oct22[0].type).toBe("payable");
    expect(oct22[0].amount).toBe(500);
    expect(oct22[0].contactName).toBe("Rahul");

    const oct30 = entries.filter((e) => e.date === "2026-10-30");
    expect(oct30).toHaveLength(2);
    expect(oct30.reduce((s, e) => s + e.amount, 0)).toBe(399 + 1850);

    // Aggregate monthly analytics
    const analytics = aggregateFinancialNotes(entries);
    const octSummary = analytics.monthlySummaries.find((s) => s.monthKey === "2026-10");
    expect(octSummary).toBeDefined();

    expect(octSummary?.totalExpense).toBe(4869);
    expect(octSummary?.totalIncome).toBe(26500);
    expect(octSummary?.totalReceivable).toBe(1500);
    expect(octSummary?.totalPayable).toBe(500);
    expect(octSummary?.netCashflow).toBe(21631);
    expect(octSummary?.highestIncome?.amount).toBe(25000);
    expect(octSummary?.highestExpense?.amount).toBe(1850);
  });
});

