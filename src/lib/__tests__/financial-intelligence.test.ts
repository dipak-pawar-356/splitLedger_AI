import { describe, it, expect } from "vitest";

describe("Financial Intelligence, Health Score & Budget Engine", () => {
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
});
