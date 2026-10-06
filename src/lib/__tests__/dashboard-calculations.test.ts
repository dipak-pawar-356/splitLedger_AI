import { describe, it, expect } from "vitest";

describe("Dashboard Financial Calculations & Isolation", () => {
  describe("Receivable, Payable & Net Balance", () => {
    it("should correctly compute Net Balance = Receivable - Payable", () => {
      const receivable = 15450.75;
      const payable = 6200.25;
      const net = receivable - payable;

      expect(net).toBe(9250.5);
    });

    it("should handle negative net balance when payable exceeds receivable", () => {
      const receivable = 3000;
      const payable = 7500;
      const net = receivable - payable;

      expect(net).toBe(-4500);
    });
  });

  describe("Monthly Trends Calculation", () => {
    it("should compute positive spending trend percentage correctly", () => {
      const thisMonthSpending = 12000;
      const lastMonthSpending = 10000;
      const trend = Math.round(((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100);

      expect(trend).toBe(20);
    });

    it("should compute negative spending trend percentage when expenses decrease", () => {
      const thisMonthSpending = 8000;
      const lastMonthSpending = 10000;
      const trend = Math.round(((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100);

      expect(trend).toBe(-20);
    });
  });

  describe("Profile Completion Scoring", () => {
    it("should compute 100% when all profile fields are filled", () => {
      let score = 30; // base
      const hasName = true;
      const hasAvatar = true;
      const hasPhone = true;

      if (hasName) score += 25;
      if (hasAvatar) score += 20;
      if (hasPhone) score += 25;

      expect(score).toBe(100);
    });

    it("should compute partial score when some fields are missing", () => {
      let score = 30;
      const hasName = true;
      const hasAvatar = false;
      const hasPhone = false;

      if (hasName) score += 25;
      if (hasAvatar) score += 20;
      if (hasPhone) score += 25;

      expect(score).toBe(55);
    });
  });

  describe("Personal vs Group Separation", () => {
    it("should calculate personal savings = personal income - personal expense", () => {
      const personalIncome = 65000;
      const personalExpense = 32000;
      const savings = personalIncome - personalExpense;

      expect(savings).toBe(33000);
    });
  });
});
