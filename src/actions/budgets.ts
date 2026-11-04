"use server";

import { requireAuth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import {
  budgets,
  categories,
  groups,
  groupMembers,
  transactions,
  settlements,
  contacts,
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  BudgetRecord,
  BudgetType,
  BudgetDurationPreset,
  BudgetComputedStatus,
  BudgetIncreaseHistoryItem,
  SavingsGoal,
  SpendingLimit,
  BudgetDashboardMetrics,
  BudgetForecast,
  BudgetAuditLog,
} from "@/lib/types/budgets";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";
import {
  BudgetMetadataPayload,
  parseBudgetMetadata,
  serializeBudgetMetadata,
  calculateBudgetDatesFromPreset,
  computeCountdownText,
} from "@/lib/budget-utils";

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

  // Real-Time Enterprise Budget Intelligence fields
  originalAmount?: number;
  additionalAmount?: number;
  increaseCount?: number;
  increases?: BudgetIncreaseHistoryItem[];
  durationPreset?: BudgetDurationPreset;
  totalDurationDays?: number;
  daysPassed?: number;
  remainingHours?: number;
  remainingWeeks?: number;
  remainingMonths?: number;
  countdownText?: string;
  timelinePercentage?: number;
  computedStatus?: BudgetComputedStatus;
  dailyAllowance?: number;
  expectedRemaining?: number;
  expectedSavings?: number;
  previousExpectedSavings?: number;
  savingsImpact?: number;
  growthPercentage?: number;
  lastExpense?: {
    date: string;
    amount: number;
    title?: string;
  } | null;
  dailySpending?: Array<{ date: string; amount: number; title?: string }>;
  aiInsights?: string[];
  updatedAt?: string;
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
        const now = new Date();
        return memBudgets
          .filter((b) => b.status !== "archived")
          .map((b, idx) => {
            const budgetStart = new Date(b.startDate || now).getTime();
            const budgetEnd = new Date(b.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0)).getTime();
            const totalDays = Math.max(1, Math.ceil((budgetEnd - budgetStart) / 86400000));
            const daysPassed = Math.max(0, Math.min(totalDays, Math.ceil((now.getTime() - budgetStart) / 86400000)));
            const daysRemaining = Math.max(0, Math.ceil((budgetEnd - now.getTime()) / 86400000));
            const remainingDays = daysRemaining;
            const remainingHours = Math.max(0, Math.floor((budgetEnd - now.getTime()) / 3600000));
            const remainingWeeks = Math.floor(daysRemaining / 7);
            const remainingMonths = Number((daysRemaining / 30.4).toFixed(1));
            const timelinePercentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

            const originalAmount = b.originalAmount ?? b.allocatedAmount;
            const additionalAmount = b.additionalAmount ?? 0;
            const increaseCount = b.increaseCount ?? (b.increases?.length || 0);
            const increases = b.increases ?? [];
            const spent = b.spentAmount;
            const amount = b.allocatedAmount;
            const remaining = Math.max(0, amount - spent);
            const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;

            const dailyBurnRate = daysPassed > 0 ? Math.round(spent / daysPassed) : Math.round(spent);
            const dailyBudgetRemaining = daysRemaining > 0 ? Math.round(remaining / daysRemaining) : 0;
            const projectedSpend = Math.round(spent + dailyBurnRate * daysRemaining);
            const expectedRemaining = Math.max(0, amount - projectedSpend);
            const growthPercentage = originalAmount > 0 ? Math.round(((amount - originalAmount) / originalAmount) * 100) : 0;

            let computedStatus: BudgetComputedStatus = "active";
            if (b.status === "paused") computedStatus = "paused";
            else if (b.status === "archived") computedStatus = "cancelled";
            else if (now.getTime() < budgetStart) computedStatus = "upcoming";
            else if (spent > amount) computedStatus = "exceeded";
            else if (now.getTime() > budgetEnd) computedStatus = "completed";
            else if (daysRemaining <= 3 || timelinePercentage >= 85) computedStatus = "ending_soon";

            const countdownText = computeCountdownText(
              computedStatus,
              daysRemaining,
              remainingHours,
              daysPassed,
              totalDays,
              new Date(b.startDate || now),
              new Date(b.endDate || now),
              now
            );

            return {
              id: idx + 1,
              publicId: b.id,
              name: b.name,
              description: b.description,
              amount,
              spent,
              usedAmount: spent,
              remaining,
              remainingAmount: remaining,
              percentage,
              usedPercentage: percentage,
              status: percentage >= 100 ? "exceeded" : percentage >= 75 ? "warning" : "on_track",
              healthStatus: percentage >= 100 ? "exceeded" : percentage >= 75 ? "warning" : "on_track",
              period: (b.period as any) || "monthly",
              budgetType: b.budgetType || "personal",
              startDate: b.startDate || now.toISOString(),
              endDate: b.endDate || new Date().toISOString(),
              remainingDays,
              daysRemaining,
              dailyBudgetRemaining,
              dailyBurnRate,
              projectedSpend,
              isOverBudget: spent > amount,
              originalAmount,
              additionalAmount,
              increaseCount,
              increases,
              durationPreset: b.durationPreset || (b.period as any) || "monthly",
              totalDurationDays: totalDays,
              daysPassed,
              remainingHours,
              remainingWeeks,
              remainingMonths,
              countdownText,
              timelinePercentage,
              computedStatus,
              dailyAllowance: dailyBudgetRemaining,
              expectedRemaining,
              growthPercentage,
              savingsImpact: additionalAmount,
              dailySpending: b.dailySpending || [],
              aiInsights: b.aiInsights || [
                `You have used ${percentage}% of your budget.`,
                `${countdownText} before budget expiry.`,
              ],
            };
          });
      }
      return [];
    }

    // Fetch user ledger transactions to compute dynamic spending and verified income
    const userLedgerTransactions = await withDbRetry(() =>
      db
        .select({
          id: transactions.id,
          categoryId: transactions.categoryId,
          groupId: transactions.groupId,
          date: transactions.date,
          amount: transactions.amount,
          type: transactions.type,
          title: transactions.title,
          description: transactions.description,
          status: transactions.status,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.status} NOT IN ('rejected', 'draft')`
          )
        )
        .orderBy(desc(transactions.date))
    );

    const userExpenses = userLedgerTransactions.filter(
      (tx) => tx.type === "paid" || tx.type === "borrowed"
    );
    const userIncome = userLedgerTransactions.filter((tx) =>
      ["received", "lent", "repaid"].includes(tx.type)
    );
    const totalVerifiedIncome =
      userIncome.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) / 100;

    const now = new Date();

    return dbBudgets.map((b) => {
      const budgetStart = new Date(b.startDate).getTime();
      const budgetEnd = new Date(b.endDate).getTime();
      const nowTime = now.getTime();

      const totalDays = Math.max(1, Math.ceil((budgetEnd - budgetStart) / 86400000));
      const daysPassed = Math.max(0, Math.min(totalDays, Math.ceil((nowTime - budgetStart) / 86400000)));
      const daysRemaining = Math.max(0, Math.ceil((budgetEnd - nowTime) / 86400000));
      const remainingHours = Math.max(0, Math.floor((budgetEnd - nowTime) / 3600000));
      const remainingWeeks = Math.floor(daysRemaining / 7);
      const remainingMonths = Number((daysRemaining / 30.4).toFixed(1));
      const timelinePercentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

      const currentAmount = Number(b.amountPaise) / 100;
      const meta = parseBudgetMetadata(b.notes, currentAmount);
      const originalAmount = meta.originalAmount ?? currentAmount;
      const increases = meta.increases ?? [];
      const additionalAmount = increases.reduce((sum, inc) => sum + inc.addedAmount, 0);
      const increaseCount = increases.length;
      const growthPercentage = originalAmount > 0
        ? Math.round(((currentAmount - originalAmount) / originalAmount) * 100)
        : 0;

      const matchingTxs = userExpenses.filter((tx) => {
        const txTime = new Date(tx.date).getTime();
        if (txTime < budgetStart || txTime > budgetEnd) return false;
        if (b.categoryId && tx.categoryId !== b.categoryId) return false;
        if (b.groupId && tx.groupId !== b.groupId) return false;
        return true;
      });

      const spentPaise = matchingTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const spent = spentPaise / 100;
      const remaining = Math.max(0, currentAmount - spent);
      const percentage = currentAmount > 0 ? Math.round((spent / currentAmount) * 100) : 0;

      const dailyBurnRate = daysPassed > 0 ? Math.round(spent / daysPassed) : Math.round(spent);
      const dailyBudgetRemaining = daysRemaining > 0 ? Math.round(remaining / daysRemaining) : 0;
      const projectedSpend = Math.round(spent + dailyBurnRate * daysRemaining);
      const expectedRemaining = Math.max(0, currentAmount - projectedSpend);
      const isOverBudget = spent > currentAmount;

      const expectedSavings = totalVerifiedIncome > 0 ? Math.max(0, totalVerifiedIncome - currentAmount) : 0;
      const previousExpectedSavings = totalVerifiedIncome > 0 ? Math.max(0, totalVerifiedIncome - originalAmount) : 0;
      const savingsImpact = previousExpectedSavings - expectedSavings;

      const lastExpenseTx = matchingTxs[0] || null;
      const lastExpense = lastExpenseTx
        ? {
            date: new Date(lastExpenseTx.date).toISOString(),
            amount: Number(lastExpenseTx.amount) / 100,
            title: lastExpenseTx.title || lastExpenseTx.description,
          }
        : null;

      const dailySpendMap = new Map<string, number>();
      matchingTxs.forEach((tx) => {
        const dStr = new Date(tx.date).toISOString().split("T")[0];
        dailySpendMap.set(dStr, (dailySpendMap.get(dStr) || 0) + Number(tx.amount || 0) / 100);
      });
      const dailySpending = Array.from(dailySpendMap.entries()).map(([date, amt]) => ({
        date,
        amount: amt,
      }));

      let computedStatus: BudgetComputedStatus = "active";
      if (b.status === "paused") {
        computedStatus = "paused";
      } else if (b.status === "archived") {
        computedStatus = "cancelled";
      } else if (nowTime < budgetStart) {
        computedStatus = "upcoming";
      } else if (spent > currentAmount) {
        computedStatus = "exceeded";
      } else if (nowTime > budgetEnd) {
        computedStatus = "completed";
      } else if (daysRemaining <= 3 || timelinePercentage >= 85) {
        computedStatus = "ending_soon";
      } else {
        computedStatus = "active";
      }

      const countdownText = computeCountdownText(
        computedStatus,
        daysRemaining,
        remainingHours,
        daysPassed,
        totalDays,
        new Date(b.startDate),
        new Date(b.endDate),
        now
      );

      const aiInsights: string[] = [];
      if (matchingTxs.length === 0) {
        aiInsights.push("Not enough verified spending history.");
      } else {
        aiInsights.push(`You have used ${percentage}% of your budget.`);
        aiInsights.push(`${Math.max(0, 100 - percentage)}% of the budget is still available.`);
        aiInsights.push(`${countdownText} before budget expiry.`);
        if (dailyBurnRate > 0) {
          aiInsights.push(`You are spending ₹${dailyBurnRate.toLocaleString("en-IN")}/day.`);
        }
        if (projectedSpend <= currentAmount) {
          aiInsights.push(
            `At your current spending rate you are expected to finish with ₹${expectedRemaining.toLocaleString(
              "en-IN"
            )} remaining.`
          );
        } else {
          const daysUntilExceed =
            dailyBurnRate > 0 ? Math.max(1, Math.floor(remaining / dailyBurnRate)) : 0;
          aiInsights.push(`You are likely to exceed your budget in ${daysUntilExceed} days.`);
        }
        if (increases.length > 0) {
          const lastInc = increases[0];
          const incDate = new Date(lastInc.date);
          const dayDiff = Math.max(1, Math.ceil((incDate.getTime() - budgetStart) / 86400000));
          aiInsights.push(
            `You increased your ${b.name} budget by ₹${lastInc.addedAmount.toLocaleString("en-IN")} on Day ${dayDiff}.`
          );
          if (growthPercentage > 0) {
            aiInsights.push(`Current budget has grown by ${growthPercentage}%.`);
          }
          aiInsights.push(
            `Your remaining daily allowance changed to ₹${dailyBudgetRemaining.toLocaleString("en-IN")}/day.`
          );
        }
      }

      let healthStatus: BudgetProgress["healthStatus"] = "on_track";
      if (percentage >= 100) healthStatus = "exceeded";
      else if (percentage >= (b.alertThreshold || 80)) healthStatus = "warning";

      return {
        id: b.id,
        publicId: b.publicId,
        name: b.name,
        description: b.description,
        amount: currentAmount,
        spent,
        usedAmount: spent,
        remaining,
        remainingAmount: remaining,
        percentage,
        usedPercentage: percentage,
        status: healthStatus,
        healthStatus,
        period: (b.period as any) || "monthly",
        startDate: b.startDate,
        endDate: b.endDate,
        categoryId: b.categoryId,
        categoryName: b.categoryName || (b.categoryId ? "Category" : "General"),
        groupId: b.groupId,
        groupName: b.groupName,
        daysRemaining,
        remainingDays: daysRemaining,
        dailyBurnRate,
        dailyBudgetRemaining,
        projectedSpend,
        isOverBudget,
        alertThreshold: b.alertThreshold,
        notes: meta.userNotes || b.notes || undefined,
        currency: b.currency || "INR",
        originalAmount,
        additionalAmount,
        increaseCount,
        increases,
        durationPreset: meta.durationPreset || (b.period as any) || "monthly",
        totalDurationDays: totalDays,
        daysPassed,
        remainingHours,
        remainingWeeks,
        remainingMonths,
        countdownText,
        timelinePercentage,
        computedStatus,
        dailyAllowance: dailyBudgetRemaining,
        expectedRemaining,
        expectedSavings,
        previousExpectedSavings,
        savingsImpact,
        growthPercentage,
        lastExpense,
        dailySpending,
        aiInsights,
        updatedAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn("Database query failed in getBudgetsWithProgress, falling back to memory store:", err);
    const memBudgets = budgetsStore.get(userKey) || [];
    const now = new Date();
    return memBudgets
      .filter((b) => b.status !== "archived")
      .map((b, idx) => {
        const budgetStart = new Date(b.startDate || now).getTime();
        const budgetEnd = new Date(b.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0)).getTime();
        const totalDays = Math.max(1, Math.ceil((budgetEnd - budgetStart) / 86400000));
        const daysPassed = Math.max(0, Math.min(totalDays, Math.ceil((now.getTime() - budgetStart) / 86400000)));
        const daysRemaining = Math.max(0, Math.ceil((budgetEnd - now.getTime()) / 86400000));
        const remainingDays = daysRemaining;
        const remainingHours = Math.max(0, Math.floor((budgetEnd - now.getTime()) / 3600000));
        const remainingWeeks = Math.floor(daysRemaining / 7);
        const remainingMonths = Number((daysRemaining / 30.4).toFixed(1));
        const timelinePercentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

        const originalAmount = b.originalAmount ?? b.allocatedAmount;
        const additionalAmount = b.additionalAmount ?? 0;
        const increaseCount = b.increaseCount ?? (b.increases?.length || 0);
        const increases = b.increases ?? [];
        const spent = b.spentAmount;
        const amount = b.allocatedAmount;
        const remaining = Math.max(0, amount - spent);
        const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;

        const dailyBurnRate = daysPassed > 0 ? Math.round(spent / daysPassed) : Math.round(spent);
        const dailyBudgetRemaining = daysRemaining > 0 ? Math.round(remaining / daysRemaining) : 0;
        const projectedSpend = Math.round(spent + dailyBurnRate * daysRemaining);
        const expectedRemaining = Math.max(0, amount - projectedSpend);
        const growthPercentage = originalAmount > 0 ? Math.round(((amount - originalAmount) / originalAmount) * 100) : 0;

        let computedStatus: BudgetComputedStatus = "active";
        if (b.status === "paused") computedStatus = "paused";
        else if (b.status === "archived") computedStatus = "cancelled";
        else if (now.getTime() < budgetStart) computedStatus = "upcoming";
        else if (spent > amount) computedStatus = "exceeded";
        else if (now.getTime() > budgetEnd) computedStatus = "completed";
        else if (daysRemaining <= 3 || timelinePercentage >= 85) computedStatus = "ending_soon";

        const countdownText = computeCountdownText(
          computedStatus,
          daysRemaining,
          remainingHours,
          daysPassed,
          totalDays,
          new Date(b.startDate || now),
          new Date(b.endDate || now),
          now
        );

        return {
          id: idx + 1,
          publicId: b.id,
          name: b.name,
          description: b.description,
          amount,
          spent,
          usedAmount: spent,
          remaining,
          remainingAmount: remaining,
          percentage,
          usedPercentage: percentage,
          status: percentage >= 100 ? "exceeded" : percentage >= 75 ? "warning" : "on_track",
          healthStatus: percentage >= 100 ? "exceeded" : percentage >= 75 ? "warning" : "on_track",
          period: (b.period as any) || "monthly",
          startDate: b.startDate,
          endDate: b.endDate || new Date().toISOString(),
          remainingDays,
          daysRemaining,
          dailyBudgetRemaining,
          dailyBurnRate,
          projectedSpend,
          isOverBudget: spent > amount,
          originalAmount,
          additionalAmount,
          increaseCount,
          increases,
          durationPreset: b.durationPreset || (b.period as any) || "monthly",
          totalDurationDays: totalDays,
          daysPassed,
          remainingHours,
          remainingWeeks,
          remainingMonths,
          countdownText,
          timelinePercentage,
          computedStatus,
          dailyAllowance: dailyBudgetRemaining,
          expectedRemaining,
          growthPercentage,
          savingsImpact: additionalAmount,
          dailySpending: b.dailySpending || [],
          aiInsights: b.aiInsights || [
            `You have used ${percentage}% of your budget.`,
            `${countdownText} before budget expiry.`,
          ],
        };
      });
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

  // Verified income and verified expenses
  const verifiedIncome =
    budgetsList[0]?.expectedSavings !== undefined && budgetsList[0]?.amount !== undefined
      ? budgetsList[0].expectedSavings + budgetsList[0].amount
      : 0;
  const verifiedExpenses = totalSpent;
  const currentNetSavings = verifiedIncome - verifiedExpenses;
  const expectedSavings = Math.max(0, verifiedIncome - totalBudgetAllocated);
  const savingsRate = verifiedIncome > 0 ? Math.round((currentNetSavings / verifiedIncome) * 100) : 0;

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

    originalAmount: b.originalAmount ?? b.amount,
    additionalAmount: b.additionalAmount ?? 0,
    increaseCount: b.increaseCount ?? 0,
    increases: b.increases ?? [],
    durationPreset: b.durationPreset ?? "monthly",
    totalDurationDays: b.totalDurationDays ?? 30,
    daysPassed: b.daysPassed ?? 0,
    daysRemaining: b.daysRemaining ?? b.remainingDays,
    remainingHours: b.remainingHours,
    remainingWeeks: b.remainingWeeks,
    remainingMonths: b.remainingMonths,
    countdownText: b.countdownText,
    timelinePercentage: b.timelinePercentage ?? 0,
    computedStatus: b.computedStatus ?? (b.status === "archived" ? "cancelled" : "active"),
    averageDailySpend: b.dailyBurnRate ?? 0,
    dailyAllowance: b.dailyBudgetRemaining ?? 0,
    projectedEndSpend: b.projectedSpend ?? b.spent,
    expectedRemaining: b.expectedRemaining ?? b.remaining,
    expectedSavings: b.expectedSavings ?? expectedSavings,
    previousExpectedSavings: b.previousExpectedSavings,
    savingsImpact: b.savingsImpact ?? 0,
    growthPercentage: b.growthPercentage ?? 0,
    lastExpense: b.lastExpense,
    dailySpending: b.dailySpending,
    aiInsights: b.aiInsights,
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
    verifiedIncome,
    verifiedExpenses,
    currentNetSavings,
    expectedSavings,
    savingsRate,
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
  durationPreset?: BudgetDurationPreset | string;
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
  await assertRateLimit(`budget:create:${user.id}`, RATE_LIMITS.actions.write);
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const finalAmount = data.allocatedAmount ?? data.amount ?? 0;
  if (finalAmount <= 0) {
    throw new ValidationError("Allocated budget amount must be greater than ₹0.");
  }

  const durationPreset = (data.durationPreset as BudgetDurationPreset) || (data.period as any) || "monthly";
  const { startDate: presetStart, endDate: presetEnd, totalDays } = calculateBudgetDatesFromPreset(
    durationPreset,
    data.startDate,
    data.endDate
  );
  const start = data.startDate ? new Date(data.startDate) : presetStart;
  const end = data.endDate ? new Date(data.endDate) : presetEnd;

  if (end.getTime() < start.getTime()) {
    throw new ValidationError("End date cannot be earlier than start date.");
  }

  if (data.groupId) {
    const targetGroupId = data.groupId;
    try {
      const [membership] = await withDbRetry(() =>
        db
          .select({ id: groupMembers.id })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, targetGroupId),
              eq(groupMembers.userId, user.id)
            )
          )
          .limit(1)
      );
      if (!membership) {
        const [ownedGroup] = await withDbRetry(() =>
          db
            .select({ id: groups.id })
            .from(groups)
            .where(and(eq(groups.id, targetGroupId), eq(groups.createdBy, user.id), eq(groups.isDeleted, false)))
            .limit(1)
        );
        if (!ownedGroup) {
          throw new ValidationError("You do not have access to the specified group.");
        }
      }
    } catch (gErr: any) {
      if (gErr instanceof ValidationError) throw gErr;
    }
  }

  const budgetId = generatePublicId("bud");
  const amountPaise = Math.round(finalAmount * 100);

  const sanitizedName = sanitizeText(data.name.trim());
  const sanitizedDesc = data.description ? sanitizeText(data.description) : (data.notes ? sanitizeText(data.notes) : null);
  const rawUserNotes = data.notes ? sanitizeText(data.notes) : (data.description ? sanitizeText(data.description) : "");
  const serializedNotes = serializeBudgetMetadata(
    finalAmount,
    [],
    rawUserNotes,
    durationPreset
  );
  const sanitizedCategory = data.category ? sanitizeText(data.category) : "General";

  // Insert directly into PostgreSQL database
  try {
    await withDbRetry(() =>
      db.insert(budgets).values({
        publicId: budgetId,
        userId: user.id,
        name: sanitizedName,
        description: sanitizedDesc,
        amount: amountPaise,
        currency: data.currency || "INR",
        period: (data.period as any) || (durationPreset === "quarterly" || durationPreset === "half_yearly" ? "custom" : durationPreset),
        startDate: start,
        endDate: end,
        alertThreshold: data.alertThreshold || 80,
        categoryId: data.categoryId || null,
        groupId: data.groupId || null,
        status: "active",
        notes: serializedNotes,
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
    name: sanitizedName,
    description: sanitizedDesc || undefined,
    category: sanitizedCategory,
    budgetType: data.budgetType || "personal",
    period: (data.period as BudgetRecord["period"]) || "monthly",
    allocatedAmount: finalAmount,
    spentAmount: 0,
    remainingAmount: finalAmount,
    percentageUsed: 0,
    currency: data.currency || "INR",
    status: "active",
    priority: data.priority || "medium",
    tags: data.tags ? data.tags.map(t => sanitizeText(t)) : [],
    notes: serializedNotes,
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
    originalAmount: finalAmount,
    additionalAmount: 0,
    increaseCount: 0,
    increases: [],
    durationPreset,
    totalDurationDays: totalDays,
    daysPassed: 0,
    daysRemaining: totalDays,
    timelinePercentage: 0,
    computedStatus: "active",
    dailyAllowance: Math.round(finalAmount / totalDays),
    averageDailySpend: 0,
    projectedEndSpend: finalAmount,
    expectedRemaining: finalAmount,
    growthPercentage: 0,
    savingsImpact: 0,
    lastExpense: null,
    dailySpending: [],
    aiInsights: ["Not enough verified spending history."],
  };

  const currentStore = budgetsStore.get(userKey) || [];
  currentStore.push(newBudget);
  budgetsStore.set(userKey, currentStore);

  logAudit(user.id, budgetId, "created", `Created budget '${data.name}' with ₹${finalAmount}`);

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/budgets");
  safeRevalidate("/dashboard/ai");
  safeRevalidate("/dashboard/reports");

  return newBudget;
}

/**
 * Increase an active budget without losing original history
 */
export async function increaseBudget(data: {
  budgetId: string;
  additionalAmount: number;
  effectiveDate?: string;
  reason?: string;
  notes?: string;
}): Promise<BudgetRecord> {
  const user = await requireAuth();
  await assertRateLimit(`budget:increase:${user.id}`, RATE_LIMITS.actions.write);
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  if (!data.additionalAmount || data.additionalAmount <= 0) {
    throw new ValidationError("Additional budget amount must be greater than ₹0.");
  }

  // 1. Fetch current budget from DB
  let dbBudget: any = null;
  try {
    const [found] = await withDbRetry(() =>
      db
        .select()
        .from(budgets)
        .where(and(eq(budgets.publicId, data.budgetId), eq(budgets.userId, user.id)))
        .limit(1)
    );
    dbBudget = found;
  } catch (err) {
    console.warn("DB query in increaseBudget fallback to memory:", err);
  }

  const memBudgets = budgetsStore.get(userKey) || [];
  const memBudget = memBudgets.find((b) => b.id === data.budgetId);

  if (!dbBudget && !memBudget) {
    throw new DatabaseError("Budget not found.");
  }

  const previousAmount = dbBudget ? Number(dbBudget.amount) / 100 : (memBudget?.allocatedAmount || 0);
  const updatedAmount = previousAmount + data.additionalAmount;
  const rawNotes = dbBudget ? dbBudget.notes : memBudget?.notes;
  const meta = parseBudgetMetadata(rawNotes, memBudget?.originalAmount || previousAmount);

  const endDate = dbBudget
    ? new Date(dbBudget.endDate)
    : memBudget?.endDate
    ? new Date(memBudget.endDate)
    : new Date();
  const now = new Date();
  const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));

  const newIncrease: BudgetIncreaseHistoryItem = {
    id: generatePublicId("binc"),
    date: data.effectiveDate || new Date().toISOString(),
    previousBudget: previousAmount,
    addedAmount: data.additionalAmount,
    updatedBudget: updatedAmount,
    remainingDays,
    reason: data.reason ? sanitizeText(data.reason) : undefined,
    notes: data.notes ? sanitizeText(data.notes) : undefined,
    performedBy: user.name || user.email || "You",
    time: new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
  };

  meta.increases.unshift(newIncrease);
  if (!meta.originalAmount || meta.originalAmount === 0) {
    meta.originalAmount = previousAmount;
  }

  const serializedNotes = serializeBudgetMetadata(
    meta.originalAmount,
    meta.increases,
    meta.userNotes,
    meta.durationPreset
  );

  // 2. Update DB
  if (dbBudget) {
    try {
      await withDbRetry(() =>
        db
          .update(budgets)
          .set({
            amount: Math.round(updatedAmount * 100),
            notes: serializedNotes,
            updatedAt: new Date(),
          })
          .where(and(eq(budgets.publicId, data.budgetId), eq(budgets.userId, user.id)))
      );
    } catch (dbErr) {
      console.warn("DB update in increaseBudget failed:", dbErr);
    }
  }

  // 3. Update memory store
  if (memBudget) {
    memBudget.allocatedAmount = updatedAmount;
    memBudget.remainingAmount = Math.max(0, updatedAmount - memBudget.spentAmount);
    memBudget.percentageUsed = updatedAmount > 0 ? Math.round((memBudget.spentAmount / updatedAmount) * 100) : 0;
    memBudget.originalAmount = meta.originalAmount;
    memBudget.additionalAmount = (memBudget.additionalAmount || 0) + data.additionalAmount;
    memBudget.increaseCount = meta.increases.length;
    memBudget.increases = meta.increases;
    memBudget.notes = serializedNotes;
    memBudget.updatedAt = new Date().toISOString();
  }

  logAudit(
    user.id,
    data.budgetId,
    "updated",
    `Increased budget from ₹${previousAmount} to ₹${updatedAmount} (+₹${data.additionalAmount})`
  );

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/budgets");
  safeRevalidate("/dashboard/ai");
  safeRevalidate("/dashboard/reports");

  const summary = await getBudgetDashboardSummary();
  const updatedRecord = summary.budgets.find((b) => b.id === data.budgetId);
  if (updatedRecord) return updatedRecord;

  return {
    id: data.budgetId,
    userId: user.id,
    name: dbBudget?.name || memBudget?.name || "Budget",
    category: dbBudget?.categoryName || memBudget?.category || "General",
    budgetType: (dbBudget?.period || memBudget?.budgetType || "personal") as any,
    period: (dbBudget?.period || memBudget?.period || "monthly") as any,
    allocatedAmount: updatedAmount,
    spentAmount: memBudget?.spentAmount || 0,
    remainingAmount: Math.max(0, updatedAmount - (memBudget?.spentAmount || 0)),
    percentageUsed: memBudget?.percentageUsed || 0,
    currency: "INR",
    status: "active",
    originalAmount: meta.originalAmount,
    additionalAmount: meta.increases.reduce((s, i) => s + i.addedAmount, 0),
    increaseCount: meta.increases.length,
    increases: meta.increases,
    startDate: dbBudget?.startDate?.toISOString() || memBudget?.startDate || new Date().toISOString(),
    endDate: dbBudget?.endDate?.toISOString() || memBudget?.endDate,
    alertThresholds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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
  await assertRateLimit(`budget:update:${user.id}`, RATE_LIMITS.actions.write);
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  const newAmount = data.amount ?? data.allocatedAmount;
  const amountPaise = newAmount !== undefined ? Math.round(newAmount * 100) : undefined;

  const sanitizedName = data.name ? sanitizeText(data.name.trim()) : undefined;
  const sanitizedDesc = data.description !== undefined ? sanitizeText(data.description) : undefined;
  const sanitizedNotes = data.notes !== undefined ? sanitizeText(data.notes) : undefined;
  const sanitizedCategory = data.category ? sanitizeText(data.category) : undefined;

  if (data.groupId) {
    const targetGroupId = data.groupId;
    try {
      const [membership] = await withDbRetry(() =>
        db
          .select({ id: groupMembers.id })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, targetGroupId),
              eq(groupMembers.userId, user.id)
            )
          )
          .limit(1)
      );
      if (!membership) {
        const [ownedGroup] = await withDbRetry(() =>
          db
            .select({ id: groups.id })
            .from(groups)
            .where(and(eq(groups.id, targetGroupId), eq(groups.createdBy, user.id), eq(groups.isDeleted, false)))
            .limit(1)
        );
        if (!ownedGroup) {
          throw new ValidationError("You do not have access to the specified group.");
        }
      }
    } catch (gErr: any) {
      if (gErr instanceof ValidationError) throw gErr;
    }
  }

  try {
    await withDbRetry(() =>
      db
        .update(budgets)
        .set({
          name: sanitizedName,
          description: sanitizedDesc,
          amount: amountPaise,
          period: data.period ? (data.period as any) : undefined,
          categoryId: data.categoryId !== undefined ? (data.categoryId || null) : undefined,
          groupId: data.groupId !== undefined ? (data.groupId || null) : undefined,
          alertThreshold: data.alertThreshold !== undefined ? data.alertThreshold : undefined,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          notes: sanitizedNotes,
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
      name: sanitizedName || "Budget",
      category: sanitizedCategory || "General",
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
    if (sanitizedName) budget.name = sanitizedName;
    if (sanitizedDesc !== undefined) budget.description = sanitizedDesc;
    if (sanitizedCategory) budget.category = sanitizedCategory;
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
  await assertRateLimit(`budget:duplicate:${user.id}`, RATE_LIMITS.actions.write);
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
  await assertRateLimit(`budget:delete:${user.id}`, RATE_LIMITS.actions.delete);
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
  await assertRateLimit(`budget:transfer:${user.id}`, RATE_LIMITS.actions.write);
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
  await assertRateLimit(`savings_goal:create:${user.id}`, RATE_LIMITS.actions.write);
  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;

  if (data.targetAmount <= 0) {
    throw new ValidationError("Target amount must be greater than ₹0.");
  }

  const goal: SavingsGoal = {
    id: generatePublicId("goal"),
    userId: user.id,
    name: sanitizeText(data.name),
    targetAmount: data.targetAmount,
    currentSaved: 0,
    remainingAmount: data.targetAmount,
    progressPercent: 0,
    targetDate: data.targetDate,
    priority: data.priority,
    category: sanitizeText(data.category),
    currency: "INR",
    status: "in_progress",
    notes: data.notes ? sanitizeText(data.notes) : undefined,
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
  await assertRateLimit(`savings_goal:contrib:${user.id}`, RATE_LIMITS.actions.write);
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
  await assertRateLimit(`spending_limit:set:${user.id}`, RATE_LIMITS.actions.write);

  if (!data.limitAmount || data.limitAmount <= 0) {
    throw new ValidationError("Limit amount must be greater than ₹0.");
  }

  if (data.groupId) {
    const targetGroupId = data.groupId;
    try {
      const [membership] = await withDbRetry(() =>
        db
          .select({ id: groupMembers.id })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, targetGroupId),
              eq(groupMembers.userId, user.id)
            )
          )
          .limit(1)
      );
      if (!membership) {
        const [ownedGroup] = await withDbRetry(() =>
          db
            .select({ id: groups.id })
            .from(groups)
            .where(and(eq(groups.id, targetGroupId), eq(groups.createdBy, user.id), eq(groups.isDeleted, false)))
            .limit(1)
        );
        if (!ownedGroup) {
          throw new ValidationError("You do not have access to the specified group.");
        }
      }
    } catch (gErr: any) {
      if (gErr instanceof ValidationError) throw gErr;
    }
  }

  ensureUserStores(user.id);
  const userKey = `user_${user.id}`;
  const limits = limitsStore.get(userKey) || [];

  const category = data.category ? sanitizeText(data.category) : undefined;
  let limit = limits.find((l) => l.period === data.period && l.category === category);
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
      category,
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
  await assertRateLimit(`spending_limit:delete:${user.id}`, RATE_LIMITS.actions.delete);
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
