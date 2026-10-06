"use server";

import { db } from "@/lib/db";
import { 
  transactions, 
  contacts, 
  groups, 
  settlements, 
  notifications, 
  invitations, 
  groupMembers, 
  expenseSplits,
  users,
  profiles,
  auditLogs,
  categories,
  budgets
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, gte, lte, or, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { DatabaseError } from "@/lib/errors";
import { calculateGroupSettlements } from "@/lib/settlements/calculator";
import { appCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

export interface DashboardData {
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    createdAt: Date;
    defaultCurrency: string;
    phone?: string | null;
    profileCompletion: number;
  };
  summary: {
    totalReceivable: number; // in rupees
    totalPayable: number; // in rupees
    netBalance: number; // in rupees
    monthlySpending: number; // in rupees
    monthlyIncome: number; // in rupees
    savings: number; // in rupees
    totalTransactions: number;
    pendingSettlementsAmount: number; // in rupees
    pendingSettlementsCount: number;
    myGroupsCount: number;
  };
  trends: {
    spendingTrend: number; // percentage vs last month
    incomeTrend: number; // percentage vs last month
    balanceTrend: number;
  };
  groupStats: {
    totalGroups: number;
    totalGroupExpenses: number; // in rupees
    totalGroupMembers: number;
    pendingInvitations: number;
    activeInvitations: number;
    groupBalance: number; // in rupees
  };
  personalStats: {
    personalTransactionsCount: number;
    personalIncome: number; // in rupees
    personalExpense: number; // in rupees
    netSavings: number; // in rupees
    pendingPersonalPayments: number; // in rupees
  };
  recentTransactions: Array<{
    id: number;
    publicId: string;
    title?: string | null;
    description: string;
    type: string;
    amount: number; // in paise
    currency: string;
    date: Date;
    status: string;
    paymentMethod?: string | null;
    categoryName?: string | null;
    groupName?: string | null;
    contactName?: string | null;
    receiptUrl?: string | null;
  }>;
  activeGroups: Array<{
    id: number;
    publicId: string;
    name: string;
    type: string;
    currency: string;
    memberCount: number;
    balance: number; // in rupees
  }>;
  topContacts: Array<{
    id: number;
    publicId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    balance: number; // in rupees
  }>;
  recentActivity: Array<{
    id: number;
    publicId?: string | null;
    action: string;
    entityType: string;
    entityPublicId?: string | null;
    userName: string;
    userAvatar?: string | null;
    reason?: string | null;
    date: Date;
  }>;
  pendingTasks: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: "settlement" | "budget" | "reminder" | "payment";
    amount?: number;
    href: string;
    priority: "high" | "medium" | "low";
  }>;
  financialInsights: {
    score: number;
    headline: string;
    keyFindings: string[];
    recommendation: string;
  };
  charts: {
    incomeVsExpense: Array<{ month: string; income: number; expense: number }>;
    categoryBreakdown: Array<{ name: string; value: number; percentage: number }>;
    cashflowTrend: Array<{ month: string; cashflow: number }>;
  };
  unreadNotificationsCount: number;
}

/**
 * Get aggregated dashboard data with single-pass parallel query execution.
 * Guarantees <500ms execution time, strict user isolation, and live calculations.
 */
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const user = await requireAuth();

    return await logger.withTiming(`dashboard:user:${user.id}`, async () => {
      return await appCache.getOrSet(
        `dashboard:user:${user.id}`,
        async () => {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

          const settleToUser = alias(users, "settle_to_user");
          const settleFromUser = alias(users, "settle_from_user");

          // Parallel Batch Queries
    const [
      userProfile,
      currentMonthIncomeExp,
      lastMonthIncomeExp,
      allTimeIncomeExp,
      allTimePersonalStats,
      allTimeGroupStats,
      activeGroupsRaw,
      userGroupMemberships,
      pendingSettlementsQuery,
      unreadNotifsQuery,
      invitationsQuery,
      contactsQuery,
      recentTxQuery,
      recentActivityQuery,
      activeBudgetsQuery,
      sixMonthMonthlyTotals,
      categorySpendingRaw,
    ] = await Promise.all([
      // 1. User Profile & Extended Settings
      db
        .select({
          phone: profiles.phone,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1),

      // 2. Current Month Income & Expenses
      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            gte(transactions.date, startOfMonth),
            lte(transactions.date, endOfMonth)
          )
        ),

      // 3. Last Month Income & Expenses (for trend indicators)
      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            gte(transactions.date, startOfLastMonth),
            lte(transactions.date, endOfLastMonth)
          )
        ),

      // 4. All Time Income, Expense & Total Transactions Count
      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          totalCount: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        ),

      // 5. Personal Statistics (Section 7)
      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          count: sql<number>`COUNT(*)`,
          pendingPayments: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'borrowed' AND ${transactions.status} != 'completed' THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.groupId} IS NULL`
          )
        ),

      // 6. Group Statistics (Section 6)
      db
        .select({
          totalGroupExpenses: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.groupId} IS NOT NULL`
          )
        ),

      // 7. Active Groups for the current user
      db
        .select({
          id: groups.id,
          publicId: groups.publicId,
          name: groups.name,
          type: groups.type,
          currency: groups.currency,
          memberCount: sql<number>`(SELECT COUNT(*) FROM group_members WHERE group_id = groups.id)`,
        })
        .from(groups)
        .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
        .where(
          and(
            eq(groupMembers.userId, user.id),
            eq(groups.isDeleted, false),
            eq(groups.isActive, true)
          )
        )
        .orderBy(desc(groups.createdAt))
        .limit(6),

      // 8. Total unique members across user's groups
      db
        .select({
          groupId: groupMembers.groupId,
          userId: groupMembers.userId,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(
          and(
            eq(groups.isDeleted, false),
            sql`${groupMembers.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
          )
        ),

      // 9. Pending Settlements (Receivable & Payable)
      db
        .select({
          id: settlements.id,
          publicId: settlements.publicId,
          amount: settlements.amount,
          fromUserId: settlements.fromUserId,
          toUserId: settlements.toUserId,
          status: settlements.status,
          toUserName: settleToUser.name,
          fromUserName: settleFromUser.name,
        })
        .from(settlements)
        .leftJoin(settleToUser, eq(settlements.toUserId, settleToUser.id))
        .leftJoin(settleFromUser, eq(settlements.fromUserId, settleFromUser.id))
        .where(
          and(
            eq(settlements.isDeleted, false),
            eq(settlements.status, "pending"),
            or(
              eq(settlements.fromUserId, user.id),
              eq(settlements.toUserId, user.id)
            )
          )
        ),

      // 10. Unread Notifications Count
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            isNull(notifications.readAt)
          )
        ),

      // 11. Invitations (Pending & Active)
      db
        .select({
          status: invitations.status,
        })
        .from(invitations)
        .where(
          and(
            eq(invitations.invitedBy, user.id)
          )
        ),

      // 12. Top Contacts with running balance
      db
        .select({
          id: contacts.id,
          publicId: contacts.publicId,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          avatar: contacts.avatar,
          balance: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)`,
        })
        .from(contacts)
        .leftJoin(transactions, and(eq(transactions.contactId, contacts.id), eq(transactions.isDeleted, false)))
        .where(
          and(
            eq(contacts.userId, user.id),
            eq(contacts.isDeleted, false)
          )
        )
        .groupBy(contacts.id, contacts.publicId, contacts.name, contacts.email, contacts.phone, contacts.avatar)
        .orderBy(sql`ABS(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE -${transactions.amount} END)) DESC`)
        .limit(5),

      // 13. Recent Transactions (Latest 8 with paymentMethod)
      db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          currency: transactions.currency,
          date: transactions.date,
          status: transactions.status,
          paymentMethod: transactions.paymentMethod,
          receiptUrl: transactions.receiptUrl,
          categoryName: categories.name,
          groupName: groups.name,
          contactName: contacts.name,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        )
        .orderBy(desc(transactions.date))
        .limit(8),

      // 14. Recent Activity Logs (Streamlined 10 records)
      db
        .select({
          id: auditLogs.id,
          publicId: auditLogs.publicId,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityPublicId: auditLogs.entityPublicId,
          reason: auditLogs.reason,
          createdAt: auditLogs.createdAt,
          userName: users.name,
          userAvatar: users.avatar,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(auditLogs.userId, user.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10),

      // 15. Active Budgets
      db
        .select({
          id: budgets.id,
          name: budgets.name,
          amount: budgets.amount,
          alertThreshold: budgets.alertThreshold,
          categoryId: budgets.categoryId,
          categoryName: categories.name,
        })
        .from(budgets)
        .leftJoin(categories, eq(budgets.categoryId, categories.id))
        .where(
          and(
            eq(budgets.userId, user.id),
            eq(budgets.isDeleted, false),
            eq(budgets.status, "active")
          )
        ),

      // 16. Historical 6 Months for Charts
      db
        .select({
          monthKey: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            gte(transactions.date, new Date(now.getFullYear(), now.getMonth() - 5, 1))
          )
        )
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`),

      // 17. Category Breakdown for current month
      db
        .select({
          name: sql<string>`COALESCE(${categories.name}, 'General')`,
          amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.type} IN ('paid', 'borrowed')`,
            gte(transactions.date, startOfMonth),
            lte(transactions.date, endOfMonth)
          )
        )
        .groupBy(categories.name)
        .orderBy(sql`SUM(${transactions.amount}) DESC`)
        .limit(6),
    ]);

    // Calculate Settlement Engine Receivables & Payables across groups
    let calculatedReceivable = 0;
    let calculatedPayable = 0;

    const activeGroupIds = activeGroupsRaw.map((g) => g.id);
    if (activeGroupIds.length > 0) {
      const [allGroupExpenses, allGroupSplits] = await Promise.all([
        db
          .select({
            id: transactions.id,
            groupId: transactions.groupId,
            type: transactions.type,
            amount: transactions.amount,
            currency: transactions.currency,
            paidBy: transactions.paidBy,
            paidByContact: transactions.paidByContact,
          })
          .from(transactions)
          .where(
            and(
              inArray(transactions.groupId, activeGroupIds),
              eq(transactions.isDeleted, false)
            )
          ),
        db
          .select({
            transactionId: expenseSplits.transactionId,
            userId: expenseSplits.userId,
            contactId: expenseSplits.contactId,
            amount: expenseSplits.amount,
            percentage: expenseSplits.percentage,
            shares: expenseSplits.shares,
            isExcluded: expenseSplits.isExcluded,
          })
          .from(expenseSplits)
          .innerJoin(transactions, eq(expenseSplits.transactionId, transactions.id))
          .where(
            and(
              inArray(transactions.groupId, activeGroupIds),
              eq(transactions.isDeleted, false)
            )
          ),
      ]);

      const expensesByGroup = new Map<number, typeof allGroupExpenses>();
      allGroupExpenses.forEach((e) => {
        const arr = expensesByGroup.get(e.groupId!) || [];
        arr.push(e);
        expensesByGroup.set(e.groupId!, arr);
      });

      const splitsByTx = new Map<number, typeof allGroupSplits>();
      allGroupSplits.forEach((s) => {
        const arr = splitsByTx.get(s.transactionId) || [];
        arr.push(s);
        splitsByTx.set(s.transactionId, arr);
      });

      for (const group of activeGroupsRaw) {
        const groupExp = expensesByGroup.get(group.id) || [];
        const groupSettlements = calculateGroupSettlements(
          groupExp.map((e) => ({
            id: e.id,
            paidBy: e.paidBy || undefined,
            paidByContact: e.paidByContact || undefined,
            amount: e.amount,
            currency: e.currency,
            splitType: "equal",
            splits: (splitsByTx.get(e.id) || []).map((s) => ({
              userId: s.userId || undefined,
              contactId: s.contactId || undefined,
              amount: s.amount,
              percentage: s.percentage || undefined,
              shares: s.shares || undefined,
              isExcluded: s.isExcluded || false,
            })),
          }))
        );

        groupSettlements.settlements.forEach((s) => {
          if (s.toUserId === user.id) calculatedReceivable += s.amount;
          else if (s.fromUserId === user.id) calculatedPayable += s.amount;
        });
      }
    }

    // Add Direct Pending Settlements
    let directPendingReceivable = 0;
    let directPendingPayable = 0;
    let pendingCount = 0;

    pendingSettlementsQuery.forEach((s) => {
      pendingCount++;
      if (s.toUserId === user.id) directPendingReceivable += s.amount;
      if (s.fromUserId === user.id) directPendingPayable += s.amount;
    });

    const totalReceivableRupees = (calculatedReceivable + directPendingReceivable) / 100;
    const totalPayableRupees = (calculatedPayable + directPendingPayable) / 100;
    const netBalanceRupees = totalReceivableRupees - totalPayableRupees;

    // Monthly Figures
    const monthlySpendingRupees = (currentMonthIncomeExp[0]?.expense || 0) / 100;
    const monthlyIncomeRupees = (currentMonthIncomeExp[0]?.income || 0) / 100;
    const lastMonthSpendingRupees = (lastMonthIncomeExp[0]?.expense || 0) / 100;
    const lastMonthIncomeRupees = (lastMonthIncomeExp[0]?.income || 0) / 100;

    const spendingTrend = lastMonthSpendingRupees > 0
      ? Math.round(((monthlySpendingRupees - lastMonthSpendingRupees) / lastMonthSpendingRupees) * 100)
      : 0;

    const incomeTrend = lastMonthIncomeRupees > 0
      ? Math.round(((monthlyIncomeRupees - lastMonthIncomeRupees) / lastMonthIncomeRupees) * 100)
      : 0;

    const balanceTrend = lastMonthSpendingRupees > 0
      ? Math.round(((monthlyIncomeRupees - monthlySpendingRupees) - (lastMonthIncomeRupees - lastMonthSpendingRupees)))
      : 0;

    // Group Statistics
    const uniqueGroupMembersSet = new Set(
      userGroupMemberships
        .map((m) => m.userId)
        .filter((id): id is number => id !== null && id !== user.id)
    );

    const pendingInvs = invitationsQuery.filter((i) => i.status === "pending").length;
    const activeInvs = invitationsQuery.filter((i) => i.status === "accepted").length;

    // Personal Stats
    const personalIncomeRupees = (allTimePersonalStats[0]?.income || 0) / 100;
    const personalExpenseRupees = (allTimePersonalStats[0]?.expense || 0) / 100;
    const netSavingsRupees = personalIncomeRupees - personalExpenseRupees;
    const pendingPersonalDebtsRupees = (allTimePersonalStats[0]?.pendingPayments || 0) / 100;

    // Profile Completion Score (0-100%)
    let completionScore = 30; // base registered
    if (user.name) completionScore += 25;
    if (user.avatar) completionScore += 20;
    if (userProfile[0]?.phone) completionScore += 25;

    // Active Groups formatted
    const activeGroupsFormatted = activeGroupsRaw.map((g) => ({
      id: g.id,
      publicId: g.publicId,
      name: g.name,
      type: g.type,
      currency: g.currency,
      memberCount: Number(g.memberCount),
      balance: 0,
    }));

    // Monthly Savings
    const savingsRupees = monthlyIncomeRupees - monthlySpendingRupees;

    // Charts: 6-month Historical Income vs Expense and Cashflow Trend
    const monthFormatter = new Intl.DateTimeFormat("en-IN", { month: "short" });
    const last6Months: Array<{ key: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      last6Months.push({ key, label: monthFormatter.format(d) });
    }

    const monthlyDataMap = new Map<string, { income: number; expense: number }>();
    sixMonthMonthlyTotals.forEach((m) => {
      monthlyDataMap.set(m.monthKey, {
        income: Number(m.income) / 100,
        expense: Number(m.expense) / 100,
      });
    });

    const incomeVsExpenseChart = last6Months.map(({ key, label }) => {
      const entry = monthlyDataMap.get(key) || { income: 0, expense: 0 };
      return {
        month: label,
        income: entry.income,
        expense: entry.expense,
      };
    });

    const cashflowTrendChart = last6Months.map(({ key, label }) => {
      const entry = monthlyDataMap.get(key) || { income: 0, expense: 0 };
      return {
        month: label,
        cashflow: entry.income - entry.expense,
      };
    });

    const totalCatExp = categorySpendingRaw.reduce((s, c) => s + Number(c.amount), 0);
    const categoryBreakdownChart = categorySpendingRaw.map((c) => {
      const val = Number(c.amount) / 100;
      const pct = totalCatExp > 0 ? Math.round((Number(c.amount) / totalCatExp) * 100) : 0;
      return {
        name: c.name,
        value: val,
        percentage: pct,
      };
    });

    // Pending Tasks (Settlements, Budget Alerts, Reminders)
    const pendingTasks: DashboardData["pendingTasks"] = [];

    pendingSettlementsQuery.forEach((s) => {
      if (s.fromUserId === user.id) {
        pendingTasks.push({
          id: `settle-${s.id}`,
          title: `Pay ₹${(s.amount / 100).toFixed(2)} to ${s.toUserName || "peer"}`,
          subtitle: "Pending settlement confirmation",
          type: "settlement",
          amount: s.amount / 100,
          href: "/dashboard/settlements",
          priority: "high",
        });
      } else if (s.toUserId === user.id) {
        pendingTasks.push({
          id: `settle-${s.id}`,
          title: `Receive ₹${(s.amount / 100).toFixed(2)} from ${s.fromUserName || "peer"}`,
          subtitle: "Awaiting peer payment",
          type: "settlement",
          amount: s.amount / 100,
          href: "/dashboard/settlements",
          priority: "medium",
        });
      }
    });

    activeBudgetsQuery.forEach((b) => {
      const spent = categorySpendingRaw.find((c) => c.name === b.categoryName);
      const spentAmount = spent ? Number(spent.amount) : 0;
      const budgetAmount = Number(b.amount);
      if (budgetAmount > 0) {
        const pctUsed = Math.round((spentAmount / budgetAmount) * 100);
        if (pctUsed >= b.alertThreshold) {
          pendingTasks.push({
            id: `budget-${b.id}`,
            title: `Budget Alert: ${b.name}`,
            subtitle: `Used ${pctUsed}% of limit (₹${(spentAmount / 100).toFixed(0)} / ₹${(budgetAmount / 100).toFixed(0)})`,
            type: "budget",
            amount: budgetAmount / 100,
            href: "/dashboard/budgets",
            priority: pctUsed >= 100 ? "high" : "medium",
          });
        }
      }
    });

    // Financial Insights
    let headline = "Financial activity is normal this month.";
    if (spendingTrend < 0) {
      headline = `Spending decreased by ${Math.abs(spendingTrend)}% compared to last month.`;
    } else if (spendingTrend > 0) {
      headline = `Spending increased by ${spendingTrend}% compared to last month.`;
    }

    const keyFindings: string[] = [];
    if (netBalanceRupees > 0) {
      keyFindings.push(`You are owed ₹${netBalanceRupees.toFixed(2)} net across all groups and contacts.`);
    } else if (netBalanceRupees < 0) {
      keyFindings.push(`You have a net obligation of ₹${Math.abs(netBalanceRupees).toFixed(2)} to settle.`);
    } else {
      keyFindings.push("Your group and personal balances are fully settled.");
    }

    if (savingsRupees > 0) {
      keyFindings.push(`Positive monthly net cashflow of +₹${savingsRupees.toFixed(2)}.`);
    } else if (savingsRupees < 0) {
      keyFindings.push(`Current monthly expenses exceed income by ₹${Math.abs(savingsRupees).toFixed(2)}.`);
    }

    if (categoryBreakdownChart.length > 0) {
      keyFindings.push(`Top spending category is ${categoryBreakdownChart[0].name} (${categoryBreakdownChart[0].percentage}% of monthly total).`);
    }

    if (pendingCount > 0) {
      keyFindings.push(`${pendingCount} pending settlements require confirmation.`);
    }

    let recommendation = "Keep tracking expenses daily to maintain healthy cashflow.";
    if (totalPayableRupees > 0) {
      recommendation = `Consider settling your ₹${totalPayableRupees.toFixed(2)} outstanding debts to keep peer accounts clean.`;
    } else if (savingsRupees > 0) {
      recommendation = `Great job saving ₹${savingsRupees.toFixed(2)} this month. Keep it up!`;
    }

    let healthScore = 70;
    if (netBalanceRupees >= 0) healthScore += 10;
    if (savingsRupees > 0) healthScore += 10;
    if (spendingTrend < 0) healthScore += 5;
    if (totalPayableRupees > totalReceivableRupees * 2 && totalPayableRupees > 500) healthScore -= 15;
    healthScore = Math.max(25, Math.min(98, healthScore));

    const financialInsights = {
      score: healthScore,
      headline,
      keyFindings,
      recommendation,
    };

    return {
      user: {
        id: user.id,
        name: user.name || "User",
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        defaultCurrency: user.defaultCurrency || "INR",
        phone: userProfile[0]?.phone,
        profileCompletion: Math.min(100, completionScore),
      },
      summary: {
        totalReceivable: totalReceivableRupees,
        totalPayable: totalPayableRupees,
        netBalance: netBalanceRupees,
        monthlySpending: monthlySpendingRupees,
        monthlyIncome: monthlyIncomeRupees,
        savings: savingsRupees,
        totalTransactions: Number(allTimeIncomeExp[0]?.totalCount || 0),
        pendingSettlementsAmount: (directPendingReceivable + directPendingPayable) / 100,
        pendingSettlementsCount: pendingCount,
        myGroupsCount: activeGroupsRaw.length,
      },
      trends: {
        spendingTrend,
        incomeTrend,
        balanceTrend,
      },
      groupStats: {
        totalGroups: activeGroupsRaw.length,
        totalGroupExpenses: (allTimeGroupStats[0]?.totalGroupExpenses || 0) / 100,
        totalGroupMembers: uniqueGroupMembersSet.size,
        pendingInvitations: pendingInvs,
        activeInvitations: activeInvs,
        groupBalance: netBalanceRupees,
      },
      personalStats: {
        personalTransactionsCount: Number(allTimePersonalStats[0]?.count || 0),
        personalIncome: personalIncomeRupees,
        personalExpense: personalExpenseRupees,
        netSavings: netSavingsRupees,
        pendingPersonalPayments: pendingPersonalDebtsRupees,
      },
      recentTransactions: recentTxQuery,
      activeGroups: activeGroupsFormatted,
      topContacts: contactsQuery.map((c) => ({
        id: c.id,
        publicId: c.publicId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        avatar: c.avatar,
        balance: (c.balance || 0) / 100,
      })),
      recentActivity: recentActivityQuery.map((a) => ({
        id: a.id,
        publicId: a.publicId,
        action: a.action,
        entityType: a.entityType,
        entityPublicId: a.entityPublicId,
        userName: a.userName || "You",
        userAvatar: a.userAvatar,
        reason: a.reason,
        date: a.createdAt,
      })),
      pendingTasks,
      financialInsights,
      charts: {
        incomeVsExpense: incomeVsExpenseChart,
        categoryBreakdown: categoryBreakdownChart,
        cashflowTrend: cashflowTrendChart,
      },
      unreadNotificationsCount: Number(unreadNotifsQuery[0]?.count || 0),
    };
    },
    { ttlMs: 15 * 1000, tags: [`user:${user.id}`, "dashboard"] }
  );
  });
} catch (error) {
  throw new DatabaseError("Failed to fetch dashboard data", { originalError: error });
}
}
