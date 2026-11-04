import { describe, it, expect, vi } from "vitest";
import {
  createBudget,
  updateBudget,
  increaseBudget,
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

  describe("ENTERPRISE ENHANCEMENTS: Budget Duration & Live Increase System", () => {
    it("should create a budget with duration preset and compute duration metrics automatically", async () => {
      const budget = await createBudget({
        name: "Weekly Dining & Groceries",
        category: "Food & Dining",
        durationPreset: "weekly",
        allocatedAmount: 7000,
      });

      expect(budget.id).toMatch(/^bud_/);
      expect(budget.originalAmount).toBe(7000);
      expect(budget.allocatedAmount).toBe(7000);
      expect(budget.additionalAmount).toBe(0);
      expect(budget.increaseCount).toBe(0);
      expect(budget.totalDurationDays).toBe(7);
      expect(budget.daysRemaining).toBe(7);
      expect(budget.timelinePercentage).toBe(0);
      expect(budget.dailyAllowance).toBe(1000);
    });

    it("should increase an active budget without losing original history and record an audit log", async () => {
      // 1. Initial budget created
      const initialBudget = await createBudget({
        name: "Trip Fuel & Transit",
        category: "Transport & Fuel",
        durationPreset: "monthly",
        allocatedAmount: 10000,
      });

      expect(initialBudget.originalAmount).toBe(10000);
      expect(initialBudget.allocatedAmount).toBe(10000);

      // 2. User increases budget during period
      const increased = await increaseBudget({
        budgetId: initialBudget.id,
        additionalAmount: 5000,
        reason: "Unexpected highway toll & mountain fuel costs",
        notes: "Approved by finance manager",
      });

      expect(increased.id).toBe(initialBudget.id);
      expect(increased.originalAmount).toBe(10000);
      expect(increased.allocatedAmount).toBe(15000);
      expect(increased.additionalAmount).toBe(5000);
      expect(increased.increaseCount).toBe(1);
      expect(increased.increases).toHaveLength(1);
      expect(increased.increases![0].addedAmount).toBe(5000);
      expect(increased.increases![0].previousBudget).toBe(10000);
      expect(increased.increases![0].updatedBudget).toBe(15000);
      expect(increased.increases![0].reason).toBe("Unexpected highway toll & mountain fuel costs");
      expect(increased.growthPercentage).toBe(50);

      // 3. User increases budget a second time
      const secondIncrease = await increaseBudget({
        budgetId: initialBudget.id,
        additionalAmount: 2500,
        reason: "Vehicle maintenance top-up",
      });

      expect(secondIncrease.originalAmount).toBe(10000);
      expect(secondIncrease.allocatedAmount).toBe(17500);
      expect(secondIncrease.additionalAmount).toBe(7500);
      expect(secondIncrease.increaseCount).toBe(2);
      expect(secondIncrease.increases).toHaveLength(2);
      expect(secondIncrease.increases![0].addedAmount).toBe(2500);
      expect(secondIncrease.increases![0].previousBudget).toBe(15000);
      expect(secondIncrease.increases![0].updatedBudget).toBe(17500);
      expect(secondIncrease.growthPercentage).toBe(75);
    });
  });
});
