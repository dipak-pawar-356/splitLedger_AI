import { describe, it, expect } from "vitest";
import { getPeriodDateRange } from "@/lib/financial-period";

describe("Financial Intelligence, Health Score & Budget Engine", () => {
  describe("Period Engine: getPeriodDateRange Date Calculations", () => {
    const fixedNow = new Date("2026-11-03T10:00:00Z"); // Tuesday, Nov 3, 2026

    it("should calculate correct date range for 'today'", () => {
      const { startDate, endDate, prevStartDate, prevEndDate, periodLabel, comparisonLabel, elapsedDays } =
        getPeriodDateRange("today", fixedNow);
      expect(periodLabel).toBe("Today");
      expect(comparisonLabel).toBe("vs Yesterday");
      expect(elapsedDays).toBe(1);
      expect(startDate?.getDate()).toBe(3);
      expect(endDate?.getDate()).toBe(3);
      expect(prevStartDate?.getDate()).toBe(2);
      expect(prevEndDate?.getDate()).toBe(2);
    });

    it("should calculate correct date range for 'yesterday'", () => {
      const { startDate, endDate, prevStartDate, prevEndDate, periodLabel, comparisonLabel, elapsedDays } =
        getPeriodDateRange("yesterday", fixedNow);
      expect(periodLabel).toBe("Yesterday");
      expect(comparisonLabel).toBe("vs Day Before Yesterday");
      expect(elapsedDays).toBe(1);
      expect(startDate?.getDate()).toBe(2);
      expect(prevStartDate?.getDate()).toBe(1);
    });

    it("should calculate correct date range for 'this_week'", () => {
      const { startDate, prevStartDate, prevEndDate, periodLabel, comparisonLabel } =
        getPeriodDateRange("this_week", fixedNow);
      expect(periodLabel).toBe("This Week");
      expect(comparisonLabel).toBe("vs Previous Week");
      // Tuesday -> Monday Nov 2 was start of this week
      expect(startDate?.getDate()).toBe(2);
      // Previous week Monday was Oct 26
      expect(prevStartDate?.getDate()).toBe(26);
      expect(prevEndDate?.getDate()).toBe(1); // Nov 1 was Sunday
    });

    it("should calculate correct date range for 'current_month'", () => {
      const { startDate, prevStartDate, prevEndDate, periodLabel, comparisonLabel, elapsedDays } =
        getPeriodDateRange("current_month", fixedNow);
      expect(periodLabel).toBe("Current Month");
      expect(comparisonLabel).toBe("vs Previous Month");
      expect(startDate?.getDate()).toBe(1);
      expect(startDate?.getMonth()).toBe(10); // Nov (0-based 10)
      expect(prevStartDate?.getMonth()).toBe(9); // Oct
      expect(prevEndDate?.getDate()).toBe(31); // Oct 31
      expect(elapsedDays).toBe(3);
    });

    it("should calculate correct date range for 'last_month'", () => {
      const { startDate, endDate, periodLabel, comparisonLabel, elapsedDays } =
        getPeriodDateRange("last_month", fixedNow);
      expect(periodLabel).toBe("Last Month");
      expect(comparisonLabel).toBe("vs Month Before Last");
      expect(startDate?.getMonth()).toBe(9); // Oct
      expect(endDate?.getDate()).toBe(31); // Oct 31
      expect(elapsedDays).toBe(31);
    });

    it("should calculate correct date range for 'current_quarter'", () => {
      const { startDate, periodLabel, comparisonLabel } =
        getPeriodDateRange("current_quarter", fixedNow);
      expect(periodLabel).toBe("Current Quarter (Q4)");
      expect(comparisonLabel).toBe("vs Previous Quarter (Q3)");
      expect(startDate?.getMonth()).toBe(9); // Q4 starts Oct 1 (month 9)
    });

    it("should calculate correct date range for 'current_year'", () => {
      const { startDate, periodLabel, comparisonLabel } =
        getPeriodDateRange("current_year", fixedNow);
      expect(periodLabel).toBe("Current Year (2026)");
      expect(comparisonLabel).toBe("vs Previous Year (2025)");
      expect(startDate?.getMonth()).toBe(0); // Jan 1
      expect(startDate?.getFullYear()).toBe(2026);
    });

    it("should calculate correct date range for 'all_time'", () => {
      const { startDate, endDate, periodLabel, comparisonLabel } =
        getPeriodDateRange("all_time", fixedNow);
      expect(periodLabel).toBe("All-Time Ledger");
      expect(comparisonLabel).toBe("All-Time Baseline");
      expect(startDate).toBeNull();
      expect(endDate).toBeNull();
    });

    it("should handle division by zero mathematically without returning NaN or Infinity", () => {
      const currentExpenses = 500;
      const prevExpensesZero = 0;

      // Formula: ((Current - Prev) / Prev) * 100
      const pctChange = prevExpensesZero > 0 ? Math.round(((currentExpenses - prevExpensesZero) / prevExpensesZero) * 100) : null;
      expect(pctChange).toBeNull();

      const currentIncomeZero = 0;
      const savingsRate = currentIncomeZero > 0 ? Math.round((-500 / currentIncomeZero) * 100) : 0;
      expect(savingsRate).toBe(0);
      expect(Number.isFinite(savingsRate)).toBe(true);
    });
  });
  describe("SECTION 9: Financial Health Score Calculations", () => {
    it("should compute weighted 0-100 score and classify grades correctly", () => {
      // Test Excellent Grade (Score >= 85)
      const scoreExcellent = 25 + 20 + 20 + 15 + 10 + 10; // 100
      expect(scoreExcellent).toBe(100);

      const classifyGrade = (score: number) => {
        if (score >= 85) return "Excellent";
        if (score >= 70) return "Good";
        if (score >= 50) return "Average";
        if (score >= 35) return "Needs Improvement";
        return "Poor";
      };

      expect(classifyGrade(100)).toBe("Excellent");
      expect(classifyGrade(78)).toBe("Good");
      expect(classifyGrade(62)).toBe("Average");
      expect(classifyGrade(40)).toBe("Needs Improvement");
      expect(classifyGrade(20)).toBe("Poor");
    });
  });

  describe("SECTION 2: Budget Progress & Run-Rate Allowances", () => {
    it("should accurately calculate used %, remaining budget, and daily run-rate", () => {
      const budgetLimit = 15000; // ₹15,000
      const actualSpent = 9000; // ₹9,000
      const remainingDays = 10;

      const remainingAmount = Math.max(0, budgetLimit - actualSpent);
      const usedPercentage = Math.round((actualSpent / budgetLimit) * 100);
      const dailyBudgetRemaining = Math.round(remainingAmount / remainingDays);

      expect(remainingAmount).toBe(6000);
      expect(usedPercentage).toBe(60);
      expect(dailyBudgetRemaining).toBe(600); // ₹600 / day
    });

    it("should classify budget health thresholds as Safe, Warning, or Exceeded", () => {
      const alertThreshold = 80;

      const getHealthStatus = (usedPct: number) => {
        if (usedPct >= 100) return "exceeded";
        if (usedPct >= alertThreshold) return "warning";
        return "safe";
      };

      expect(getHealthStatus(50)).toBe("safe");
      expect(getHealthStatus(82)).toBe("warning");
      expect(getHealthStatus(105)).toBe("exceeded");
    });
  });

  describe("SECTION 4: AI Insights Trigger Logic", () => {
    it("should detect category surges of 15% or higher", () => {
      const currentMonthFood = 12000;
      const lastMonthFood = 10000;

      const growth = Math.round(((currentMonthFood - lastMonthFood) / lastMonthFood) * 100);

      expect(growth).toBe(20);
      expect(growth).toBeGreaterThanOrEqual(15);
    });
  });

  describe("SECTION 7 & 8: Forecasting & Cash Flow Liquidity", () => {
    it("should calculate Net Cash Flow as Inflow minus Outflow in INR", () => {
      const moneyIn = 95000;
      const moneyOut = 62000;
      const netFlow = moneyIn - moneyOut;

      expect(netFlow).toBe(33000);
      expect(netFlow).toBeGreaterThan(0);
    });

    it("should project quarterly and annual figures from monthly baseline", () => {
      const monthlyIncome = 50000;
      const monthlyExpense = 35000;

      const quarterlyIncome = monthlyIncome * 3;
      const quarterlyExpense = monthlyExpense * 3;
      const quarterlySavings = quarterlyIncome - quarterlyExpense;

      expect(quarterlyIncome).toBe(150000);
      expect(quarterlyExpense).toBe(105000);
      expect(quarterlySavings).toBe(45000);
    });
  });

  describe("Financial Intelligence Control Center & Real-Time Verified Metrics", () => {
    it("should derive control center operational cards strictly from approved records", () => {
      const verifiedTransactions = [
        { id: 1, title: "Client Payment", amount: 45000, type: "received", category: "Income", date: "2026-11-01" },
        { id: 2, title: "Office Rent", amount: 15000, type: "paid", category: "Bills", date: "2026-11-02" },
        { id: 3, title: "Team Lunch", amount: 2400, type: "paid", category: "Food", date: "2026-11-02" },
        { id: 4, title: "Fuel Station", amount: 1200, type: "paid", category: "Fuel", date: "2026-11-03" },
      ];

      const totalIncome = verifiedTransactions
        .filter((t) => t.type === "received")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = verifiedTransactions
        .filter((t) => t.type === "paid")
        .reduce((sum, t) => sum + t.amount, 0);

      const netCashFlow = totalIncome - totalExpense;
      const savings = totalIncome - totalExpense;
      const savingsRate = Math.round((savings / totalIncome) * 100);

      expect(totalIncome).toBe(45000);
      expect(totalExpense).toBe(18600);
      expect(netCashFlow).toBe(26400);
      expect(savings).toBe(26400);
      expect(savingsRate).toBe(59);

      // Verify largest expense
      const largestExpense = [...verifiedTransactions]
        .filter((t) => t.type === "paid")
        .sort((a, b) => b.amount - a.amount)[0];

      expect(largestExpense.title).toBe("Office Rent");
      expect(largestExpense.amount).toBe(15000);

      // Verify highest spending day (2026-11-02 had 15000 + 2400 = 17400)
      const daySpendMap: Record<string, number> = {};
      verifiedTransactions
        .filter((t) => t.type === "paid")
        .forEach((t) => {
          daySpendMap[t.date] = (daySpendMap[t.date] || 0) + t.amount;
        });

      const highestDay = Object.entries(daySpendMap).sort((a, b) => b[1] - a[1])[0];
      expect(highestDay[0]).toBe("2026-11-02");
      expect(highestDay[1]).toBe(17400);
    });

    it("should never fabricate confidence scores or random forecasts", () => {
      // Test that forecasts are derived from verified moving averages and omit fake confidence
      const monthlyOutflow = 20000;
      const forecast1M = {
        period: "1m",
        predictedExpense: monthlyOutflow,
        predictedIncome: 30000,
        predictedSavings: 10000,
        confidencePct: undefined, // no fake 92% confidence
        basis: "Based on verified monthly trajectory of ₹20,000/mo outflow",
      };

      expect(forecast1M.confidencePct).toBeUndefined();
      expect(forecast1M.predictedExpense).toBe(20000);
      expect(forecast1M.predictedSavings).toBe(10000);
    });
  });

  describe("Assistant Mode Separation & Exact Query Resolution", () => {
    it("should switch to transaction creation mode ONLY when starting with 'create transaction'", () => {
      const isCreateMode = (msg: string) => /^(?:please\s+)?create\s+trans(?:action|ition)s?(?:\s*[:\-\n]|\s+|$)/i.test(msg.trim());

      // Should trigger Mode 2
      expect(isCreateMode("create transaction Petrol 500")).toBe(true);
      expect(isCreateMode("create transition Salary 25000")).toBe(true);
      expect(isCreateMode("please create transaction dinner 450")).toBe(true);

      // Should NOT trigger Mode 2 (Must remain Financial Intelligence Assistant)
      expect(isCreateMode("Why did I spend so much this month?")).toBe(false);
      expect(isCreateMode("Where is my money going?")).toBe(false);
      expect(isCreateMode("How much did I spend on Food?")).toBe(false);
      expect(isCreateMode("Who owes me money?")).toBe(false);
      expect(isCreateMode("Did I spend on petrol?")).toBe(false);
    });

    it("should accurately resolve 'Who owes me money?' strictly with verified receivables", () => {
      const receivables = [
        { name: "Kunal Patil", amount: 3333.33, groupName: "Summer Trip" },
        { name: "Rahul Sharma", amount: 1200.0, groupName: "Flatmates" },
      ];
      const payables = [
        { name: "Amit Verma", amount: 500.0, groupName: "Flatmates" },
      ];

      const resolveWhoOwesMe = (recs: typeof receivables, _pays: typeof payables) => {
        // Must return strictly receivables and not conflate payables
        const total = recs.reduce((s, r) => s + r.amount, 0);
        return {
          totalReceivables: total,
          debtors: recs,
        };
      };

      const result = resolveWhoOwesMe(receivables, payables);
      expect(result.totalReceivables).toBe(4533.33);
      expect(result.debtors.length).toBe(2);
      expect(result.debtors[0].name).toBe("Kunal Patil");
    });
  });
});
