import { describe, it, expect } from "vitest";
import {
  calculateOptimalSettlements,
  calculateGroupBalances,
  calculateContactSettlements,
  validateSettlement,
  generateSettlementSummary,
} from "../settlements/calculator";

describe("Settlement Calculator", () => {
  describe("calculateOptimalSettlements", () => {
    it("should calculate optimal settlements for simple balances", () => {
      const balances = [
        { userId: 1, amount: 100 },
        { userId: 2, amount: -50 },
        { userId: 3, amount: -50 },
      ];

      const settlements = calculateOptimalSettlements(balances, "INR");

      expect(settlements).toHaveLength(2);
      expect(settlements[0]).toEqual({
        fromUserId: 2,
        toUserId: 1,
        amount: 50,
        currency: "INR",
      });
      expect(settlements[1]).toEqual({
        fromUserId: 3,
        toUserId: 1,
        amount: 50,
        currency: "INR",
      });
    });

    it("should handle zero balances", () => {
      const balances = [
        { userId: 1, amount: 0 },
        { userId: 2, amount: 0 },
      ];

      const settlements = calculateOptimalSettlements(balances, "INR");

      expect(settlements).toHaveLength(0);
    });

    it("should minimize number of transactions", () => {
      const balances = [
        { userId: 1, amount: 200 },
        { userId: 2, amount: -100 },
        { userId: 3, amount: -50 },
        { userId: 4, amount: -50 },
      ];

      const settlements = calculateOptimalSettlements(balances, "INR");

      expect(settlements.length).toBeLessThanOrEqual(3);
    });
  });

  describe("calculateGroupBalances", () => {
    it("should calculate balances for a group", () => {
      const expenses = [
        {
          paidBy: 1,
          amount: 100,
          currency: "INR",
          splitType: "equal" as const,
          splits: [
            { userId: 1, amount: 50 },
            { userId: 2, amount: 50 },
          ],
        },
      ];

      const balances = calculateGroupBalances(expenses);

      expect(balances).toHaveLength(2);
      const user1Balance = balances.find((b) => b.userId === 1);
      const user2Balance = balances.find((b) => b.userId === 2);
      expect(user1Balance?.amount).toBe(50);
      expect(user2Balance?.amount).toBe(-50);
    });
  });

  describe("validateSettlement", () => {
    it("should validate a valid settlement", () => {
      const settlement = {
        fromUserId: 1,
        toUserId: 2,
        amount: 100,
        currency: "INR",
      };

      const result = validateSettlement(settlement);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject settlement with negative amount", () => {
      const settlement = {
        fromUserId: 1,
        toUserId: 2,
        amount: -100,
        currency: "INR",
      };

      const result = validateSettlement(settlement);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Amount must be positive");
    });

    it("should reject settlement with same from and to user", () => {
      const settlement = {
        fromUserId: 1,
        toUserId: 1,
        amount: 100,
        currency: "INR",
      };

      const result = validateSettlement(settlement);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("From and to users must be different");
    });
  });

  describe("generateSettlementSummary", () => {
    it("should generate a summary of settlements", () => {
      const settlements = [
        { fromUserId: 1, toUserId: 2, amount: 50, currency: "INR" },
        { fromUserId: 3, toUserId: 2, amount: 25, currency: "INR" },
      ];

      const summary = generateSettlementSummary(settlements);

      expect(summary.totalAmount).toBe(75);
      expect(summary.totalSettlements).toBe(2);
      expect(summary.currency).toBe("INR");
    });
  });
});
