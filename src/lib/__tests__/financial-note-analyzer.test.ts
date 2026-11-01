import { describe, it, expect } from "vitest";
import {
  extractExpensesFromNote,
  aggregateFinancialNotes,
  getNoteFinancialSummary,
  inferCategoryFromText,
  parseDateString,
  extractDateFromLine,
  extractMonthYearHeader,
} from "../notes/financial-note-analyzer";

describe("SplitLedger AI – Smart Financial Note & Journal Analyzer", () => {
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

  it("strictly enforces date boundaries: entries belong ONLY to their date block", () => {
    const noteWithDates = `
01/10/2026
Chips - 20
Petrol - 500

04/10/2026
Tea - 20
    `;

    const entries = extractExpensesFromNote(noteWithDates, new Date(2026, 9, 1));
    expect(entries).toHaveLength(3);

    const oct01 = entries.filter((e) => e.date === "2026-10-01");
    expect(oct01).toHaveLength(2);
    expect(oct01.map((e) => e.description)).toEqual(["Chips", "Petrol"]);
    expect(oct01.reduce((sum, e) => sum + e.amount, 0)).toBe(520);

    const oct04 = entries.filter((e) => e.date === "2026-10-04");
    expect(oct04).toHaveLength(1);
    expect(oct04[0].description).toBe("Tea");
    expect(oct04[0].amount).toBe(20);
  });

  it("accurately analyzes user's full October 2026 handwritten financial note (Income ₹26,500, Expense ₹4,869, Net ₹21,631)", () => {
    const userNote = `
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

    const entries = extractExpensesFromNote(userNote, new Date(2026, 9, 1));
    expect(entries).toHaveLength(11);

    // Date-wise checks:
    // 01/10/2026: Chips (20), Petrol (500), Flipkart Order (300) -> ₹820 expense
    const oct01 = entries.filter((e) => e.date === "2026-10-01");
    expect(oct01).toHaveLength(3);
    expect(oct01.reduce((s, e) => s + e.amount, 0)).toBe(820);
    expect(oct01.every((e) => e.type === "expense")).toBe(true);

    // 04/10/2026: Mess (40), Tea (60) -> ₹100 expense
    const oct04 = entries.filter((e) => e.date === "2026-10-04");
    expect(oct04).toHaveLength(2);
    expect(oct04.reduce((s, e) => s + e.amount, 0)).toBe(100);

    // 10/10/2026: Received Salary - 25000 -> ₹25,000 Income
    const oct10 = entries.filter((e) => e.date === "2026-10-10");
    expect(oct10).toHaveLength(1);
    expect(oct10[0].description).toBe("Received Salary");
    expect(oct10[0].amount).toBe(25000);
    expect(oct10[0].type).toBe("income");

    // 12/10/2026: Received From Kunal - 1500 -> ₹1,500 Income (Already received!)
    const oct12 = entries.filter((e) => e.date === "2026-10-12");
    expect(oct12).toHaveLength(1);
    expect(oct12[0].description).toBe("Received From Kunal");
    expect(oct12[0].amount).toBe(1500);
    expect(oct12[0].type).toBe("income");
    expect(oct12[0].contactName).toBe("Kunal");

    // 15/10/2026: Electric Bill - 1200 -> ₹1,200 Expense
    const oct15 = entries.filter((e) => e.date === "2026-10-15");
    expect(oct15).toHaveLength(1);
    expect(oct15[0].description).toBe("Electric Bill");
    expect(oct15[0].amount).toBe(1200);
    expect(oct15[0].type).toBe("expense");

    // 22/10/2026: Paid Rahul - 500 -> ₹500 Expense (Already paid!)
    const oct22 = entries.filter((e) => e.date === "2026-10-22");
    expect(oct22).toHaveLength(1);
    expect(oct22[0].description).toBe("Paid Rahul");
    expect(oct22[0].amount).toBe(500);
    expect(oct22[0].type).toBe("expense");
    expect(oct22[0].contactName).toBe("Rahul");

    // 30/10/2026: Recharge - 399, Groceries - 1850 -> ₹2,249 Expense
    const oct30 = entries.filter((e) => e.date === "2026-10-30");
    expect(oct30).toHaveLength(2);
    expect(oct30.reduce((s, e) => s + e.amount, 0)).toBe(399 + 1850);
    expect(oct30.every((e) => e.type === "expense")).toBe(true);

    // Note Financial Summary check:
    const summary = getNoteFinancialSummary(entries, "October 2026");
    expect(summary.totalIncome).toBe(26500);
    expect(summary.totalExpense).toBe(4869);
    expect(summary.totalReceivable).toBe(0);
    expect(summary.totalPayable).toBe(0);
    expect(summary.netCashflow).toBe(21631);
    expect(summary.expenseCount).toBe(9);
    expect(summary.incomeCount).toBe(2);
    expect(summary.totalTransactionsCount).toBe(11);
    expect(summary.month).toBe("October");
    expect(summary.year).toBe(2026);

    // Overall Analytics Aggregation check:
    const analytics = aggregateFinancialNotes(entries);
    expect(analytics.allTimeTotalIncome).toBe(26500);
    expect(analytics.allTimeTotalExpense).toBe(4869);
    expect(analytics.allTimeNetCashflow).toBe(21631);
    expect(analytics.totalExpensesCount).toBe(9);
    expect(analytics.totalIncomeCount).toBe(2);

    const octSummary = analytics.monthlySummaries.find((s) => s.monthKey === "2026-10");
    expect(octSummary).toBeDefined();
    expect(octSummary?.totalIncome).toBe(26500);
    expect(octSummary?.totalExpense).toBe(4869);
    expect(octSummary?.netCashflow).toBe(21631);
    expect(octSummary?.highestIncome?.amount).toBe(25000);
    expect(octSummary?.highestExpense?.amount).toBe(1850);
  });

  it("classifies advanced natural language statements into Income, Expense, Receivable, and Payable", () => {
    const naturalNote = `
01/10/2026
I need to pay Amol - 500
I have to pay Rahul 300
Need to pay electricity bill 1200
Pending payment to shopkeeper 450
Paid Rahul - 500
Paid Electricity Bill 1500
Paid Grocery 850
I need to take back from Kartik - 1000
Kartik has to return 1000
Kunal owes me 500
Need to collect from Amit 700
Received from Kunal - 1200
Salary credited - 25000
Freelance payment received - 8000
Bonus received - 5000
Refund received - 350
Cashback received - 120
    `;

    const entries = extractExpensesFromNote(naturalNote, new Date(2026, 9, 1));
    expect(entries).toHaveLength(17);

    // Payables:
    const payables = entries.filter((e) => e.type === "payable");
    expect(payables).toHaveLength(4);
    expect(payables.map((p) => p.description)).toEqual([
      "I need to pay Amol",
      "I have to pay Rahul",
      "Need to pay electricity bill",
      "Pending payment to shopkeeper",
    ]);
    expect(payables[0].contactName).toBe("Amol");
    expect(payables[0].amount).toBe(500);
    expect(payables[1].contactName).toBe("Rahul");
    expect(payables[1].amount).toBe(300);

    // Expenses (Already paid):
    const expenses = entries.filter((e) => e.type === "expense");
    expect(expenses).toHaveLength(3);
    expect(expenses.map((e) => e.description)).toEqual([
      "Paid Rahul",
      "Paid Electricity Bill",
      "Paid Grocery",
    ]);
    expect(expenses[0].contactName).toBe("Rahul");
    expect(expenses[0].amount).toBe(500);
    expect(expenses[1].amount).toBe(1500);
    expect(expenses[2].amount).toBe(850);

    // Receivables (Expected incoming money):
    const receivables = entries.filter((e) => e.type === "receivable");
    expect(receivables).toHaveLength(4);
    expect(receivables.map((r) => r.description)).toEqual([
      "I need to take back from Kartik",
      "Kartik has to return",
      "Kunal owes me",
      "Need to collect from Amit",
    ]);
    expect(receivables[0].contactName).toBe("Kartik");
    expect(receivables[0].amount).toBe(1000);
    expect(receivables[2].contactName).toBe("Kunal");
    expect(receivables[2].amount).toBe(500);
    expect(receivables[3].contactName).toBe("Amit");
    expect(receivables[3].amount).toBe(700);

    // Incomes (Already received):
    const incomes = entries.filter((e) => e.type === "income");
    expect(incomes).toHaveLength(6);
    expect(incomes[0].description).toBe("Received from Kunal");
    expect(incomes[0].amount).toBe(1200);
    expect(incomes[0].contactName).toBe("Kunal");
    expect(incomes[1].description).toBe("Salary credited");
    expect(incomes[1].amount).toBe(25000);
    expect(incomes[2].description).toBe("Freelance payment received");
    expect(incomes[2].amount).toBe(8000);
    expect(incomes[3].description).toBe("Bonus received");
    expect(incomes[3].amount).toBe(5000);
    expect(incomes[4].description).toBe("Refund received");
    expect(incomes[4].amount).toBe(350);
    expect(incomes[5].description).toBe("Cashback received");
    expect(incomes[5].amount).toBe(120);

    // Verify mathematical separation
    const summary = getNoteFinancialSummary(entries);
    expect(summary.totalPayable).toBe(500 + 300 + 1200 + 450); // 2450
    expect(summary.totalExpense).toBe(500 + 1500 + 850); // 2850
    expect(summary.totalReceivable).toBe(1000 + 1000 + 500 + 700); // 3200
    expect(summary.totalIncome).toBe(1200 + 25000 + 8000 + 5000 + 350 + 120); // 39670
    expect(summary.netCashflow).toBe(39670 - 2850); // 36820
  });

  it("detects duplicates under the same date with automatic duplicate protection", () => {
    const noteWithDuplicates = `
01/10/2026
Petrol 500
Petrol 500
Tea 20
    `;

    const entries = extractExpensesFromNote(noteWithDuplicates, new Date(2026, 9, 1));
    expect(entries).toHaveLength(3);

    expect(entries[0].isDuplicate).toBeFalsy();
    expect(entries[1].isDuplicate).toBe(true);
    expect(entries[1].duplicateReason).toContain("Possible duplicate");
    expect(entries[2].isDuplicate).toBeFalsy();

    const summary = getNoteFinancialSummary(entries);
    expect(summary.hasDuplicates).toBe(true);
    expect(summary.duplicateCount).toBe(1);
  });

  it("supports mixed notes: ignores personal text and extracts only valid financial entries", () => {
    const mixedNote = `
01/10/2026
Went to office.
Meeting with manager.
Petrol 500
Need to buy laptop next month.
Tea 30
Order ID 548923
Call 9876543210
OTP was 481923
    `;

    const entries = extractExpensesFromNote(mixedNote, new Date(2026, 9, 1));
    expect(entries).toHaveLength(2);
    expect(entries[0].description).toBe("Petrol");
    expect(entries[0].amount).toBe(500);
    expect(entries[1].description).toBe("Tea");
    expect(entries[1].amount).toBe(30);
  });

  it("handles short date formats like 01/10 and 05/10 under month context", () => {
    const shortDateNote = `
October 2026

01/10
Chips 20

05/10
Petrol 500

10/10
Salary 25000
    `;

    const entries = extractExpensesFromNote(shortDateNote, new Date(2026, 9, 1));
    expect(entries).toHaveLength(3);
    expect(entries[0].date).toBe("2026-10-01");
    expect(entries[0].amount).toBe(20);

    expect(entries[1].date).toBe("2026-10-05");
    expect(entries[1].amount).toBe(500);

    expect(entries[2].date).toBe("2026-10-10");
    expect(entries[2].amount).toBe(25000);
    expect(entries[2].type).toBe("income");
  });

  it("verifies Daily Journal Mode date selection behaves strictly as specified in Step 5", () => {
    const userNote = `
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

    const all = extractExpensesFromNote(userNote, new Date(2026, 9, 1));
    const analytics = aggregateFinancialNotes(all);
    const octBreakdown = analytics.monthlySummaries[0].dailyBreakdown;

    // 01 Oct: Income ₹0, Expense ₹820, Net -₹820, 3 items
    const day01 = octBreakdown["2026-10-01"];
    expect(day01).toBeDefined();
    expect(day01.income).toBe(0);
    expect(day01.expense).toBe(820);
    expect(day01.net).toBe(-820);
    expect(day01.receivable).toBe(0);
    expect(day01.payable).toBe(0);
    expect(day01.itemsCount).toBe(3);
    expect(day01.items.map((i) => `${i.description} ₹${i.amount}`)).toEqual([
      "Chips ₹20",
      "Petrol ₹500",
      "Flipkart Order ₹300",
    ]);

    // 04 Oct: Income ₹0, Expense ₹100, Net -₹100, 2 items
    const day04 = octBreakdown["2026-10-04"];
    expect(day04).toBeDefined();
    expect(day04.income).toBe(0);
    expect(day04.expense).toBe(100);
    expect(day04.net).toBe(-100);
    expect(day04.itemsCount).toBe(2);

    // 10 Oct: Income ₹25,000, Expense ₹0, Net ₹25,000, 1 item
    const day10 = octBreakdown["2026-10-10"];
    expect(day10).toBeDefined();
    expect(day10.income).toBe(25000);
    expect(day10.expense).toBe(0);
    expect(day10.net).toBe(25000);
    expect(day10.itemsCount).toBe(1);
    expect(day10.items[0].description).toBe("Received Salary");

    // 12 Oct: Income ₹1,500, Expense ₹0, Net ₹1,500, 1 item
    const day12 = octBreakdown["2026-10-12"];
    expect(day12).toBeDefined();
    expect(day12.income).toBe(1500);
    expect(day12.expense).toBe(0);
    expect(day12.net).toBe(1500);
    expect(day12.itemsCount).toBe(1);
    expect(day12.items[0].description).toBe("Received From Kunal");

    // 15 Oct: Expense ₹1,200, Net -₹1,200
    const day15 = octBreakdown["2026-10-15"];
    expect(day15).toBeDefined();
    expect(day15.income).toBe(0);
    expect(day15.expense).toBe(1200);
    expect(day15.net).toBe(-1200);

    // 22 Oct: Expense ₹500, Net -₹500
    const day22 = octBreakdown["2026-10-22"];
    expect(day22).toBeDefined();
    expect(day22.expense).toBe(500);
    expect(day22.income).toBe(0);
    expect(day22.net).toBe(-500);

    // 30 Oct: Expense ₹2,249, Net -₹2,249
    const day30 = octBreakdown["2026-10-30"];
    expect(day30).toBeDefined();
    expect(day30.expense).toBe(2249);
    expect(day30.income).toBe(0);
    expect(day30.net).toBe(-2249);
    expect(day30.itemsCount).toBe(2);

    // Mathematical verification that total is NOT 31,369
    const totalExpenses = Object.values(octBreakdown).reduce((s, d) => s + d.expense, 0);
    const totalIncome = Object.values(octBreakdown).reduce((s, d) => s + d.income, 0);
    expect(totalExpenses).toBe(4869);
    expect(totalIncome).toBe(26500);
    expect(totalExpenses + totalIncome).toBe(31369); // Demonstrates 31,369 was mistakenly adding income and expense together!
    expect(totalExpenses).not.toBe(31369);
  });
});
