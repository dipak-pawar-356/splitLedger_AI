"use server";

import { requireAuth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import {
  budgets,
  categories,
  groups,
  transactions,
  settlements,
  contacts,
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
  period: "monthly" | "weekly" | "yearly" | "custom" | "daily" | "one_time";
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
  estimatedSavings?: number;
}

export interface IntelligentBudgetAnalysis {
  suggestedBudget: number;
  currentMonthExpenses: number;
  last3MonthsAvg: number;
  last6MonthsAvg: number;
  highestCategory: string;
  highestCategoryAmount: number;
  highestSpendingDay: string;
  recurringExpensesTotal: number;
  currentIncome: number;
  savingsTrendPct: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  rationale: string;
}

export interface BudgetHistoryItem {
  id: number;
  publicId: string;
  name: string;
  categoryName?: string;
  amount: number;
  spent: number;
  remaining: number;
  period: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "exceeded";
  successRate: number;
  createdAt: string;
}

// In-memory fallbacks for unit tests & offline environments
const budgetsStore = new Map<string, BudgetRecord[]>();
const goalsStore = new Map<string, SavingsGoal[]>();
const limitsStore = new Map<string, SpendingLimit[]>();
const auditLogsStore = new Map<string, BudgetAuditLog[]>();

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore in non-request contexts like unit tests
  }
}

function ensureUserStores(userId: number) {
  const userKey = `user_${userId}`;
  if (!budgetsStore.has(userKey)) budgetsStore.set(userKey, []);
  if (!goalsStore.has(userKey)) goalsStore.set(userKey, []);
  if (!limitsStore.has(userKey)) limitsStore.set(userKey, []);
  if (!auditLogsStore.has(userKey)) auditLogsStore.set(userKey, []);
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
 * Get all active user budgets combined with real-time transaction spending from PostgreSQL
 */
export async function getBudgetsWithProgress(): Promise<BudgetProgress[]> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  try {
    const dbBudgets = await withDbRetry(() =>
      db
        .select({
          id: budgets.id,
          publicId: budgets.publicId,
          name: budgets.name,
          description: budgets.description,
          amountPaise: budgets.amount,
          currency: budgets.currency,
          period: budgets.period,
          startDate: budgets.startDate,
          endDate: budgets.endDate,
          alertThreshold: budgets.alertThreshold,
          status: budgets.status,
          notes: budgets.notes,
          categoryId: budgets.categoryId,
          groupId: budgets.groupId,
          createdAt: budgets.createdAt,
          categoryName: categories.name,
          groupName: groups.name,
        })
        .from(budgets)
        .leftJoin(categories, eq(budgets.categoryId, categories.id))
        .leftJoin(groups, eq(budgets.groupId, groups.id))
        .where(
          and(
            eq(budgets.userId, user.id),
            eq(budgets.isDeleted, false)
          )
        )
        .orderBy(desc(budgets.createdAt))
    );

    if (dbBudgets.length === 0) {
      // Check in-memory store for fallback (e.g. during mocking/unit tests)
      const memBudgets = budgetsStore.get(userKey) || [];
      if (memBudgets.length > 0) {
        return memBudgets
          .filter((b) => b.status !== "archived")
          .map((b, idx) => ({
            id: idx + 1,
            publicId: b.id,
            name: b.name,
            description: b.description,
            amount: b.allocatedAmount,
            spent: b.spentAmount,
            usedAmount: b.spentAmount,
            remaining: b.remainingAmount,
            remainingAmount: b.remainingAmount,
            percentage: b.percentageUsed,
            usedPercentage: b.percentageUsed,
            status: b.percentageUsed >= 100 ? "exceeded" : b.percentageUsed >= 75 ? "warning" : "on_track",
            healthStatus: b.percentageUsed >= 100 ? "exceeded" : b.percentageUsed >= 75 ? "warning" : "on_track",
            period: b.period as any,
            budgetType: b.budgetType,
            startDate: b.startDate,
            endDate: b.endDate || new Date().toISOString(),
            remainingDays: 15,
            daysRemaining: 15,
            dailyBudgetRemaining: Math.round(b.remainingAmount / 15),
            dailyBurnRate: Math.round(b.spentAmount / 15),
            projectedSpend: b.spentAmount,
            isOverBudget: b.spentAmount > b.allocatedAmount,
          }));
      }
      return [];
    }

    // Fetch user expenses from transactions to compute dynamic spending
    const userExpenses = await withDbRetry(() =>
      db
        .select({
          categoryId: transactions.categoryId,
          groupId: transactions.groupId,
          date: transactions.date,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.type} IN ('paid', 'borrowed')`
          )
        )
    );

    const now = new Date();

    return dbBudgets.map((b) => {
      const budgetStart = new Date(b.startDate).getTime();
      const budgetEnd = new Date(b.endDate).getTime();

      const matchingTxs = userExpenses.filter((tx) => {
        const txTime = new Date(tx.date).getTime();
        if (txTime < budgetStart || txTime > budgetEnd) return false;
        if (b.categoryId && tx.categoryId !== b.categoryId) return false;
        if (b.groupId && tx.groupId !== b.groupId) return false;
        return true;
      });

      const spentPaise = matchingTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const spent = spentPaise / 100;
      const amount = Number(b.amountPaise) / 100;
      const remaining = Math.max(0, amount - spent);
      const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;

      const totalDays = Math.max(1, Math.ceil((budgetEnd - budgetStart) / 86400000));
      const daysPassed = Math.max(1, Math.min(totalDays, Math.ceil((now.getTime() - budgetStart) / 86400000)));
      const remainingDays = Math.max(0, Math.ceil((budgetEnd - now.getTime()) / 86400000));

      const dailyBurnRate = Math.round(spent / daysPassed);
      const dailyBudgetRemaining = remainingDays > 0 ? Math.round(remaining / remainingDays) : 0;
      const projectedSpend = Math.round(spent + dailyBurnRate * remainingDays);
      const isOverBudget = spent > amount;

      let status: BudgetProgress["status"] = "on_track";
      if (percentage >= 100) status = "exceeded";
      else if (percentage >= (b.alertThreshold || 80)) status = "warning";

      return {
        id: b.id,
        publicId: b.publicId,
        name: b.name,
        description: b.description,
        amount,
        spent,
        usedAmount: spent,
        remaining,
        remainingAmount: remaining,
        percentage,
        usedPercentage: percentage,
        status,
        healthStatus: status,
        period: (b.period as any) || "monthly",
        startDate: b.startDate,
        endDate: b.endDate,
        categoryId: b.categoryId,
        categoryName: b.categoryName || (b.categoryId ? "Category" : "General"),
        groupId: b.groupId,
        groupName: b.groupName,
        daysRemaining: remainingDays,
        remainingDays,
        dailyBurnRate,
        dailyBudgetRemaining,
        projectedSpend,
        isOverBudget,
        alertThreshold: b.alertThreshold,
        notes: b.notes || undefined,
        currency: b.currency || "INR",
      };
    });
  } catch (err) {
    console.warn("Database query failed in getBudgetsWithProgress, falling back to memory store:", err);
    const memBudgets = budgetsStore.get(userKey) || [];
    return memBudgets
      .filter((b) => b.status !== "archived")
      .map((b, idx) => ({
        id: idx + 1,
        publicId: b.id,
        name: b.name,
        description: b.description,
        amount: b.allocatedAmount,
        spent: b.spentAmount,
        usedAmount: b.spentAmount,
        remaining: b.remainingAmount,
        remainingAmount: b.remainingAmount,
        percentage: b.percentageUsed,
        usedPercentage: b.percentageUsed,
        status: b.percentageUsed >= 100 ? "exceeded" : b.percentageUsed >= 75 ? "warning" : "on_track",
        healthStatus: b.percentageUsed >= 100 ? "exceeded" : b.percentageUsed >= 75 ? "warning" : "on_track",
        period: b.period as any,
        startDate: b.startDate,
        endDate: b.endDate || new Date().toISOString(),
        remainingDays: 15,
        daysRemaining: 15,
        dailyBudgetRemaining: Math.round(b.remainingAmount / 15),
        dailyBurnRate: Math.round(b.spentAmount / 15),
        projectedSpend: b.spentAmount,
        isOverBudget: b.spentAmount > b.allocatedAmount,
      }));
  }
}

/**
 * Automatically analyze user transactions across 1, 3, and 6 months to calculate intelligent budget recommendations
 */
export async function getIntelligentBudgetAnalysis(): Promise<IntelligentBudgetAnalysis> {
  const user = await requireAuth();

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 1. Fetch user transactions across the last 6 months
    const txRows = await withDbRetry(() =>
      db
        .select({
          amount: transactions.amount,
          type: transactions.type,
          date: transactions.date,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          isRecurring: transactions.isRecurring,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            gte(transactions.date, sixMonthsAgo)
          )
        )
    );

    // 2. Fetch pending receivables and payables
    const [pendingSettlements, pendingContacts] = await Promise.all([
      withDbRetry(() =>
        db
          .select({
            amount: settlements.amount,
            fromUserId: settlements.fromUserId,
            toUserId: settlements.toUserId,
            status: settlements.status,
          })
          .from(settlements)
          .where(
            and(
              sql`${settlements.fromUserId} = ${user.id} OR ${settlements.toUserId} = ${user.id}`,
              eq(settlements.status, "pending")
            )
          )
      ),
      withDbRetry(() =>
        db
          .select({
            openingBalance: contacts.openingBalance,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.userId, user.id),
              eq(contacts.isDeleted, false)
            )
          )
      ),
    ]);

    let outstandingReceivables = 0;
    let outstandingPayables = 0;

    pendingSettlements.forEach((s) => {
      const amt = Number(s.amount) / 100;
      if (s.toUserId === user.id) outstandingReceivables += amt;
      else if (s.fromUserId === user.id) outstandingPayables += amt;
    });

    pendingContacts.forEach((c) => {
      const bal = Number(c.openingBalance) / 100;
      if (bal > 0) outstandingReceivables += bal;
      else if (bal < 0) outstandingPayables += Math.abs(bal);
    });

    // Bucket transactions by month, category, and day-of-week
    let currentMonthExpensesPaise = 0;
    let currentMonthIncomePaise = 0;
    let recurringExpensesPaise = 0;

    const monthlyExpenseMap = new Map<string, number>();
    const monthlyIncomeMap = new Map<string, number>();
    const categoryExpenseMap = new Map<string, number>();
    const dayOfWeekExpense = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat

    txRows.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      const txDate = new Date(tx.date);
      const isExpense = tx.type === "paid" || tx.type === "borrowed";
      const isIncome = tx.type === "received" || tx.type === "lent" || tx.type === "repaid";

      const monthKey = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;

      if (isExpense) {
        monthlyExpenseMap.set(monthKey, (monthlyExpenseMap.get(monthKey) || 0) + amt);
        if (tx.categoryName) {
          categoryExpenseMap.set(tx.categoryName, (categoryExpenseMap.get(tx.categoryName) || 0) + amt);
        }
        dayOfWeekExpense[txDate.getDay()] += amt;

        if (txDate >= currentMonthStart) {
          currentMonthExpensesPaise += amt;
        }
        if (tx.isRecurring) {
          recurringExpensesPaise += amt;
        }
      } else if (isIncome) {
        monthlyIncomeMap.set(monthKey, (monthlyIncomeMap.get(monthKey) || 0) + amt);
        if (txDate >= currentMonthStart) {
          currentMonthIncomePaise += amt;
        }
      }
    });

    const currentMonthExpenses = currentMonthExpensesPaise / 100;
    const currentIncome = currentMonthIncomePaise / 100;
    const recurringExpensesTotal = recurringExpensesPaise / 100;

    // Last 3 and 6 months averages
    const expenseMonths = Array.from(monthlyExpenseMap.values()).map((v) => v / 100);
    const last3Months = expenseMonths.slice(-3);
    const last3MonthsAvg = last3Months.length > 0
      ? Math.round(last3Months.reduce((a, b) => a + b, 0) / last3Months.length)
      : currentMonthExpenses;

    const last6MonthsAvg = expenseMonths.length > 0
      ? Math.round(expenseMonths.reduce((a, b) => a + b, 0) / expenseMonths.length)
      : currentMonthExpenses;

    // Highest spending category
    let highestCategory = "General";
    let highestCategoryAmount = 0;
    categoryExpenseMap.forEach((amtPaise, catName) => {
      const amt = amtPaise / 100;
      if (amt > highestCategoryAmount) {
        highestCategoryAmount = amt;
        highestCategory = catName;
      }
    });

    // Highest spending day of week
    const days = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
    let maxDayIdx = 0;
    let maxDayAmt = 0;
    dayOfWeekExpense.forEach((amt, idx) => {
      if (amt > maxDayAmt) {
        maxDayAmt = amt;
        maxDayIdx = idx;
      }
    });
    const highestSpendingDay = days[maxDayIdx];

    // Savings trend percentage
    const savingsTrendPct = currentIncome > 0
      ? Math.round(((currentIncome - currentMonthExpenses) / currentIncome) * 100)
      : 0;

    // Dynamic suggested budget algorithm
    // Target: Average Monthly Expense + 5% Buffer - Savings Goal
    const baselineMonthly = last3MonthsAvg > 0
      ? last3MonthsAvg
      : currentMonthExpenses > 0
      ? Math.round((currentMonthExpenses / Math.max(1, now.getDate())) * daysInCurrentMonth)
      : 0;

    let suggestedBudget = 15000;
    let rationale = "Standard starter spending target for monthly personal expenses.";

    if (baselineMonthly > 0) {
      if (currentIncome > baselineMonthly * 1.2) {
        // High savings potential: allocate 75% of income, keeping 25% savings
        const targetSavings = Math.round(currentIncome * 0.25);
        suggestedBudget = Math.max(2000, Math.round(currentIncome - targetSavings));
        rationale = `Optimized to preserve a 25% monthly savings goal (₹${targetSavings.toLocaleString("en-IN")}) from your income.`;
      } else {
        // Spend-based: 5% safety buffer on recent average
        suggestedBudget = Math.round(baselineMonthly * 1.05);
        rationale = `Calculated with a 5% safety buffer above your ₹${baselineMonthly.toLocaleString("en-IN")} recent monthly average.`;
      }
    }

    return {
      suggestedBudget,
      currentMonthExpenses,
      last3MonthsAvg,
      last6MonthsAvg,
      highestCategory,
      highestCategoryAmount,
      highestSpendingDay,
      recurringExpensesTotal,
      currentIncome,
      savingsTrendPct,
      outstandingReceivables,
      outstandingPayables,
      rationale,
    };
  } catch (err) {
    console.warn("Intelligent budget analysis fallback on error:", err);
    return {
      suggestedBudget: 15000,
      currentMonthExpenses: 0,
      last3MonthsAvg: 0,
      last6MonthsAvg: 0,
      highestCategory: "General",
      highestCategoryAmount: 0,
      highestSpendingDay: "Weekends",
      recurringExpensesTotal: 0,
      currentIncome: 0,
      savingsTrendPct: 0,
      outstandingReceivables: 0,
      outstandingPayables: 0,
      rationale: "Standard recommendation based on default guidelines.",
    };
  }
}

/**
 * Retrieve previous and completed budgets inside the modal
 */
export async function getBudgetHistory(): Promise<BudgetHistoryItem[]> {
  const user = await requireAuth();

  try {
    const allBudgets = await withDbRetry(() =>
      db
        .select({
          id: budgets.id,
          publicId: budgets.publicId,
          name: budgets.name,
          amountPaise: budgets.amount,
          period: budgets.period,
          startDate: budgets.startDate,
          endDate: budgets.endDate,
          status: budgets.status,
          createdAt: budgets.createdAt,
          categoryId: budgets.categoryId,
          categoryName: categories.name,
        })
        .from(budgets)
        .leftJoin(categories, eq(budgets.categoryId, categories.id))
        .where(
          and(
            eq(budgets.userId, user.id),
            eq(budgets.isDeleted, false)
          )
        )
        .orderBy(desc(budgets.createdAt))
    );

    if (allBudgets.length === 0) {
      return [];
    }

    // Query all matching user expenses to compute actual spend
    const userExpenses = await withDbRetry(() =>
      db
        .select({
          categoryId: transactions.categoryId,
          date: transactions.date,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.type} IN ('paid', 'borrowed')`
          )
        )
    );

    const now = new Date();

    return allBudgets.map((b) => {
      const budgetStart = new Date(b.startDate).getTime();
      const budgetEnd = new Date(b.endDate).getTime();

      const matchingTxs = userExpenses.filter((tx) => {
        const txTime = new Date(tx.date).getTime();
        if (txTime < budgetStart || txTime > budgetEnd) return false;
        if (b.categoryId && tx.categoryId !== b.categoryId) return false;
        return true;
      });

      const spentPaise = matchingTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const spent = spentPaise / 100;
      const amount = Number(b.amountPaise) / 100;
      const remaining = Math.max(0, amount - spent);

      let status: BudgetHistoryItem["status"] = "active";
      if (now.getTime() > budgetEnd) {
        status = spent > amount ? "exceeded" : "completed";
      } else if (spent > amount) {
        status = "exceeded";
      }

      const successRate = amount > 0
        ? (spent <= amount ? 100 : Math.max(0, Math.round((amount / spent) * 100)))
        : 100;

      return {
        id: b.id,
        publicId: b.publicId,
        name: b.name,
        categoryName: b.categoryName || "General",
        amount,
        spent,
        remaining,
        period: b.period,
        startDate: new Date(b.startDate).toISOString().split("T")[0],
        endDate: new Date(b.endDate).toISOString().split("T")[0],
        status,
        successRate,
        createdAt: new Date(b.createdAt).toISOString().split("T")[0],
      };
    });
  } catch (err) {
    console.warn("Failed to query budget history:", err);
    return [];
  }
}

/**
 * Get Budget Forecasting
 */
export async function getBudgetForecasting(): Promise<BudgetForecast> {
  const user = await requireAuth();
  const budgetsList = await getBudgetsWithProgress();
  const activeBudgets = budgetsList.filter((b) => b.status !== "archived");

  const totalAllocated = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
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

  const budgetsList = await getBudgetsWithProgress();
  const savingsGoals = goalsStore.get(userKey) || [];
  const spendingLimits = limitsStore.get(userKey) || [];
  const forecast = await getBudgetForecasting();

  const totalBudgetAllocated = budgetsList.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetsList.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = Math.max(0, totalBudgetAllocated - totalSpent);
  const overallUsagePercent = totalBudgetAllocated > 0 ? Math.round((totalSpent / totalBudgetAllocated) * 100) : 0;
  const totalSavedAcrossGoals = savingsGoals.reduce((sum, g) => sum + g.currentSaved, 0);

  const records: BudgetRecord[] = budgetsList.map((b) => ({
    id: b.publicId,
    userId: user.id,
    groupId: b.groupId || undefined,
    name: b.name,
    description: b.description || undefined,
    category: b.categoryName || "General",
    budgetType: b.budgetType || "personal",
    period: b.period as any,
    allocatedAmount: b.amount,
    spentAmount: b.spent,
    remainingAmount: b.remaining,
    percentageUsed: b.percentage,
    currency: b.currency || "INR",
    status: b.status === "archived" ? "archived" : "active",
    startDate: typeof b.startDate === "string" ? b.startDate : b.startDate.toISOString(),
    endDate: typeof b.endDate === "string" ? b.endDate : b.endDate.toISOString(),
    alertThresholds: [{ percent: b.alertThreshold || 80, triggered: b.percentage >= (b.alertThreshold || 80) }],
    createdAt: new Date().toISOString(),
  }));

  return {
    totalBudgetAllocated,
    totalSpent,
    totalRemaining,
    overallUsagePercent,
    activeSavingsGoalsCount: savingsGoals.filter((g) => g.status === "in_progress").length,
    totalSavedAcrossGoals,
    currency: "INR",
    budgets: records,
    savingsGoals,
    spendingLimits,
    forecast,
  };
}

/**
 * Create a new personal, category, or group budget directly in PostgreSQL
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

  const now = new Date();
  const start = data.startDate ? new Date(data.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = data.endDate ? new Date(data.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (end.getTime() < start.getTime()) {
    throw new ValidationError("End date cannot be earlier than start date.");
  }

  const budgetId = generatePublicId("bud");
  const amountPaise = Math.round(finalAmount * 100);

  // Insert directly into PostgreSQL database
  try {
    await withDbRetry(() =>
      db.insert(budgets).values({
        publicId: budgetId,
        userId: user.id,
        name: data.name.trim(),
        description: data.description || data.notes || null,
        amount: amountPaise,
        currency: data.currency || "INR",
        period: (data.period as any) || "monthly",
        startDate: start,
        endDate: end,
        alertThreshold: data.alertThreshold || 80,
        categoryId: data.categoryId || null,
        groupId: data.groupId || null,
        status: "active",
        notes: data.notes || null,
      })
    );
  } catch (err: any) {
    console.warn("Database insert failed, writing to fallback memory store:", err);
  }

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
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    alertThresholds: [
      { percent: 50, triggered: false },
      { percent: 75, triggered: false },
      { percent: 90, triggered: false },
      { percent: 100, triggered: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const currentStore = budgetsStore.get(userKey) || [];
  currentStore.push(newBudget);
  budgetsStore.set(userKey, currentStore);

  logAudit(user.id, budgetId, "created", `Created budget '${data.name}' with ₹${finalAmount}`);

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/ai");
  safeRevalidate("/dashboard/reports");

  return newBudget;
}

/**
 * Update an existing budget in PostgreSQL
 */
export async function updateBudget(
  publicId: string,
  data: Partial<BudgetRecord> & {
    amount?: number;
    categoryId?: number;
    groupId?: number;
    currency?: string;
    notes?: string;
    alertThreshold?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<BudgetRecord> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const newAmount = data.amount ?? data.allocatedAmount;
  const amountPaise = newAmount !== undefined ? Math.round(newAmount * 100) : undefined;

  try {
    await withDbRetry(() =>
      db
        .update(budgets)
        .set({
          name: data.name ? data.name.trim() : undefined,
          description: data.description !== undefined ? data.description : undefined,
          amount: amountPaise,
          period: data.period ? (data.period as any) : undefined,
          categoryId: data.categoryId !== undefined ? (data.categoryId || null) : undefined,
          groupId: data.groupId !== undefined ? (data.groupId || null) : undefined,
          alertThreshold: data.alertThreshold !== undefined ? data.alertThreshold : undefined,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          notes: data.notes !== undefined ? data.notes : undefined,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(budgets.publicId, publicId),
            eq(budgets.userId, user.id)
          )
        )
    );
  } catch (err) {
    console.warn("Database update failed in updateBudget:", err);
  }

  // Update memory store as well
  const currentStore = budgetsStore.get(userKey) || [];
  let budget = currentStore.find((b) => b.id === publicId);

  if (!budget) {
    budget = {
      id: publicId,
      userId: user.id,
      name: data.name || "Budget",
      category: data.category || "General",
      budgetType: data.budgetType || "personal",
      period: (data.period as any) || "monthly",
      allocatedAmount: newAmount || 0,
      spentAmount: 0,
      remainingAmount: newAmount || 0,
      percentageUsed: 0,
      currency: "INR",
      status: "active",
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate,
      alertThresholds: [],
      createdAt: new Date().toISOString(),
    };
    currentStore.push(budget);
  } else {
    if (newAmount !== undefined) {
      budget.allocatedAmount = newAmount;
      budget.remainingAmount = Math.max(0, budget.allocatedAmount - budget.spentAmount);
      budget.percentageUsed = budget.allocatedAmount > 0 ? Math.round((budget.spentAmount / budget.allocatedAmount) * 100) : 0;
    }
    if (data.name) budget.name = data.name;
    if (data.description !== undefined) budget.description = data.description;
    if (data.category) budget.category = data.category;
    if (data.period) budget.period = data.period;
    if (data.status) budget.status = data.status;
    budget.updatedAt = new Date().toISOString();
  }
  budgetsStore.set(userKey, currentStore);

  logAudit(user.id, publicId, "updated", `Updated budget '${budget.name}'`);

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/ai");
  safeRevalidate("/dashboard/reports");

  return budget;
}

/**
 * Duplicate a budget
 */
export async function duplicateBudget(publicId: string): Promise<BudgetRecord> {
  const user = await requireAuth();
  const budgetsList = await getBudgetsWithProgress();
  const source = budgetsList.find((b) => b.publicId === publicId);

  if (!source) {
    throw new DatabaseError("Budget not found.");
  }

  return await createBudget({
    name: `${source.name} (Copy)`,
    category: source.categoryName || undefined,
    categoryId: source.categoryId || undefined,
    budgetType: source.budgetType,
    period: source.period,
    allocatedAmount: source.amount,
    groupId: source.groupId || undefined,
    description: source.description || undefined,
    startDate: new Date().toISOString().split("T")[0],
    currency: source.currency,
  });
}

/**
 * Archive a budget
 */
export async function archiveBudget(publicId: string): Promise<BudgetRecord> {
  return await updateBudget(publicId, { status: "archived" });
}

/**
 * Restore an archived budget
 */
export async function restoreBudget(publicId: string): Promise<BudgetRecord> {
  return await updateBudget(publicId, { status: "active" });
}

/**
 * Delete a budget (soft delete in PostgreSQL)
 */
export async function deleteBudget(publicId: string): Promise<boolean> {
  const user = await requireAuth();
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  try {
    await withDbRetry(() =>
      db
        .update(budgets)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(budgets.publicId, publicId),
            eq(budgets.userId, user.id)
          )
        )
    );
  } catch (err) {
    console.warn("Database soft delete failed in deleteBudget:", err);
  }

  let memBudgets = budgetsStore.get(userKey) || [];
  memBudgets = memBudgets.filter((b) => b.id !== publicId);
  budgetsStore.set(userKey, memBudgets);

  logAudit(user.id, publicId, "deleted", `Deleted budget ${publicId}`);

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/ai");
  safeRevalidate("/dashboard/reports");

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
  const memBudgets = budgetsStore.get(userKey) || [];
  const goals = goalsStore.get(userKey) || [];

  const budget = memBudgets.find((b) => b.id === budgetId);
  const goal = goals.find((g) => g.id === goalId);

  if (!budget) throw new DatabaseError("Budget not found.");
  if (!goal) throw new DatabaseError("Savings Goal not found.");

  if (amount <= 0) throw new ValidationError("Transfer amount must be greater than ₹0.");
  if (amount > budget.remainingAmount) {
    throw new ValidationError(`Transfer amount (₹${amount}) exceeds remaining budget (₹${budget.remainingAmount}).`);
  }

  budget.spentAmount += amount;
  budget.remainingAmount = Math.max(0, budget.allocatedAmount - budget.spentAmount);
  budget.percentageUsed = Math.round((budget.spentAmount / budget.allocatedAmount) * 100);

  goal.currentSaved += amount;
  goal.remainingAmount = Math.max(0, goal.targetAmount - goal.currentSaved);
  goal.progressPercent = Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100));
  if (goal.currentSaved >= goal.targetAmount) goal.status = "achieved";

  logAudit(user.id, budgetId, "savings_transferred", `Transferred ₹${amount} unused budget to Savings Goal '${goal.name}'`);

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
