import { describe, it, expect, vi } from "vitest";
import {
  createBudget,
  createSavingsGoal,
  contributeToSavingsGoal,
  setSpendingLimit,
  getBudgetDashboardSummary,
} from "@/actions/budgets";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_budget_owner",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Budget Planning, Savings Goals & Spending Control (Part VI-J)", () => {
  describe("MODULE 1 & 2: Personal & Category Budgets", () => {
    it("should successfully create a category budget and track remaining amount in INR", async () => {
      const budget = await createBudget({
        name: "Monthly Fuel & Petrol",
        category: "Transportation",
        period: "monthly",
        allocatedAmount: 6000,
      });

      expect(budget.id).toMatch(/^bud_/);
      expect(budget.allocatedAmount).toBe(6000);
      expect(budget.remainingAmount).toBe(6000);
      expect(budget.percentageUsed).toBe(0);
      expect(budget.currency).toBe("INR");
    });

    it("should reject budget with ₹0 or negative allocated amount", async () => {
      await expect(
        createBudget({
          name: "Invalid Zero Budget",
          category: "Shopping",
          period: "monthly",
          allocatedAmount: 0,
        })
      ).rejects.toThrow("must be greater than ₹0");
    });
  });

  describe("MODULE 3: Group & Trip Budgets", () => {
    it("should create a shared group budget isolated to a specific groupId", async () => {
      const groupBudget = await createBudget({
        name: "Manali Group Trip Pool",
        category: "Travel",
        period: "custom",
        allocatedAmount: 50000,
        groupId: 202,
      });

      expect(groupBudget.groupId).toBe(202);
      expect(groupBudget.allocatedAmount).toBe(50000);
    });
  });

  describe("MODULE 5 & 6: Savings Goals & Auto Progress", () => {
    it("should track savings goal progress when funds are contributed", async () => {
      const goal = await createSavingsGoal({
        name: "Sony Alpha 7 IV Camera",
        targetAmount: 200000,
        targetDate: "2026-11-30",
        priority: "high",
        category: "Electronics",
      });

      expect(goal.progressPercent).toBe(0);
      expect(goal.status).toBe("in_progress");

      const contributed = await contributeToSavingsGoal(goal.id, 50000);
      expect(contributed.currentSaved).toBe(50000);
      expect(contributed.remainingAmount).toBe(150000);
      expect(contributed.progressPercent).toBe(25);
    });
  });

  describe("MODULE 8 & 13: Spending Limits & Dashboard Summary", () => {
    it("should configure daily/monthly spending caps and compute aggregate dashboard metrics", async () => {
      const limit = await setSpendingLimit({
        period: "daily",
        limitAmount: 3000,
        isStrict: true,
      });

      expect(limit.period).toBe("daily");
      expect(limit.limitAmount).toBe(3000);
      expect(limit.isStrict).toBe(true);

      const summary = await getBudgetDashboardSummary();
      expect(summary.totalBudgetAllocated).toBeGreaterThan(0);
      expect(summary.budgets.length).toBeGreaterThan(0);
      expect(summary.savingsGoals.length).toBeGreaterThan(0);
      expect(summary.currency).toBe("INR");
    });
  });
});
