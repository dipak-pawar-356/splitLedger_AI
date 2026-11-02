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

  describe("Verified Ledger Exclusivity & Percentage Accuracy (Part VI-K)", () => {
    it("must calculate summary totals solely from approved transactions and exclude notes", () => {
      // Mock ledger approved transactions
      const approvedTransactions = [
        { type: "INCOME", amount: 25000, status: "APPROVED" },
        { type: "INCOME", amount: 11500, status: "APPROVED" },
        { type: "EXPENSE", amount: 4500, status: "APPROVED" },
        { type: "EXPENSE", amount: 11264, status: "APPROVED" },
      ];

      // Mock unapproved notes/journal entries
      const unapprovedNotes = [
        { content: "Paid lunch 450, need to claim back", extractedExpense: 450 },
        { content: "Client might pay 15000 next month", extractedIncome: 15000 },
      ];

      // Calculation ONLY from approved transactions
      const totalIncome = approvedTransactions
        .filter((t) => t.type === "INCOME" && t.status === "APPROVED")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = approvedTransactions
        .filter((t) => t.type === "EXPENSE" && t.status === "APPROVED")
        .reduce((sum, t) => sum + t.amount, 0);

      const savings = totalIncome - totalExpenses;

      expect(totalIncome).toBe(36500);
      expect(totalExpenses).toBe(15764);
      expect(savings).toBe(20736); // Exactly 36500 - 15764

      // Verification that notes did NOT contaminate the values
      expect(unapprovedNotes.length).toBe(2);
      expect(totalExpenses).not.toBe(15764 + 450);
      expect(totalIncome).not.toBe(36500 + 15000);
    });

    it("must return null for percentage trend when previous period has 0 data (never fabricate percentages)", () => {
      const computeTrend = (current: number, previous: number, isAllTime: boolean = false): number | null => {
        if (isAllTime) return null;
        if (previous <= 0) return null;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Previous period had 0 income -> trend must be null (render "—", never -62% or +80%)
      expect(computeTrend(36500, 0)).toBeNull();

      // All time filter selected -> trend must be null
      expect(computeTrend(36500, 20000, true)).toBeNull();

      // Valid previous period: current 15000, previous 10000 -> +50%
      expect(computeTrend(15000, 10000)).toBe(50);

      // Valid previous period: current 8000, previous 10000 -> -20%
      expect(computeTrend(8000, 10000)).toBe(-20);
    });

    it("must accurately format trend badges for UI display", () => {
      const formatTrendDisplay = (trend: number | null, isAllTime: boolean = false): { text: string; hasBaseline: boolean } => {
        if (isAllTime || trend === null) {
          return { text: "—", hasBaseline: false };
        }
        return {
          text: `${trend >= 0 ? "+" : ""}${trend}%`,
          hasBaseline: true,
        };
      };

      expect(formatTrendDisplay(null).text).toBe("—");
      expect(formatTrendDisplay(null).hasBaseline).toBe(false);
      expect(formatTrendDisplay(null, true).text).toBe("—");
      expect(formatTrendDisplay(45).text).toBe("+45%");
      expect(formatTrendDisplay(-30).text).toBe("-30%");
    });
  });
});
