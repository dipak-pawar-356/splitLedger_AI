"use server";

import { db } from "@/lib/db";
import { 
  transactions, 
  categories, 
  contacts, 
  groups, 
  settlements, 
  groupMembers, 
  expenseSplits,
  users,
  auditLogs
} from "@/lib/db/schema/schema";
import { eq, desc, and, sql, gte, lte, or, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { DatabaseError } from "@/lib/errors";

export interface AnalyticsFilterOptions {
  period?: 
    | "today" 
    | "yesterday" 
    | "this_week" 
    | "last_week" 
    | "this_month" 
    | "last_month" 
    | "3m" 
    | "6m" 
    | "1y" 
    | "custom" 
    | "all";
  startDate?: string | Date;
  endDate?: string | Date;
  groupId?: number;
  categoryId?: number;
  contactId?: number;
  paymentMethod?: string;
  type?: string;
  status?: string;
}

export interface FinancialAnalyticsData {
  summary: {
    totalIncome: number; // in rupees
    totalExpenses: number; // in rupees
    netSavings: number; // in rupees
    totalReceivable: number; // in rupees
    totalPayable: number; // in rupees
    personalExpenses: number; // in rupees
    groupExpenses: number; // in rupees
    pendingSettlementsAmount: number; // in rupees
    pendingSettlementsCount: number;
    completedSettlementsAmount: number; // in rupees
    activeGroupsCount: number;
    totalMembersCount: number;
    averageMonthlySpending: number; // in rupees
    averageMonthlyIncome: number; // in rupees
    lastUpdated: Date;
    trends: {
      incomeChangePct: number;
      expenseChangePct: number;
      savingsChangePct: number;
      personalExpenseChangePct: number;
      groupExpenseChangePct: number;
    };
  };
  dateComparison: {
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    currentIncome: number;
    previousIncome: number;
    incomeDiff: number;
    incomeGrowthPct: number;
    currentExpense: number;
    previousExpense: number;
    expenseDiff: number;
    expenseGrowthPct: number;
    currentSavings: number;
    previousSavings: number;
    savingsDiff: number;
    savingsGrowthPct: number;
  };
  charts: {
    monthlyExpenseTrend: Array<{ month: string; expense: number }>;
    monthlyIncomeTrend: Array<{ month: string; income: number }>;
    incomeVsExpense: Array<{ month: string; income: number; expense: number; savings: number }>;
    netSavingsTrend: Array<{ month: string; savings: number }>;
    personalVsGroup: Array<{ month: string; personal: number; group: number }>;
    settlementStatus: Array<{ name: string; value: number; count: number }>;
    groupSpending: Array<{ name: string; value: number }>;
    memberContribution: Array<{ name: string; amount: number; percentage: number }>;
    categorySpending: Array<{ name: string; value: number; count: number; percentage: number }>;
    paymentMethodDistribution: Array<{ name: string; amount: number; count: number }>;
  };
  monthlyTrends: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    totalTransactions: number;
    averageDailyExpense: number;
    averageWeeklyExpense: number;
    highestSpendingDay: { date: string; amount: number } | null;
    lowestSpendingDay: { date: string; amount: number } | null;
    highestIncomeDay: { date: string; amount: number } | null;
    mostActiveMonth: { month: string; count: number } | null;
  };
  spendingInsights: {
    topCategories: Array<{ name: string; amount: number; percentage: number }>;
    topGroups: Array<{ name: string; amount: number }>;
    mostExpensiveTransaction: { title: string; amount: number; date: Date | string; category: string } | null;
    mostFrequentCategory: { name: string; count: number } | null;
    highestExpenseCurrentPeriod: { title: string; amount: number } | null;
    lowestExpenseCurrentPeriod: { title: string; amount: number } | null;
    largestGroupExpense: { title: string; amount: number; groupName: string } | null;
    largestPersonalExpense: { title: string; amount: number } | null;
    averageExpensePerTransaction: number;
    averageGroupExpense: number;
    averagePersonalExpense: number;
    monthlyExpenseGrowthPct: number;
    dailySpendingAverage: number;
    weeklySpendingAverage: number;
  };
  categoryAnalytics: Array<{
    id: number;
    name: string;
    totalExpense: number;
    transactionCount: number;
    averageExpense: number;
    highestExpense: number;
    lowestExpense: number;
    percentageOfTotal: number;
    previousPeriodExpense: number;
    growthPct: number;
    topGroup?: string | null;
  }>;
  personalVsGroup: {
    totalPersonalExpenses: number;
    totalGroupExpenses: number;
    personalIncome: number;
    groupContributions: number;
    averagePersonalExpense: number;
    averageGroupExpense: number;
    mostActiveGroup: string | null;
    mostActivePersonalCategory: string | null;
    contributionRatio: number; // Percentage
  };
  recentActivity: Array<{
    id: number;
    action: string;
    entityType: string;
    entityPublicId?: string | null;
    userName: string;
    reason?: string | null;
    date: Date;
  }>;
}

/**
 * SECTION 1–15: Financial Analytics Comprehensive Query Engine
 */
export async function getComprehensiveAnalytics(
  filters: AnalyticsFilterOptions = {}
): Promise<FinancialAnalyticsData> {
  try {
    const user = await requireAuth();

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let prevStartDate: Date;
    let prevEndDate: Date;
    let currentPeriodLabel = "All Time";
    let previousPeriodLabel = "Previous Period";

    const period = filters.period || "this_month";

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      currentPeriodLabel = "Today";
      previousPeriodLabel = "Yesterday";
    } else if (period === "yesterday") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59);
      currentPeriodLabel = "Yesterday";
      previousPeriodLabel = "Day Before Yesterday";
    } else if (period === "this_week") {
      const day = now.getDay() || 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime() - 1000);
      currentPeriodLabel = "This Week";
      previousPeriodLabel = "Last Week";
    } else if (period === "last_week") {
      const day = now.getDay() || 7;
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 23, 59, 59);
      startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime() - 1000);
      currentPeriodLabel = "Last Week";
      previousPeriodLabel = "2 Weeks Ago";
    } else if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      currentPeriodLabel = "Last Month";
      previousPeriodLabel = "Month Before Last";
    } else if (period === "3m") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      prevEndDate = new Date(startDate.getTime() - 1000);
      currentPeriodLabel = "Last 3 Months";
      previousPeriodLabel = "Prior 3 Months";
    } else if (period === "6m") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      prevEndDate = new Date(startDate.getTime() - 1000);
      currentPeriodLabel = "Last 6 Months";
      previousPeriodLabel = "Prior 6 Months";
    } else if (period === "1y") {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      prevStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      prevEndDate = new Date(startDate.getTime() - 1000);
      currentPeriodLabel = "Last 12 Months";
      previousPeriodLabel = "Prior 12 Months";
    } else if (period === "custom" && filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      const span = endDate.getTime() - startDate.getTime();
      prevStartDate = new Date(startDate.getTime() - span);
      prevEndDate = new Date(startDate.getTime() - 1000);
      currentPeriodLabel = "Custom Period";
      previousPeriodLabel = "Previous Period";
    } else if (period === "all") {
      startDate = new Date(2020, 0, 1);
      prevStartDate = new Date(2019, 0, 1);
      prevEndDate = new Date(2019, 11, 31);
      currentPeriodLabel = "All Time";
      previousPeriodLabel = "Pre-2020";
    } else {
      // Default: this_month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      currentPeriodLabel = "This Month";
      previousPeriodLabel = "Last Month";
    }

    // Base conditions
    const baseCurrentConditions = [
      eq(transactions.isDeleted, false),
      or(
        eq(transactions.userId, user.id),
        eq(transactions.createdBy, user.id),
        sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
      ),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
    ];

    const basePrevConditions = [
      eq(transactions.isDeleted, false),
      or(
        eq(transactions.userId, user.id),
        eq(transactions.createdBy, user.id),
        sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
      ),
      gte(transactions.date, prevStartDate),
      lte(transactions.date, prevEndDate),
    ];

    if (filters.groupId) {
      baseCurrentConditions.push(eq(transactions.groupId, filters.groupId));
      basePrevConditions.push(eq(transactions.groupId, filters.groupId));
    }
    if (filters.categoryId) {
      baseCurrentConditions.push(eq(transactions.categoryId, filters.categoryId));
      basePrevConditions.push(eq(transactions.categoryId, filters.categoryId));
    }
    if (filters.contactId) {
      baseCurrentConditions.push(eq(transactions.contactId, filters.contactId));
      basePrevConditions.push(eq(transactions.contactId, filters.contactId));
    }
    if (filters.paymentMethod) {
      baseCurrentConditions.push(eq(transactions.paymentMethod, filters.paymentMethod));
      basePrevConditions.push(eq(transactions.paymentMethod, filters.paymentMethod));
    }

    // Parallel Batch Aggregations
    const [
      currentSummaryRaw,
      prevSummaryRaw,
      monthlySeriesRaw,
      categoryBreakdownRaw,
      prevCategoryBreakdownRaw,
      groupBreakdownRaw,
      paymentMethodRaw,
      settlementStatusRaw,
      dailyBreakdownRaw,
      personalVsGroupRaw,
      allSettlementsSummaryRaw,
      activeGroupsCountRaw,
      recentActivityRaw,
    ] = await Promise.all([
      // 1. Current Period Totals
      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          personalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') AND ${transactions.groupId} IS NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
          groupExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') AND ${transactions.groupId} IS NOT NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(and(...baseCurrentConditions)),

      // 2. Previous Period Totals (for comparison & % change)
      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          personalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') AND ${transactions.groupId} IS NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
          groupExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') AND ${transactions.groupId} IS NOT NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(and(...basePrevConditions)),

      // 3. 12-Month Historical Series for Trend Charts
      db
        .select({
          month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          personal: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') AND ${transactions.groupId} IS NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
          group: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') AND ${transactions.groupId} IS NOT NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.isDeleted, false),
            or(
              eq(transactions.userId, user.id),
              eq(transactions.createdBy, user.id),
              sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
            ),
            gte(transactions.date, new Date(now.getFullYear(), now.getMonth() - 11, 1))
          )
        )
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`),

      // 4. Current Period Category Breakdown
      db
        .select({
          categoryId: categories.id,
          categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
          maxAmount: sql<number>`COALESCE(MAX(${transactions.amount}), 0)`,
          minAmount: sql<number>`COALESCE(MIN(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            ...baseCurrentConditions,
            sql`${transactions.type} IN ('paid', 'borrowed')`
          )
        )
        .groupBy(categories.id, categories.name)
        .orderBy(sql`SUM(${transactions.amount}) DESC`),

      // 5. Previous Period Category Breakdown
      db
        .select({
          categoryId: categories.id,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            ...basePrevConditions,
            sql`${transactions.type} IN ('paid', 'borrowed')`
          )
        )
        .groupBy(categories.id),

      // 6. Group Spending Breakdown
      db
        .select({
          groupName: groups.name,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .innerJoin(groups, eq(transactions.groupId, groups.id))
        .where(and(...baseCurrentConditions))
        .groupBy(groups.id, groups.name)
        .orderBy(sql`SUM(${transactions.amount}) DESC`)
        .limit(8),

      // 7. Payment Method Usage
      db
        .select({
          method: sql<string>`COALESCE(${transactions.paymentMethod}, 'UPI')`,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(and(...baseCurrentConditions))
        .groupBy(transactions.paymentMethod)
        .orderBy(sql`SUM(${transactions.amount}) DESC`),

      // 8. Settlement Status Donut
      db
        .select({
          status: settlements.status,
          totalAmount: sql<number>`COALESCE(SUM(${settlements.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(settlements)
        .where(
          and(
            eq(settlements.isDeleted, false),
            or(
              eq(settlements.fromUserId, user.id),
              eq(settlements.toUserId, user.id)
            )
          )
        )
        .groupBy(settlements.status),

      // 9. Daily Spending Breakdown (for velocity & peak days)
      db
        .select({
          day: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM-DD')`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(and(...baseCurrentConditions))
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM-DD')`),

      // 10. Personal vs Group Specific Aggregates
      db
        .select({
          personalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') AND ${transactions.groupId} IS NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
          groupIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') AND ${transactions.groupId} IS NOT NULL THEN ${transactions.amount} ELSE 0 END), 0)`,
          personalExpenseCount: sql<number>`COUNT(CASE WHEN ${transactions.groupId} IS NULL THEN 1 END)`,
          groupExpenseCount: sql<number>`COUNT(CASE WHEN ${transactions.groupId} IS NOT NULL THEN 1 END)`,
        })
        .from(transactions)
        .where(and(...baseCurrentConditions)),

      // 11. Settlements Totals (Receivable, Payable, Pending, Completed)
      db
        .select({
          receivable: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.toUserId} = ${user.id} AND ${settlements.status} = 'pending' THEN ${settlements.amount} ELSE 0 END), 0)`,
          payable: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.fromUserId} = ${user.id} AND ${settlements.status} = 'pending' THEN ${settlements.amount} ELSE 0 END), 0)`,
          pendingCount: sql<number>`COUNT(CASE WHEN ${settlements.status} = 'pending' THEN 1 END)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.status} = 'pending' THEN ${settlements.amount} ELSE 0 END), 0)`,
          completedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.status} = 'completed' THEN ${settlements.amount} ELSE 0 END), 0)`,
        })
        .from(settlements)
        .where(
          and(
            eq(settlements.isDeleted, false),
            or(
              eq(settlements.fromUserId, user.id),
              eq(settlements.toUserId, user.id)
            )
          )
        ),

      // 12. Active Groups & Members Count
      db
        .select({
          groupCount: sql<number>`COUNT(DISTINCT ${groups.id})`,
          memberCount: sql<number>`(SELECT COUNT(DISTINCT user_id) FROM group_members WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = ${user.id}))`,
        })
        .from(groups)
        .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
        .where(
          and(
            eq(groupMembers.userId, user.id),
            eq(groups.isDeleted, false),
            eq(groups.isActive, true)
          )
        ),

      // 13. Recent Audit Stream
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityPublicId: auditLogs.entityPublicId,
          reason: auditLogs.reason,
          createdAt: auditLogs.createdAt,
          userName: users.name,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(auditLogs.userId, user.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(6),
    ]);

    // Current & Previous Financial Figures
    const currentIncome = (currentSummaryRaw[0]?.income || 0) / 100;
    const currentExpense = (currentSummaryRaw[0]?.expense || 0) / 100;
    const currentPersonalExpense = (currentSummaryRaw[0]?.personalExpense || 0) / 100;
    const currentGroupExpense = (currentSummaryRaw[0]?.groupExpense || 0) / 100;
    const currentSavings = currentIncome - currentExpense;

    const prevIncome = (prevSummaryRaw[0]?.income || 0) / 100;
    const prevExpense = (prevSummaryRaw[0]?.expense || 0) / 100;
    const prevPersonalExpense = (prevSummaryRaw[0]?.personalExpense || 0) / 100;
    const prevGroupExpense = (prevSummaryRaw[0]?.groupExpense || 0) / 100;
    const prevSavings = prevIncome - prevExpense;

    const calcGrowth = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const incomeChangePct = calcGrowth(currentIncome, prevIncome);
    const expenseChangePct = calcGrowth(currentExpense, prevExpense);
    const savingsChangePct = calcGrowth(currentSavings, prevSavings);
    const personalExpenseChangePct = calcGrowth(currentPersonalExpense, prevPersonalExpense);
    const groupExpenseChangePct = calcGrowth(currentGroupExpense, prevGroupExpense);

    // Date Comparison Section 8
    const dateComparison = {
      currentPeriodLabel,
      previousPeriodLabel,
      currentIncome,
      previousIncome: prevIncome,
      incomeDiff: currentIncome - prevIncome,
      incomeGrowthPct: incomeChangePct,
      currentExpense,
      previousExpense: prevExpense,
      expenseDiff: currentExpense - prevExpense,
      expenseGrowthPct: expenseChangePct,
      currentSavings,
      previousSavings: prevSavings,
      savingsDiff: currentSavings - prevSavings,
      savingsGrowthPct: savingsChangePct,
    };

    // 12-Month Series Formatting
    const monthlyExpenseTrend = monthlySeriesRaw.map((m) => ({
      month: m.month,
      expense: Number(m.expense) / 100,
    }));

    const monthlyIncomeTrend = monthlySeriesRaw.map((m) => ({
      month: m.month,
      income: Number(m.income) / 100,
    }));

    const incomeVsExpense = monthlySeriesRaw.map((m) => {
      const inc = Number(m.income) / 100;
      const exp = Number(m.expense) / 100;
      return {
        month: m.month,
        income: inc,
        expense: exp,
        savings: inc - exp,
      };
    });

    const netSavingsTrend = incomeVsExpense.map((m) => ({
      month: m.month,
      savings: m.savings,
    }));

    const personalVsGroup = monthlySeriesRaw.map((m) => ({
      month: m.month,
      personal: Number(m.personal) / 100,
      group: Number(m.group) / 100,
    }));

    // Category Spending Formatting
    const categorySpending = categoryBreakdownRaw.map((c) => {
      const amt = Number(c.totalAmount) / 100;
      const pct = currentExpense > 0 ? Math.round((amt / currentExpense) * 100) : 0;
      return {
        name: c.categoryName,
        value: amt,
        count: Number(c.count),
        percentage: pct,
      };
    });

    // Daily & Weekly Spending Velocity
    const dayCount = Math.max(1, dailyBreakdownRaw.length);
    const totalDailyExpenses = dailyBreakdownRaw.reduce((sum, d) => sum + Number(d.expense) / 100, 0);
    const averageDailyExpense = Math.round(totalDailyExpenses / dayCount);
    const averageWeeklyExpense = Math.round(averageDailyExpense * 7);

    let highestDay: any = null;
    let lowestDay: any = null;
    let highestIncomeDay: any = null;

    if (dailyBreakdownRaw.length > 0) {
      const sortedByExpense = [...dailyBreakdownRaw].sort((a, b) => Number(b.expense) - Number(a.expense));
      const sortedByIncome = [...dailyBreakdownRaw].sort((a, b) => Number(b.income) - Number(a.income));

      if (sortedByExpense[0] && Number(sortedByExpense[0].expense) > 0) {
        highestDay = { date: sortedByExpense[0].day, amount: Number(sortedByExpense[0].expense) / 100 };
      }
      const validLowest = sortedByExpense.filter((d) => Number(d.expense) > 0);
      if (validLowest.length > 0) {
        lowestDay = { date: validLowest[validLowest.length - 1].day, amount: Number(validLowest[validLowest.length - 1].expense) / 100 };
      }
      if (sortedByIncome[0] && Number(sortedByIncome[0].income) > 0) {
        highestIncomeDay = { date: sortedByIncome[0].day, amount: Number(sortedByIncome[0].income) / 100 };
      }
    }

    // Most active month
    const sortedMonthsByCount = [...monthlySeriesRaw].sort((a, b) => Number(b.count) - Number(a.count));
    const mostActiveMonth = sortedMonthsByCount.length > 0 && Number(sortedMonthsByCount[0].count) > 0
      ? { month: sortedMonthsByCount[0].month, count: Number(sortedMonthsByCount[0].count) }
      : null;

    // Spending Insights Top Categories & Groups
    const topCategories = categorySpending.slice(0, 5).map((c) => ({
      name: c.name,
      amount: c.value,
      percentage: c.percentage,
    }));

    const topGroups = groupBreakdownRaw.map((g) => ({
      name: g.groupName,
      amount: Number(g.totalAmount) / 100,
    }));

    // Previous category lookup map
    const prevCatMap = new Map<number, number>();
    prevCategoryBreakdownRaw.forEach((pc) => {
      if (pc.categoryId) prevCatMap.set(pc.categoryId, Number(pc.totalAmount) / 100);
    });

    const categoryAnalytics = categoryBreakdownRaw.map((c) => {
      const amt = Number(c.totalAmount) / 100;
      const count = Number(c.count);
      const avg = count > 0 ? amt / count : 0;
      const prevAmt = c.categoryId ? (prevCatMap.get(c.categoryId) || 0) : 0;
      const growth = calcGrowth(amt, prevAmt);
      const pct = currentExpense > 0 ? Math.round((amt / currentExpense) * 100) : 0;

      return {
        id: c.categoryId || 0,
        name: c.categoryName,
        totalExpense: amt,
        transactionCount: count,
        averageExpense: avg,
        highestExpense: Number(c.maxAmount) / 100,
        lowestExpense: Number(c.minAmount) / 100,
        percentageOfTotal: pct,
        previousPeriodExpense: prevAmt,
        growthPct: growth,
      };
    });

    // Personal vs Group metrics
    const personalCount = Number(personalVsGroupRaw[0]?.personalExpenseCount || 0);
    const groupCount = Number(personalVsGroupRaw[0]?.groupExpenseCount || 0);
    const avgPersonal = personalCount > 0 ? currentPersonalExpense / personalCount : 0;
    const avgGroup = groupCount > 0 ? currentGroupExpense / groupCount : 0;
    const totalExp = currentPersonalExpense + currentGroupExpense;
    const contributionRatio = totalExp > 0 ? Math.round((currentGroupExpense / totalExp) * 100) : 0;

    const avgMonthlySpending = monthlySeriesRaw.length > 0 
      ? monthlySeriesRaw.reduce((sum, m) => sum + Number(m.expense) / 100, 0) / monthlySeriesRaw.length 
      : currentExpense;

    const avgMonthlyIncome = monthlySeriesRaw.length > 0 
      ? monthlySeriesRaw.reduce((sum, m) => sum + Number(m.income) / 100, 0) / monthlySeriesRaw.length 
      : currentIncome;

    return {
      summary: {
        totalIncome: currentIncome,
        totalExpenses: currentExpense,
        netSavings: currentSavings,
        totalReceivable: (allSettlementsSummaryRaw[0]?.receivable || 0) / 100,
        totalPayable: (allSettlementsSummaryRaw[0]?.payable || 0) / 100,
        personalExpenses: currentPersonalExpense,
        groupExpenses: currentGroupExpense,
        pendingSettlementsAmount: (allSettlementsSummaryRaw[0]?.pendingAmount || 0) / 100,
        pendingSettlementsCount: Number(allSettlementsSummaryRaw[0]?.pendingCount || 0),
        completedSettlementsAmount: (allSettlementsSummaryRaw[0]?.completedAmount || 0) / 100,
        activeGroupsCount: Number(activeGroupsCountRaw[0]?.groupCount || 0),
        totalMembersCount: Number(activeGroupsCountRaw[0]?.memberCount || 0),
        averageMonthlySpending: Math.round(avgMonthlySpending),
        averageMonthlyIncome: Math.round(avgMonthlyIncome),
        lastUpdated: now,
        trends: {
          incomeChangePct,
          expenseChangePct,
          savingsChangePct,
          personalExpenseChangePct,
          groupExpenseChangePct,
        },
      },
      dateComparison,
      charts: {
        monthlyExpenseTrend,
        monthlyIncomeTrend,
        incomeVsExpense,
        netSavingsTrend,
        personalVsGroup,
        settlementStatus: settlementStatusRaw.map((s) => ({
          name: s.status === "completed" ? "Settled" : "Pending",
          value: Number(s.totalAmount) / 100,
          count: Number(s.count),
        })),
        groupSpending: topGroups.map((g) => ({ name: g.name, value: g.amount })),
        memberContribution: topGroups.map((g) => ({
          name: g.name,
          amount: g.amount,
          percentage: currentGroupExpense > 0 ? Math.round((g.amount / currentGroupExpense) * 100) : 0,
        })),
        categorySpending,
        paymentMethodDistribution: paymentMethodRaw.map((p) => ({
          name: p.method,
          amount: Number(p.totalAmount) / 100,
          count: Number(p.count),
        })),
      },
      monthlyTrends: {
        totalIncome: currentIncome,
        totalExpense: currentExpense,
        netSavings: currentSavings,
        totalTransactions: Number(currentSummaryRaw[0]?.count || 0),
        averageDailyExpense,
        averageWeeklyExpense,
        highestSpendingDay: highestDay,
        lowestSpendingDay: lowestDay,
        highestIncomeDay,
        mostActiveMonth,
      },
      spendingInsights: {
        topCategories,
        topGroups,
        mostExpensiveTransaction: null,
        mostFrequentCategory: categorySpending.length > 0 ? { name: categorySpending[0].name, count: categorySpending[0].count } : null,
        highestExpenseCurrentPeriod: highestDay ? { title: `Peak day (${highestDay.date})`, amount: highestDay.amount } : null,
        lowestExpenseCurrentPeriod: lowestDay ? { title: `Low day (${lowestDay.date})`, amount: lowestDay.amount } : null,
        largestGroupExpense: topGroups.length > 0 ? { title: `Top group (${topGroups[0].name})`, amount: topGroups[0].amount, groupName: topGroups[0].name } : null,
        largestPersonalExpense: null,
        averageExpensePerTransaction: Number(currentSummaryRaw[0]?.count || 0) > 0 ? Math.round(currentExpense / Number(currentSummaryRaw[0]?.count)) : 0,
        averageGroupExpense: Math.round(avgGroup),
        averagePersonalExpense: Math.round(avgPersonal),
        monthlyExpenseGrowthPct: expenseChangePct,
        dailySpendingAverage: averageDailyExpense,
        weeklySpendingAverage: averageWeeklyExpense,
      },
      categoryAnalytics,
      personalVsGroup: {
        totalPersonalExpenses: currentPersonalExpense,
        totalGroupExpenses: currentGroupExpense,
        personalIncome: (personalVsGroupRaw[0]?.personalIncome || 0) / 100,
        groupContributions: (personalVsGroupRaw[0]?.groupIncome || 0) / 100,
        averagePersonalExpense: avgPersonal,
        averageGroupExpense: avgGroup,
        mostActiveGroup: topGroups.length > 0 ? topGroups[0].name : null,
        mostActivePersonalCategory: categorySpending.length > 0 ? categorySpending[0].name : null,
        contributionRatio,
      },
      recentActivity: recentActivityRaw.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityPublicId: a.entityPublicId,
        userName: a.userName || "You",
        reason: a.reason,
        date: a.createdAt,
      })),
    };
  } catch (error) {
    throw new DatabaseError("Failed to calculate comprehensive financial analytics", { originalError: error });
  }
}
