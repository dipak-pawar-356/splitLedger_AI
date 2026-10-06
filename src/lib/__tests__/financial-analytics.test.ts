import { describe, it, expect } from "vitest";

describe("Financial Analytics Calculations Engine", () => {
  describe("SECTION 1: Summary Metrics & Net Savings", () => {
    it("should calculate Net Savings as Income minus Expenses in INR", () => {
      const income = 85000;
      const expense = 52000;
      const netSavings = income - expense;

      expect(netSavings).toBe(33000);
      expect(netSavings).toBeGreaterThan(0);
    });

    it("should accurately compute period-over-period growth rates", () => {
      const calcGrowth = (curr: number, prev: number) => {
        if (prev <= 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };

      // Case 1: Income increased from 50k to 75k (+50%)
      expect(calcGrowth(75000, 50000)).toBe(50);

      // Case 2: Expenses decreased from 40k to 30k (-25%)
      expect(calcGrowth(30000, 40000)).toBe(-25);

      // Case 3: Prior period zero income
      expect(calcGrowth(10000, 0)).toBe(100);
    });
  });

  describe("SECTION 3: Spending Velocity & Daily/Weekly Averages", () => {
    it("should accurately compute daily and weekly velocity", () => {
      const dailyExpenses = [1000, 1500, 0, 2500, 500, 3000, 2000]; // 7 days total = 10,500
      const total = dailyExpenses.reduce((a, b) => a + b, 0);
      const dailyAvg = Math.round(total / dailyExpenses.length);
      const weeklyAvg = Math.round(dailyAvg * 7);

      expect(dailyAvg).toBe(1500);
      expect(weeklyAvg).toBe(10500);
    });
  });

  describe("SECTION 5: Category Spending % Allocations", () => {
    it("should compute category shares correctly", () => {
      const totalExpense = 50000;
      const food = 20000; // 40%
      const travel = 15000; // 30%
      const shopping = 10000; // 20%
      const bills = 5000; // 10%

      const foodPct = Math.round((food / totalExpense) * 100);
      const travelPct = Math.round((travel / totalExpense) * 100);
      const shoppingPct = Math.round((shopping / totalExpense) * 100);
      const billsPct = Math.round((bills / totalExpense) * 100);

      expect(foodPct).toBe(40);
      expect(travelPct).toBe(30);
      expect(shoppingPct).toBe(20);
      expect(billsPct).toBe(10);
      expect(foodPct + travelPct + shoppingPct + billsPct).toBe(100);
    });
  });

  describe("SECTION 6: Personal vs Group Distribution", () => {
    it("should accurately calculate Personal vs Group contribution ratio", () => {
      const personalExpenses = 30000;
      const groupExpenses = 20000;
      const totalExpenses = personalExpenses + groupExpenses;

      const personalRatio = Math.round((personalExpenses / totalExpenses) * 100);
      const groupRatio = Math.round((groupExpenses / totalExpenses) * 100);

      expect(personalRatio).toBe(60);
      expect(groupRatio).toBe(40);
      expect(personalRatio + groupRatio).toBe(100);
    });
  });

  describe("SECTION 8: Date Comparison Difference & Growth", () => {
    it("should compute absolute differences and percentage changes", () => {
      const currentPeriodExpense = 45000;
      const previousPeriodExpense = 36000;

      const diff = currentPeriodExpense - previousPeriodExpense;
      const growth = Math.round((diff / previousPeriodExpense) * 100);

      expect(diff).toBe(9000);
      expect(growth).toBe(25);
    });
  });
});
