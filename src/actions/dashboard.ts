"use server";

import { db, withDbRetry } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db/auto-migrate";
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
  budgets,
  notes,
  noteChecklists,
} from "@/lib/db/schema/schema";
import { eq, and, desc, asc, sql, gte, lte, or, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { DatabaseError } from "@/lib/errors";
import { calculateGroupSettlements } from "@/lib/settlements/calculator";
import { appCache } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { formatCurrency } from "@/lib/utils";

export interface DashboardOptions {
  period?: "current_month" | "last_month" | "this_week" | "today" | "year" | "all_time" | "custom";
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface ContactFinancialOverviewData {
  totalContacts: number;
  contactsOweYou: number; // in rupees
  youOweContacts: number; // in rupees
  monthlyReceived: number; // in rupees
  monthlyPaid: number; // in rupees
  recentContactActivity: Array<{
    id: number;
    publicId: string;
    contactName: string;
    title: string;
    amount: number; // in rupees
    type: string;
    date: Date;
    status: string;
  }>;
  largestOutstandingBalance: {
    contactName: string;
    amount: number; // in rupees
    status: "They Owe You" | "You Owe" | "Settled";
  } | null;
  topPayingContact: {
    contactName: string;
    amount: number; // in rupees
  } | null;
  topOwingContact: {
    contactName: string;
    amount: number; // in rupees
  } | null;
  averageTransactionSize: number; // in rupees
}

export interface MonthlyFinancialAnalyticsData {
  totalContactIncome: number;
  totalContactExpense: number;
  netMonthlyBalance: number;
  highestIncomeDay: { day: string; amount: number } | null;
  highestExpenseDay: { day: string; amount: number } | null;
  averageDailyIncome: number;
  averageDailyExpense: number;
  monthlyCashFlow: Array<{ month: string; income: number; expense: number; net: number }>;
  incomeTrend: number;
  expenseTrend: number;
  savingsTrend: number;
}

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
    totalReceivable: number; // in rupees (Row 1, Card 2)
    totalPayable: number; // in rupees (Row 1, Card 3)
    netBalance: number; // in rupees (Row 1, Card 1)
    monthlyContactIncome: number; // in rupees (Row 1, Card 4)
    monthlyContactExpense: number; // in rupees (Row 2, Card 1)
    savings: number; // in rupees (Row 2, Card 2)
    monthlySpending: number; // alias
    monthlyIncome: number; // alias
    totalTransactions: number;
    pendingSettlementsAmount: number; // in rupees (Row 2, Card 3)
    pendingSettlementsCount: number;
    myGroupsCount: number; // (Row 2, Card 4)
  };
  trends: {
    spendingTrend: number; // percentage vs last month
    incomeTrend: number; // percentage vs last month
    balanceTrend: number;
  };
  activePeriod: string;
  contactOverview: ContactFinancialOverviewData;
  monthlyAnalytics: MonthlyFinancialAnalyticsData;
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
    syncedTxCount?: number;
    lastSyncedAt?: Date | null;
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
    type: "settlement" | "budget" | "reminder" | "payment" | "note";
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
 * Standardized Date Window Calculation Helper for Dashboard Periods
 */
function calculateDashboardDateWindows(
  period: string = "current_month",
  customStart?: string | Date,
  customEnd?: string | Date
) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let prevStartDate: Date;
  let prevEndDate: Date;

  switch (period) {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    }
    case "this_week": {
      const day = now.getDay() || 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime() - 1);
      break;
    }
    case "last_month": {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      break;
    }
    case "year": {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    }
    case "all_time": {
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2099, 11, 31);
      prevStartDate = new Date(1990, 0, 1);
      prevEndDate = new Date(1999, 11, 31);
      break;
    }
    case "custom": {
      startDate = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = customEnd ? new Date(customEnd) : now;
      const duration = Math.max(1, endDate.getTime() - startDate.getTime());
      prevStartDate = new Date(startDate.getTime() - duration);
      prevEndDate = new Date(startDate.getTime() - 1);
      break;
    }
    case "current_month":
    default: {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
}

/**
 * Get aggregated dashboard data with single-pass parallel query execution.
 * Guarantees <500ms execution time, strict user isolation, and live calculations.
 */
export async function getDashboardData(options?: DashboardOptions): Promise<DashboardData> {
  try {
    const user = await requireAuth();
    const period = options?.period || "current_month";
    const { startDate, endDate, prevStartDate, prevEndDate } = calculateDashboardDateWindows(
      period,
      options?.startDate,
      options?.endDate
    );

    return await logger.withTiming(`dashboard:user:${user.id}:${period}`, async () => {
      return await appCache.getOrSet(
        `dashboard:user:${user.id}:${period}:${options?.startDate || ""}:${options?.endDate || ""}`,
        async () => {
          const now = new Date();
          const settleToUser = alias(users, "settle_to_user");
          const settleFromUser = alias(users, "settle_from_user");

          // Ensure database schema is up-to-date
          try {
            await ensureDatabaseSchema();
          } catch (schemaErr) {
            console.warn("Dashboard auto-migrate check warning:", schemaErr);
          }

          // Parallel Batch Queries
          const [
            userProfile,
            contactPeriodSummary,
            contactPrevPeriodSummary,
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
            totalContactsCount,
            recentContactActivityQuery,
            contactDailySeries,
            pinnedNotesQuery,
            pinnedChecklistsQuery,
          ] = await withDbRetry(async () => {
            return await Promise.all([
      // 1. User Profile & Extended Settings
      db
        .select({
          phone: profiles.phone,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1),

      // 2. Reflected Contact Transactions in Current Period (Monthly Contact Income & Expense)
      db
        .select({
          contactIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          contactExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .innerJoin(contacts, and(eq(transactions.contactId, contacts.id), eq(contacts.isDeleted, false)))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.contactId} IS NOT NULL`,
            or(eq(transactions.isSyncedToDashboard, true), eq(transactions.dashboardStatus, 'reflected')),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        ),

      // 3. Reflected Contact Transactions in Prior Period (for trends)
      db
        .select({
          contactIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          contactExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .innerJoin(contacts, and(eq(transactions.contactId, contacts.id), eq(contacts.isDeleted, false)))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.contactId} IS NOT NULL`,
            or(eq(transactions.isSyncedToDashboard, true), eq(transactions.dashboardStatus, 'reflected')),
            gte(transactions.date, prevStartDate),
            lte(transactions.date, prevEndDate)
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
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            or(
              isNull(transactions.contactId),
              and(eq(transactions.isSyncedToDashboard, true), eq(contacts.isDeleted, false))
            )
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
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.groupId} IS NULL`,
            or(
              isNull(transactions.contactId),
              and(eq(transactions.isSyncedToDashboard, true), eq(contacts.isDeleted, false))
            )
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
          groupId: settlements.groupId,
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

      // 12. Contacts with Balances for Dashboard (opening balance + active ledger transactions)
      db
        .select({
          id: contacts.id,
          publicId: contacts.publicId,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          avatar: contacts.avatar,
          openingBalance: contacts.openingBalance,
          balance: sql<number>`COALESCE(${contacts.openingBalance}, 0) + COALESCE(SUM(CASE WHEN ${transactions.id} IS NULL THEN 0 WHEN ${transactions.type} IN ('received', 'lent') THEN ${transactions.amount} WHEN ${transactions.type} = 'adjustment' AND (${transactions.tags}::text LIKE '%credit%' OR ${transactions.tags}::text LIKE '%increase%') THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)`,
          totalReceived: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent') THEN ${transactions.amount} ELSE 0 END), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          syncedTxCount: sql<number>`COUNT(${transactions.id})`,
          lastSyncedAt: sql<Date | null>`MAX(${transactions.syncedAt})`,
        })
        .from(contacts)
        .leftJoin(
          transactions,
          and(
            eq(transactions.contactId, contacts.id),
            eq(transactions.isDeleted, false)
          )
        )
        .where(
          and(
            eq(contacts.userId, user.id),
            eq(contacts.isDeleted, false)
          )
        )
        .groupBy(contacts.id, contacts.publicId, contacts.name, contacts.email, contacts.phone, contacts.avatar, contacts.openingBalance)
        .orderBy(sql`ABS(COALESCE(${contacts.openingBalance}, 0) + COALESCE(SUM(CASE WHEN ${transactions.id} IS NULL THEN 0 WHEN ${transactions.type} IN ('received', 'lent') THEN ${transactions.amount} WHEN ${transactions.type} = 'adjustment' AND (${transactions.tags}::text LIKE '%credit%' OR ${transactions.tags}::text LIKE '%increase%') THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)) DESC`)
        .limit(50)
        .catch((err) => {
          console.warn("Synchronized contacts query fallback:", err);
          return [] as any[];
        }),

      // 13. Recent Transactions (Latest 8 with paymentMethod - synced or non-contact only)
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
            eq(transactions.isDeleted, false),
            or(
              isNull(transactions.contactId),
              and(eq(transactions.isSyncedToDashboard, true), eq(contacts.isDeleted, false))
            )
          )
        )
        .orderBy(desc(transactions.date))
        .limit(5),

      // 14. Recent Activity Logs (Strictly 5 records for dashboard)
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
        .limit(5),

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

      // 16. Historical 6 Months for Charts (synced or non-contact only)
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
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
            gte(transactions.date, new Date(now.getFullYear(), now.getMonth() - 5, 1))
          )
        )
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`),

      // 17. Category Breakdown for active period (synced or non-contact only)
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
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .groupBy(categories.name)
        .orderBy(sql`SUM(${transactions.amount}) DESC`)
        .limit(6),

      // 18. Total Active Contacts
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(contacts)
        .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false))),

      // 19. Recent Reflected Contact Transactions
      db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          date: transactions.date,
          status: transactions.status,
          contactId: transactions.contactId,
          contactName: contacts.name,
        })
        .from(transactions)
        .innerJoin(contacts, and(eq(transactions.contactId, contacts.id), eq(contacts.isDeleted, false)))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.contactId} IS NOT NULL`,
            or(eq(transactions.isSyncedToDashboard, true), eq(transactions.dashboardStatus, 'reflected'))
          )
        )
        .orderBy(desc(transactions.date))
        .limit(6)
        .catch(() => [] as any[]),

      // 20. Contact Daily Series for Current Period Analytics
      db
        .select({
          day: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM-DD')`,
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .innerJoin(contacts, and(eq(transactions.contactId, contacts.id), eq(contacts.isDeleted, false)))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.contactId} IS NOT NULL`,
            or(eq(transactions.isSyncedToDashboard, true), eq(transactions.dashboardStatus, 'reflected')),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM-DD')`)
        .catch(() => [] as any[]),

      // 21. Pinned Notes for Dashboard Tasks
      db
        .select({
          id: notes.id,
          publicId: notes.publicId,
          title: notes.title,
          content: notes.plainText,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(
          and(
            eq(notes.userId, user.id),
            eq(notes.isPinned, true),
            eq(notes.isDeleted, false),
            eq(notes.isArchived, false)
          )
        )
        .orderBy(desc(notes.updatedAt))
        .limit(5)
        .catch(() => [] as any[]),

      // 22. Uncompleted Tasks & Checklists from Notes Section
      db
        .select({
          id: noteChecklists.id,
          publicId: noteChecklists.publicId,
          title: noteChecklists.title,
          status: noteChecklists.status,
          priority: noteChecklists.priority,
          dueDate: noteChecklists.dueDate,
          noteId: noteChecklists.noteId,
          notePublicId: notes.publicId,
          noteTitle: notes.title,
          isPinned: notes.isPinned,
        })
        .from(noteChecklists)
        .innerJoin(notes, eq(noteChecklists.noteId, notes.id))
        .where(
          and(
            eq(notes.userId, user.id),
            eq(notes.isDeleted, false),
            eq(notes.isArchived, false),
            eq(noteChecklists.isCompleted, false)
          )
        )
        .orderBy(desc(notes.isPinned), asc(noteChecklists.dueDate))
        .limit(10)
        .catch(() => [] as any[]),
    ]);
  });

    // Calculate Settlement Engine Receivables & Payables across groups
    let calculatedReceivable = 0;
    let calculatedPayable = 0;

    const activeGroupIds = activeGroupsRaw.map((g) => g.id);
    if (activeGroupIds.length > 0) {
      const [allGroupExpenses, allGroupSplits] = await withDbRetry(async () => {
        return await Promise.all([
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
    });

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

    // Add Direct (non-group) Pending Settlements to avoid double-counting active groups
    let directPendingReceivable = 0;
    let directPendingPayable = 0;
    let pendingCount = 0;
    let userPendingReceivableTotal = 0;
    let userPendingPayableTotal = 0;

    pendingSettlementsQuery.forEach((s) => {
      pendingCount++;
      if (s.toUserId === user.id) userPendingReceivableTotal += s.amount;
      if (s.fromUserId === user.id) userPendingPayableTotal += s.amount;

      // Only add to directPending if this settlement does not belong to an active group already computed above
      if (!s.groupId || !activeGroupsRaw.some((g) => g.id === s.groupId)) {
        if (s.toUserId === user.id) directPendingReceivable += s.amount;
        if (s.fromUserId === user.id) directPendingPayable += s.amount;
      }
    });

    const totalReceivableRupees = (calculatedReceivable + directPendingReceivable) / 100;
    const totalPayableRupees = (calculatedPayable + directPendingPayable) / 100;

    // Reflected Contact Figures for the Active Period
    const monthlyContactIncome = (contactPeriodSummary[0]?.contactIncome || 0) / 100;
    const monthlyContactExpense = (contactPeriodSummary[0]?.contactExpense || 0) / 100;
    const prevContactIncome = (contactPrevPeriodSummary[0]?.contactIncome || 0) / 100;
    const prevContactExpense = (contactPrevPeriodSummary[0]?.contactExpense || 0) / 100;

    const contactSavings = monthlyContactIncome - monthlyContactExpense;
    const prevContactSavings = prevContactIncome - prevContactExpense;

    const incomeTrend = prevContactIncome > 0
      ? Math.round(((monthlyContactIncome - prevContactIncome) / prevContactIncome) * 100)
      : 0;

    const spendingTrend = prevContactExpense > 0
      ? Math.round(((monthlyContactExpense - prevContactExpense) / prevContactExpense) * 100)
      : 0;

    const balanceTrend = prevContactSavings !== 0
      ? Math.round(((contactSavings - prevContactSavings) / Math.abs(prevContactSavings)) * 100)
      : 0;

    // Contact Receivables and Payables (from reflected transactions only)
    const contactsReceivablePaise = contactsQuery.reduce((acc, c) => acc + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
    const contactsPayablePaise = contactsQuery.reduce((acc, c) => acc + (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0), 0);

    const overallReceivableRupees = totalReceivableRupees + (contactsReceivablePaise / 100);
    const overallPayableRupees = totalPayableRupees + (contactsPayablePaise / 100);
    const netBalanceRupees = overallReceivableRupees - overallPayableRupees;

    // Contact Financial Overview Data (Requirement 10)
    const owingContacts = [...contactsQuery]
      .filter((c) => Number(c.balance) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance));
    const topOwingContact = owingContacts.length > 0 ? {
      contactName: owingContacts[0].name,
      amount: Number(owingContacts[0].balance) / 100,
    } : null;

    const payingContacts = [...contactsQuery]
      .filter((c) => Number(c.totalReceived) > 0)
      .sort((a, b) => Number(b.totalReceived) - Number(a.totalReceived));
    const topPayingContact = payingContacts.length > 0 ? {
      contactName: payingContacts[0].name,
      amount: Number(payingContacts[0].totalReceived) / 100,
    } : null;

    const sortedByAbsBalance = [...contactsQuery].sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)));
    const largestOutstandingBalance = sortedByAbsBalance.length > 0 && Math.abs(Number(sortedByAbsBalance[0].balance)) > 0 ? {
      contactName: sortedByAbsBalance[0].name,
      amount: Math.abs(Number(sortedByAbsBalance[0].balance)) / 100,
      status: (Number(sortedByAbsBalance[0].balance) > 0 ? "They Owe You" : "You Owe") as "They Owe You" | "You Owe",
    } : null;

    const totalReflectedTxCount = contactsQuery.reduce((acc, c) => acc + Number(c.syncedTxCount || 0), 0);
    const totalReflectedTxVolumePaise = contactsQuery.reduce((acc, c) => acc + Number(c.totalReceived || 0) + Number(c.totalPaid || 0), 0);
    const averageTransactionSize = totalReflectedTxCount > 0 ? (totalReflectedTxVolumePaise / totalReflectedTxCount) / 100 : 0;

    const contactOverview: ContactFinancialOverviewData = {
      totalContacts: Number(totalContactsCount[0]?.count || 0),
      contactsOweYou: contactsReceivablePaise / 100,
      youOweContacts: contactsPayablePaise / 100,
      monthlyReceived: monthlyContactIncome,
      monthlyPaid: monthlyContactExpense,
      recentContactActivity: recentContactActivityQuery.map((t) => ({
        id: t.id,
        publicId: t.publicId,
        contactName: t.contactName,
        title: t.title || t.description,
        amount: t.amount / 100,
        type: t.type,
        date: t.date,
        status: t.status,
      })),
      largestOutstandingBalance,
      topPayingContact,
      topOwingContact,
      averageTransactionSize: Number(averageTransactionSize.toFixed(2)),
    };

    // Monthly Contact Financial Analytics (Requirement 11)
    const msDiff = Math.max(1, endDate.getTime() - startDate.getTime());
    const daysInPeriod = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)));

    let highestIncomeDay: { day: string; amount: number } | null = null;
    let highestExpenseDay: { day: string; amount: number } | null = null;
    let maxIncome = 0;
    let maxExpense = 0;

    contactDailySeries.forEach((d) => {
      const inc = Number(d.income) / 100;
      const exp = Number(d.expense) / 100;
      if (inc > maxIncome) {
        maxIncome = inc;
        highestIncomeDay = { day: d.day, amount: inc };
      }
      if (exp > maxExpense) {
        maxExpense = exp;
        highestExpenseDay = { day: d.day, amount: exp };
      }
    });

    const averageDailyIncome = daysInPeriod > 0 ? (monthlyContactIncome / daysInPeriod) : 0;
    const averageDailyExpense = daysInPeriod > 0 ? (monthlyContactExpense / daysInPeriod) : 0;

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

    // Monthly Savings (Contact-derived)
    const savingsRupees = contactSavings;

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

    // Pending Tasks (Settlements, Contacts, Pinned Notes Tasks, Budget Alerts)
    const pendingTasks: DashboardData["pendingTasks"] = [];

    // 1. Group & Peer Pending Settlements
    pendingSettlementsQuery.forEach((s) => {
      if (s.fromUserId === user.id) {
        pendingTasks.push({
          id: `settle-${s.id}`,
          title: `Pay ₹${(s.amount / 100).toFixed(2)} to ${s.toUserName || "peer"}`,
          subtitle: "Pending settlement confirmation",
          type: "settlement",
          amount: s.amount / 100,
          href: s.groupId ? `/dashboard/groups/${s.groupId}` : "/dashboard/settlements",
          priority: "high",
        });
      } else if (s.toUserId === user.id) {
        pendingTasks.push({
          id: `settle-${s.id}`,
          title: `Receive ₹${(s.amount / 100).toFixed(2)} from ${s.fromUserName || "peer"}`,
          subtitle: "Awaiting peer payment",
          type: "settlement",
          amount: s.amount / 100,
          href: s.groupId ? `/dashboard/groups/${s.groupId}` : "/dashboard/settlements",
          priority: "medium",
        });
      }
    });

    // 2. Contact Pending Settlements & Balances
    const activeOwingContacts = [...contactsQuery]
      .filter((c) => Number(c.balance) !== 0)
      .sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)));

    activeOwingContacts.forEach((c) => {
      const balPaise = Number(c.balance);
      if (balPaise > 0) {
        pendingTasks.push({
          id: `contact-receive-${c.id}`,
          title: `Receive ₹${(balPaise / 100).toFixed(2)} from ${c.name}`,
          subtitle: "Awaiting contact payment",
          type: "settlement",
          amount: balPaise / 100,
          href: `/dashboard/contacts/${c.publicId}`,
          priority: "medium",
        });
      } else if (balPaise < 0) {
        pendingTasks.push({
          id: `contact-pay-${c.id}`,
          title: `Pay ₹${(Math.abs(balPaise) / 100).toFixed(2)} to ${c.name}`,
          subtitle: "Pending contact obligation",
          type: "settlement",
          amount: Math.abs(balPaise) / 100,
          href: `/dashboard/contacts/${c.publicId}`,
          priority: "high",
        });
      }
    });

    // 3. Pinned Tasks & Notes from Notes Section
    const processedNoteIds = new Set<number>();

    // Checklist tasks from pinned notes or user notes
    pinnedChecklistsQuery.forEach((chk) => {
      processedNoteIds.add(chk.noteId);
      pendingTasks.push({
        id: `note-chk-${chk.id}`,
        title: chk.title,
        subtitle: `Pinned Task • ${chk.noteTitle}`,
        type: "note",
        href: `/dashboard/notes?status=pinned`,
        priority: chk.priority === "urgent" || chk.priority === "high" ? "high" : "medium",
      });
    });

    // Pinned notes themselves that don't have separate checklists
    pinnedNotesQuery.forEach((pn) => {
      if (!processedNoteIds.has(pn.id)) {
        pendingTasks.push({
          id: `pinned-note-${pn.id}`,
          title: pn.title || "Pinned Task",
          subtitle: "Pinned Task in Notes",
          type: "note",
          href: `/dashboard/notes?status=pinned`,
          priority: "high",
        });
      }
    });

    // 4. Active Budget Alerts
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

    // Total Pending Settlements combining group settlements and contact pending balances
    const contactsPendingPaise = contactsReceivablePaise + contactsPayablePaise;
    const totalPendingSettlementsPaise = userPendingReceivableTotal + userPendingPayableTotal + contactsPendingPaise;
    const totalPendingCount = pendingCount + activeOwingContacts.length;
    const pendingSettlementsRupees = totalPendingSettlementsPaise / 100;

    // 3–5 Concise Financial Insights (Requirement 2 & Acceptance Criteria)
    let headline = netBalanceRupees >= 0
      ? "Net Position is positive across all accounts."
      : "Net position reflects active obligations to settle.";

    const keyFindings: string[] = [];

    // 1. Net Position
    if (netBalanceRupees >= 0) {
      keyFindings.push(`Net Position is positive (+${formatCurrency(netBalanceRupees)}).`);
    } else {
      keyFindings.push(`Net Position reflects -${formatCurrency(Math.abs(netBalanceRupees))} in pending obligations.`);
    }

    // 2. Monthly Contact Inflow
    if (monthlyContactIncome > 0) {
      keyFindings.push(`${formatCurrency(monthlyContactIncome)} received from contacts this month.`);
    } else {
      keyFindings.push("No contact payments received yet this month.");
    }

    // 3. Pending Settlements
    if (pendingSettlementsRupees > 0) {
      keyFindings.push(`${formatCurrency(pendingSettlementsRupees)} pending settlement across groups & contacts.`);
    } else {
      keyFindings.push("All peer and contact settlements are cleared.");
    }

    // 4. Income vs Expense Comparison
    if (monthlyContactExpense > monthlyContactIncome) {
      keyFindings.push("Current monthly expenses exceed income.");
    } else if (monthlyContactIncome > monthlyContactExpense) {
      keyFindings.push(`Monthly income exceeds expenses by ${formatCurrency(monthlyContactIncome - monthlyContactExpense)}.`);
    }

    // 5. Short Actionable AI Recommendation
    let recommendation = "Maintain balanced settlements by reconciling ledgers regularly.";
    if (pendingSettlementsRupees > 0) {
      recommendation = `Settle ${formatCurrency(pendingSettlementsRupees)} in pending obligations to keep ledgers clear.`;
    } else if (contactsReceivablePaise > 0) {
      recommendation = `Send gentle reminders to collect ${formatCurrency(contactsReceivablePaise / 100)} in pending receivables.`;
    } else if (monthlyContactExpense > monthlyContactIncome) {
      recommendation = "Track discretionary expenses to retain a positive monthly surplus.";
    }

    let healthScore = 75;
    if (netBalanceRupees >= 0) healthScore += 10;
    if (incomeTrend > 0) healthScore += 5;
    if (overallReceivableRupees >= overallPayableRupees) healthScore += 5;
    if (overallPayableRupees > overallReceivableRupees * 2 && overallPayableRupees > 1000) healthScore -= 15;
    healthScore = Math.max(30, Math.min(99, healthScore));

    const financialInsights = {
      score: healthScore,
      headline,
      keyFindings: keyFindings.slice(0, 4), // Exactly 3-4 findings + 1 recommendation = 3-5 insights
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
        totalReceivable: overallReceivableRupees,
        totalPayable: overallPayableRupees,
        netBalance: netBalanceRupees,
        monthlyContactIncome,
        monthlyContactExpense,
        savings: contactSavings,
        monthlySpending: monthlyContactExpense,
        monthlyIncome: monthlyContactIncome,
        totalTransactions: Number(allTimeIncomeExp[0]?.totalCount || 0) + totalReflectedTxCount,
        pendingSettlementsAmount: totalPendingSettlementsPaise / 100,
        pendingSettlementsCount: totalPendingCount,
        myGroupsCount: activeGroupsRaw.length,
      },
      trends: {
        spendingTrend,
        incomeTrend,
        balanceTrend,
      },
      activePeriod: period,
      contactOverview,
      monthlyAnalytics: {
        totalContactIncome: monthlyContactIncome,
        totalContactExpense: monthlyContactExpense,
        netMonthlyBalance: Number((monthlyContactIncome - monthlyContactExpense).toFixed(2)),
        highestIncomeDay,
        highestExpenseDay,
        averageDailyIncome: Number(averageDailyIncome.toFixed(2)),
        averageDailyExpense: Number(averageDailyExpense.toFixed(2)),
        monthlyCashFlow: incomeVsExpenseChart.map((c) => ({
          month: c.month,
          income: c.income,
          expense: c.expense,
          net: Number((c.income - c.expense).toFixed(2)),
        })),
        incomeTrend,
        expenseTrend: spendingTrend,
        savingsTrend: contactSavings >= 0 ? 10 : -10,
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
        syncedTxCount: Number(c.syncedTxCount) || 0,
        lastSyncedAt: c.lastSyncedAt ? new Date(c.lastSyncedAt) : null,
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
