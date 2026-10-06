"use server";

import { requireAuth } from "@/lib/auth";
import {
  BudgetRecord,
  BudgetType,
  SavingsGoal,
  SpendingLimit,
  BudgetDashboardMetrics,
  BudgetForecast,
  BudgetAuditLog,
} from "@/lib/types/budgets";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

export interface BudgetProgress {
  id: number;
  publicId: string;
  name: string;
  description?: string | null;
  amount: number;
  spent: number;
  usedAmount: number;
  remaining: number;
  remainingAmount: number;
  percentage: number;
  usedPercentage: number;
  status: "active" | "exceeded" | "warning" | "on_track" | "archived";
  healthStatus?: "active" | "exceeded" | "warning" | "on_track" | "archived";
  period: "monthly" | "weekly" | "yearly" | "custom" | "daily";
  budgetType?: BudgetType;
  startDate: Date | string;
  endDate: Date | string;
  categoryId?: number | null;
  categoryName?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  daysRemaining?: number;
  remainingDays: number;
  dailyBurnRate?: number;
  dailyBudgetRemaining: number;
  projectedSpend?: number;
  isOverBudget?: boolean;
  alertThreshold?: number;
  notes?: string;
  currency?: string;
}

// In-memory budget, progress, and savings store per user (Clean state)
const budgetsStore = new Map<string, BudgetRecord[]>();
const goalsStore = new Map<string, SavingsGoal[]>();
const limitsStore = new Map<string, SpendingLimit[]>();
const auditLogsStore = new Map<string, BudgetAuditLog[]>();

function ensureUserStores(userId: number) {
  const userKey = `user_${userId}`;
  if (!budgetsStore.has(userKey)) {
    budgetsStore.set(userKey, []);
  }
  if (!goalsStore.has(userKey)) {
    goalsStore.set(userKey, []);
  }
  if (!limitsStore.has(userKey)) {
    limitsStore.set(userKey, []);
  }
  if (!auditLogsStore.has(userKey)) {
    auditLogsStore.set(userKey, []);
  }
}

function logAudit(userId: number, budgetId: string, action: BudgetAuditLog["action"], details: string) {
  const userKey = `user_${userId}`;
  const logs = auditLogsStore.get(userKey) || [];
  logs.unshift({
    id: generatePublicId("aud"),
    budgetId,
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
  auditLogsStore.set(userKey, logs);
}

/**
 * Backward-compatible function returning budgets with progress
 */
export async function getBudgetsWithProgress(): Promise<BudgetProgress[]> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const budgets = budgetsStore.get(userKey) || [];

  return budgets
    .filter((b) => b.status !== "archived")
    .map((b, idx) => {
      let status: BudgetProgress["status"] = "on_track";
      if (b.percentageUsed >= 100) status = "exceeded";
      else if (b.percentageUsed >= 75) status = "warning";

      const spent = b.spentAmount;
      const remaining = Math.max(0, b.allocatedAmount - spent);
      const percentage = b.allocatedAmount > 0 ? Math.round((spent / b.allocatedAmount) * 100) : 0;

      const startDateObj = new Date(b.startDate);
      const endDateObj = b.endDate ? new Date(b.endDate) : new Date(Date.now() + 30 * 86400000);
      const now = new Date();
      const totalDays = Math.max(1, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / 86400000));
      const daysPassed = Math.max(1, Math.ceil((now.getTime() - startDateObj.getTime()) / 86400000));
      const remainingDays = Math.max(0, Math.ceil((endDateObj.getTime() - now.getTime()) / 86400000));

      const dailyBurnRate = Math.round(spent / daysPassed);
      const dailyBudgetRemaining = remainingDays > 0 ? Math.round(remaining / remainingDays) : 0;
      const projectedSpend = Math.round(dailyBurnRate * totalDays);

      return {
        id: idx + 1,
        publicId: b.id,
        name: b.name,
        description: b.description,
        amount: b.allocatedAmount,
        spent,
        usedAmount: spent,
        remaining,
        remainingAmount: remaining,
        percentage,
        usedPercentage: percentage,
        status,
        healthStatus: status,
        period: b.period as any,
        budgetType: b.budgetType,
        startDate: b.startDate,
        endDate: b.endDate || endDateObj.toISOString().split("T")[0],
        categoryId: 1,
        categoryName: b.category,
        groupId: b.groupId,
        groupName: b.groupId ? `Group #${b.groupId}` : undefined,
        daysRemaining: remainingDays,
        remainingDays,
        dailyBurnRate,
        dailyBudgetRemaining,
        projectedSpend,
        isOverBudget: spent > b.allocatedAmount,
      };
    });
}

/**
 * Get Budget Forecasting
 */
export async function getBudgetForecasting(): Promise<BudgetForecast> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const budgets = budgetsStore.get(userKey) || [];
  const activeBudgets = budgets.filter((b) => b.status === "active");

  const totalAllocated = activeBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDaysInMonth = Math.max(1, daysInMonth - dayOfMonth + 1);

  const averageDailyBurn = dayOfMonth > 0 ? Math.round(totalSpent / dayOfMonth) : 0;
  const projectedMonthlySpend = Math.round(totalSpent + averageDailyBurn * (daysInMonth - dayOfMonth));
  const remainingDailyBudget = Math.round(totalRemaining / remainingDaysInMonth);

  let exhaustionDate: string | null = null;
  if (averageDailyBurn > 0 && totalRemaining > 0) {
    const daysUntilExhaustion = Math.floor(totalRemaining / averageDailyBurn);
    const exDate = new Date();
    exDate.setDate(exDate.getDate() + daysUntilExhaustion);
    exhaustionDate = exDate.toISOString().split("T")[0];
  }

  return {
    projectedMonthlySpend,
    exhaustionDate,
    remainingDailyBudget,
    averageDailyBurn,
    isOverBudgetRisk: projectedMonthlySpend > totalAllocated && totalAllocated > 0,
  };
}

/**
 * Get Comprehensive Budget Dashboard Metrics
 */
export async function getBudgetDashboardSummary(): Promise<BudgetDashboardMetrics> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const budgets = budgetsStore.get(userKey) || [];
  const savingsGoals = goalsStore.get(userKey) || [];
  const spendingLimits = limitsStore.get(userKey) || [];
  const forecast = await getBudgetForecasting();

  const activeBudgets = budgets.filter((b) => b.status !== "archived");
  const totalBudgetAllocated = activeBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const totalRemaining = Math.max(0, totalBudgetAllocated - totalSpent);
  const overallUsagePercent = totalBudgetAllocated > 0 ? Math.round((totalSpent / totalBudgetAllocated) * 100) : 0;
  const totalSavedAcrossGoals = savingsGoals.reduce((sum, g) => sum + g.currentSaved, 0);

  return {
    totalBudgetAllocated,
    totalSpent,
    totalRemaining,
    overallUsagePercent,
    activeSavingsGoalsCount: savingsGoals.filter((g) => g.status === "in_progress").length,
    totalSavedAcrossGoals,
    currency: "INR",
    budgets,
    savingsGoals,
    spendingLimits,
    forecast,
  };
}

/**
 * Create a new personal, category, trip, group, or org budget
 */
export async function createBudget(data: {
  name: string;
  category?: string;
  categoryId?: number;
  budgetType?: BudgetType;
  period?: BudgetRecord["period"] | string;
  allocatedAmount?: number;
  amount?: number;
  groupId?: number;
  orgId?: string;
  linkedTripId?: string;
  linkedSavingsGoalId?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  notes?: string;
  tags?: string[];
  priority?: "high" | "medium" | "low";
  alertThreshold?: number;
}): Promise<BudgetRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const finalAmount = data.allocatedAmount ?? data.amount ?? 0;
  if (finalAmount <= 0) {
    throw new ValidationError("Allocated budget amount must be greater than ₹0.");
  }

  const budgetId = generatePublicId("bud");
  const newBudget: BudgetRecord = {
    id: budgetId,
    userId: user.id,
    groupId: data.groupId,
    orgId: data.orgId,
    linkedTripId: data.linkedTripId,
    linkedSavingsGoalId: data.linkedSavingsGoalId,
    name: data.name,
    description: data.description || data.notes,
    category: data.category || "General",
    budgetType: data.budgetType || "personal",
    period: (data.period as BudgetRecord["period"]) || "monthly",
    allocatedAmount: finalAmount,
    spentAmount: 0,
    remainingAmount: finalAmount,
    percentageUsed: 0,
    currency: data.currency || "INR",
    status: "active",
    priority: data.priority || "medium",
    tags: data.tags || [],
    notes: data.notes,
    startDate: data.startDate || new Date().toISOString().split("T")[0],
    endDate: data.endDate,
    alertThresholds: [
      { percent: 50, triggered: false },
      { percent: 75, triggered: false },
      { percent: 90, triggered: false },
      { percent: 100, triggered: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const budgets = budgetsStore.get(userKey) || [];
  budgets.push(newBudget);
  budgetsStore.set(userKey, budgets);

  logAudit(user.id, budgetId, "created", `Created budget '${data.name}' with ₹${finalAmount}`);

  return newBudget;
}

/**
 * Update an existing budget
 */
export async function updateBudget(
  publicId: string,
  data: Partial<BudgetRecord> & {
    amount?: number;
    categoryId?: number;
    currency?: string;
    notes?: string;
    alertThreshold?: number;
  }
): Promise<BudgetRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const budgets = budgetsStore.get(userKey) || [];
  const budget = budgets.find((b) => b.id === publicId);

  if (!budget) {
    throw new DatabaseError("Budget not found.");
  }

  const oldAmount = budget.allocatedAmount;

  if (data.amount !== undefined) {
    budget.allocatedAmount = data.amount;
  } else if (data.allocatedAmount !== undefined) {
    budget.allocatedAmount = data.allocatedAmount;
  }

  if (data.spentAmount !== undefined) {
    budget.spentAmount = data.spentAmount;
  }

  budget.remainingAmount = Math.max(0, budget.allocatedAmount - budget.spentAmount);
  budget.percentageUsed = budget.allocatedAmount > 0 ? Math.round((budget.spentAmount / budget.allocatedAmount) * 100) : 0;

  if (data.name) budget.name = data.name;
  if (data.description !== undefined) budget.description = data.description;
  if (data.category) budget.category = data.category;
  if (data.budgetType) budget.budgetType = data.budgetType;
  if (data.period) budget.period = data.period;
  if (data.status) budget.status = data.status;
  budget.updatedAt = new Date().toISOString();

  logAudit(user.id, publicId, "updated", `Updated budget '${budget.name}' allocated amount from ₹${oldAmount} to ₹${budget.allocatedAmount}`);

  return budget;
}

/**
 * Duplicate a budget
 */
export async function duplicateBudget(publicId: string): Promise<BudgetRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const budgets = budgetsStore.get(userKey) || [];
  const source = budgets.find((b) => b.id === publicId);

  if (!source) {
    throw new DatabaseError("Budget not found.");
  }

  return await createBudget({
    name: `${source.name} (Copy)`,
    category: source.category,
    budgetType: source.budgetType,
    period: source.period,
    allocatedAmount: source.allocatedAmount,
    groupId: source.groupId,
    orgId: source.orgId,
    linkedTripId: source.linkedTripId,
    description: source.description,
    startDate: new Date().toISOString().split("T")[0],
    currency: source.currency,
  });
}

/**
 * Archive a budget
 */
export async function archiveBudget(publicId: string): Promise<BudgetRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const budgets = budgetsStore.get(userKey) || [];
  const budget = budgets.find((b) => b.id === publicId);

  if (!budget) {
    throw new DatabaseError("Budget not found.");
  }

  budget.status = "archived";
  budget.updatedAt = new Date().toISOString();
  logAudit(user.id, publicId, "archived", `Archived budget '${budget.name}'`);
  return budget;
}

/**
 * Restore an archived budget
 */
export async function restoreBudget(publicId: string): Promise<BudgetRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const budgets = budgetsStore.get(userKey) || [];
  const budget = budgets.find((b) => b.id === publicId);

  if (!budget) {
    throw new DatabaseError("Budget not found.");
  }

  budget.status = "active";
  budget.updatedAt = new Date().toISOString();
  logAudit(user.id, publicId, "restored", `Restored budget '${budget.name}'`);
  return budget;
}

/**
 * Delete a budget
 */
export async function deleteBudget(publicId: string): Promise<boolean> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  let budgets = budgetsStore.get(userKey) || [];
  const existing = budgets.find((b) => b.id === publicId);
  budgets = budgets.filter((b) => b.id !== publicId);
  budgetsStore.set(userKey, budgets);

  if (existing) {
    logAudit(user.id, publicId, "deleted", `Deleted budget '${existing.name}'`);
  }
  return true;
}

/**
 * Transfer unused budget amount into a Savings Goal
 */
export async function transferUnusedBudgetToSavingsGoal(
  budgetId: string,
  goalId: string,
  amount: number
): Promise<{ budget: BudgetRecord; goal: SavingsGoal }> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const budgets = budgetsStore.get(userKey) || [];
  const goals = goalsStore.get(userKey) || [];

  const budget = budgets.find((b) => b.id === budgetId);
  const goal = goals.find((g) => g.id === goalId);

  if (!budget) throw new DatabaseError("Budget not found.");
  if (!goal) throw new DatabaseError("Savings Goal not found.");

  if (amount <= 0) throw new ValidationError("Transfer amount must be greater than ₹0.");
  if (amount > budget.remainingAmount) {
    throw new ValidationError(`Transfer amount (₹${amount}) exceeds remaining budget (₹${budget.remainingAmount}).`);
  }

  // Deduct from budget allocated / adjust remaining
  budget.spentAmount += amount;
  budget.remainingAmount = Math.max(0, budget.allocatedAmount - budget.spentAmount);
  budget.percentageUsed = Math.round((budget.spentAmount / budget.allocatedAmount) * 100);

  // Add to goal
  goal.currentSaved += amount;
  goal.remainingAmount = Math.max(0, goal.targetAmount - goal.currentSaved);
  goal.progressPercent = Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100));
  if (goal.currentSaved >= goal.targetAmount) goal.status = "achieved";

  logAudit(user.id, budgetId, "savings_transferred", `Transferred ₹${amount} unused budget from '${budget.name}' to Savings Goal '${goal.name}'`);

  return { budget, goal };
}

/**
 * Create a new savings goal
 */
export async function createSavingsGoal(data: {
  name: string;
  targetAmount: number;
  targetDate: string;
  priority: SavingsGoal["priority"];
  category: string;
  notes?: string;
}): Promise<SavingsGoal> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  if (data.targetAmount <= 0) {
    throw new ValidationError("Target amount must be greater than ₹0.");
  }

  const goal: SavingsGoal = {
    id: generatePublicId("goal"),
    userId: user.id,
    name: data.name,
    targetAmount: data.targetAmount,
    currentSaved: 0,
    remainingAmount: data.targetAmount,
    progressPercent: 0,
    targetDate: data.targetDate,
    priority: data.priority,
    category: data.category,
    currency: "INR",
    status: "in_progress",
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };

  const goals = goalsStore.get(userKey) || [];
  goals.push(goal);
  goalsStore.set(userKey, goals);

  return goal;
}

/**
 * Contribute funds towards a savings goal
 */
export async function contributeToSavingsGoal(
  goalId: string,
  amount: number
): Promise<SavingsGoal> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const goals = goalsStore.get(userKey) || [];
  const goal = goals.find((g) => g.id === goalId);

  if (!goal) {
    throw new DatabaseError("Savings goal not found.");
  }

  if (amount <= 0) {
    throw new ValidationError("Contribution amount must be greater than ₹0.");
  }

  goal.currentSaved += amount;
  goal.remainingAmount = Math.max(0, goal.targetAmount - goal.currentSaved);
  goal.progressPercent = Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100));

  if (goal.currentSaved >= goal.targetAmount) {
    goal.status = "achieved";
  }

  return goal;
}

/**
 * Set Spending Limits
 */
export async function setSpendingLimit(data: {
  period: "daily" | "weekly" | "monthly" | "yearly";
  limitAmount: number;
  category?: string;
  tripId?: string;
  groupId?: number;
  orgId?: string;
  isStrict?: boolean;
}): Promise<SpendingLimit> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const limits = limitsStore.get(userKey) || [];

  let limit = limits.find((l) => l.period === data.period && l.category === data.category);
  if (limit) {
    limit.limitAmount = data.limitAmount;
    limit.isStrict = data.isStrict || false;
  } else {
    limit = {
      id: generatePublicId("lim"),
      userId: user.id,
      period: data.period,
      limitAmount: data.limitAmount,
      currentSpend: 0,
      category: data.category,
      tripId: data.tripId,
      groupId: data.groupId,
      orgId: data.orgId,
      alertPercent: 80,
      isStrict: data.isStrict || false,
      isExceeded: false,
    };
    limits.push(limit);
  }

  return limit;
}

/**
 * Delete a spending limit
 */
export async function deleteSpendingLimit(limitId: string): Promise<boolean> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  let limits = limitsStore.get(userKey) || [];
  limits = limits.filter((l) => l.id !== limitId);
  limitsStore.set(userKey, limits);
  return true;
}

/**
 * Get Budget Audit Logs
 */
export async function getBudgetAuditLogs(): Promise<BudgetAuditLog[]> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  return auditLogsStore.get(userKey) || [];
}
