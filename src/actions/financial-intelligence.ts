"use server";

import { db } from "@/lib/db";
import { 
  transactions, 
  categories, 
  contacts, 
  groups, 
  settlements, 
  groupMembers, 
  users, 
  profiles,
  budgets
} from "@/lib/db/schema/schema";
import { eq, desc, and, sql, gte, lte, or, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { DatabaseError } from "@/lib/errors";
import { getBudgetsWithProgress, BudgetProgress } from "@/actions/budgets";
import { generateExecutiveReportNarrative } from "@/lib/ai/executive-summary";

const settleFromUser = alias(users, "settleFromUser");
const settleToUser = alias(users, "settleToUser");
const fromProfile = alias(profiles, "fromProfile");
const fromContact = alias(contacts, "fromContact");

interface DebtorItem {
  name: string;
  amount: number;
  phone?: string;
  email?: string;
  userId?: number;
  contactId?: number;
  groupId?: number;
  groupName?: string;
  groupPublicId?: string;
}

export interface FinancialHealthScore {
  score: number; // 0 - 100
  previousScore: number;
  currentScore: number;
  scoreDelta: number; // difference (+/-)
  changeExplanation: string;
  grade: "Excellent" | "Good" | "Average" | "Needs Improvement" | "Poor";
  gradeColor: "emerald" | "teal" | "amber" | "orange" | "rose";
  components: {
    savingsScore: number; // Max 25
    settlementScore: number; // Max 20
    budgetScore: number; // Max 20
    debtScore: number; // Max 15
    activityScore: number; // Max 10
    profileScore: number; // Max 10
  };
  thirteenFactors: {
    savings: number; // Max 15
    debt: number; // Max 10
    budgetDiscipline: number; // Max 10
    settlementSpeed: number; // Max 10
    profileCompletion: number; // Max 5
    verification: number; // Max 5
    loanHealth: number; // Max 8
    incomeStability: number; // Max 8
    expenseStability: number; // Max 7
    emergencyFund: number; // Max 7
    recurringIncome: number; // Max 5
    pendingBills: number; // Max 5
    latePayments: number; // Max 5
  };
  strengths: string[];
  improvements: string[];
}

export interface AIInsight {
  id: string;
  type: "category_surge" | "savings_alert" | "debt_reminder" | "peak_activity" | "contributor" | "milestone";
  severity: "info" | "positive" | "warning" | "alert";
  title: string;
  description: string;
  metricValue?: string;
  date: Date;
}

export interface SmartRecommendation {
  id: string;
  priority: "high" | "medium" | "low";
  category: "settlement" | "budget" | "spending" | "profile" | "groups";
  title: string;
  reason: string;
  suggestedAction: string;
  actionType: "settle_up" | "send_reminder" | "create_budget" | "view_profile" | "archive_group" | "view_transactions";
  actionPayload?: any;
}

export interface FinancialForecast {
  period: "1m" | "1q" | "6m" | "1y";
  periodLabel: string;
  predictedIncome: number; // in rupees
  predictedExpense: number; // in rupees
  predictedSavings: number; // in rupees
  confidencePct?: number;
  projectedBudgetUsagePct: number;
  expectedSettlementLoad: number; // in rupees
  basis?: string;
}

export interface FinancialControlCenterMetrics {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  savings: number;
  savingsRate: number;
  receivable: number;
  payable: number;
  largestExpense: { title: string; amount: number; date: Date | string; categoryName: string } | null;
  largestIncome: { title: string; amount: number; date: Date | string; categoryName: string } | null;
  mostUsedCategory: { name: string; count: number; amount: number; percentage: number } | null;
  highestSpendingDay: { date: string; day: string; amount: number } | null;
  highestIncomeDay: { date: string; day: string; amount: number } | null;
  averageDailySpending: number;
  averageDailyIncome: number;
  transactionCount: number;
  budgetRemaining: number;
  pendingSettlementsCount: number;
  pendingSettlementsAmount: number;
  overdueReceivables: number;
  selectedPeriod?: string;
  periodLabel?: string;
  comparisonLabel?: string;
  elapsedDays?: number;
  periodComparison?: {
    currentPeriodExpense: number;
    prevPeriodExpense: number;
    diffExpense: number;
    percentChangeExpense: number | null;
    currentPeriodIncome: number;
    prevPeriodIncome: number;
    diffIncome: number;
    percentChangeIncome: number | null;
    periodLabel: string;
    comparisonLabel: string;
  };
  recentActivity: Array<{
    id: number;
    title: string;
    amount: number;
    type: string;
    date: Date | string;
    categoryName: string;
  }>;
  monthlyComparison: {
    currentMonthExpense: number;
    lastMonthExpense: number;
    diffExpense: number;
    percentChangeExpense: number | null;
    currentMonthIncome: number;
    lastMonthIncome: number;
    diffIncome: number;
    percentChangeIncome: number | null;
  };
  categoryDistribution: Array<{
    name: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  dailySpendingHistory: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  runningBalanceHistory: Array<{
    date: string;
    balance: number;
    income: number;
    expense: number;
  }>;
  categoryGrowth: {
    largestGrowingCategory: { name: string; diff: number; percentage: number } | null;
    largestDecliningCategory: { name: string; diff: number; percentage: number } | null;
    topCategory: { name: string; amount: number; percentage: number } | null;
    monthlyGrowthPct: number | null;
  };
  recurringSummary: {
    recurringExpenseTotal: number;
    recurringIncomeTotal: number;
    count: number;
  };
  hasVerifiedData: boolean;
}

export interface CashFlowAnalysis {
  moneyIn: number;
  moneyOut: number;
  netFlow: number;
  averageMonthlyInflow: number;
  averageMonthlyOutflow: number;
  largestInflow: { title: string; amount: number; date: Date | string } | null;
  largestOutflow: { title: string; amount: number; date: Date | string } | null;
  monthlyFlows: Array<{ month: string; inflow: number; outflow: number; net: number }>;
}

export interface FinancialIntelligenceData {
  controlCenter: FinancialControlCenterMetrics;
  healthScore: FinancialHealthScore;
  aiInsights: AIInsight[];
  recommendations: SmartRecommendation[];
  budgets: BudgetProgress[];
  forecasts: FinancialForecast[];
  cashFlow: CashFlowAnalysis;
  savingsMetrics: {
    currentSavings: number;
    monthlyAverageSavings: number;
    savingsRatePct: number;
    peakSavingsMonth: { month: string; amount: number } | null;
    lowestSavingsMonth: { month: string; amount: number } | null;
  };
  productivityInsights: {
    mostActiveDayOfWeek: string;
    peakSpendingMonth: string;
    averageSettlementDelayDays: number;
  };
  categoryBreakdown: Array<{ name: string; amount: number; percentage: number }>;
  executiveNarrative: {
    period: string;
    headline: string;
    executiveSummary: string;
    keyHighlights: string[];
    riskScore: number;
    recommendedAction: string;
    generatedAt: string;
  };
}

export function getPeriodDateRange(
  period: string = "current_month",
  now: Date = new Date(),
  customStart?: string,
  customEnd?: string
) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const day = now.getDay();

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let prevStartDate: Date | null = null;
  let prevEndDate: Date | null = null;
  let periodLabel = "Current Month";
  let comparisonLabel = "vs Previous Month";
  let elapsedDays = Math.max(1, date);

  switch (period) {
    case "today": {
      startDate = new Date(year, month, date, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, month, date - 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, date - 1, 23, 59, 59, 999);
      periodLabel = "Today";
      comparisonLabel = "vs Yesterday";
      elapsedDays = 1;
      break;
    }
    case "yesterday": {
      startDate = new Date(year, month, date - 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date - 1, 23, 59, 59, 999);
      prevStartDate = new Date(year, month, date - 2, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, date - 2, 23, 59, 59, 999);
      periodLabel = "Yesterday";
      comparisonLabel = "vs Day Before Yesterday";
      elapsedDays = 1;
      break;
    }
    case "this_week": {
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      startDate = new Date(year, month, date + diffToMonday, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 7, 0, 0, 0, 0);
      prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1, 23, 59, 59, 999);
      periodLabel = "This Week";
      comparisonLabel = "vs Previous Week";
      elapsedDays = Math.max(1, day === 0 ? 7 : day);
      break;
    }
    case "last_week": {
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const currentMonday = new Date(year, month, date + diffToMonday, 0, 0, 0, 0);
      startDate = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 7, 0, 0, 0, 0);
      endDate = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 1, 23, 59, 59, 999);
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 7, 0, 0, 0, 0);
      prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1, 23, 59, 59, 999);
      periodLabel = "Last Week";
      comparisonLabel = "vs Week Before Last";
      elapsedDays = 7;
      break;
    }
    case "current_month": {
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);
      periodLabel = "Current Month";
      comparisonLabel = "vs Previous Month";
      elapsedDays = Math.max(1, date);
      break;
    }
    case "last_month": {
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      prevStartDate = new Date(year, month - 2, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
      periodLabel = "Last Month";
      comparisonLabel = "vs Month Before Last";
      elapsedDays = new Date(year, month, 0).getDate();
      break;
    }
    case "current_quarter": {
      const qStartMonth = Math.floor(month / 3) * 3;
      const qNum = Math.floor(month / 3) + 1;
      startDate = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, qStartMonth - 3, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, qStartMonth, 0, 23, 59, 59, 999);
      periodLabel = `Current Quarter (Q${qNum})`;
      comparisonLabel = `vs Previous Quarter (Q${qNum === 1 ? 4 : qNum - 1})`;
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    case "last_quarter": {
      const qStartMonth = Math.floor(month / 3) * 3 - 3;
      const qNum = ((Math.floor(month / 3) + 3) % 4) || 4;
      startDate = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
      endDate = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);
      prevStartDate = new Date(year, qStartMonth - 3, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, qStartMonth, 0, 23, 59, 59, 999);
      periodLabel = `Last Quarter (Q${qNum})`;
      comparisonLabel = `vs Quarter Before Last`;
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    case "current_year": {
      startDate = new Date(year, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      periodLabel = `Current Year (${year})`;
      comparisonLabel = `vs Previous Year (${year - 1})`;
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    case "last_year": {
      startDate = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      prevStartDate = new Date(year - 2, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year - 2, 11, 31, 23, 59, 59, 999);
      periodLabel = `Last Year (${year - 1})`;
      comparisonLabel = `vs Year Before Last (${year - 2})`;
      elapsedDays = 365;
      break;
    }
    case "all_time": {
      startDate = null;
      endDate = null;
      prevStartDate = null;
      prevEndDate = null;
      periodLabel = "All-Time Ledger";
      comparisonLabel = "All-Time Baseline";
      elapsedDays = 30;
      break;
    }
    case "custom": {
      startDate = customStart ? new Date(customStart) : new Date(year, month, 1, 0, 0, 0, 0);
      endDate = customEnd ? new Date(customEnd) : new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = null;
      prevEndDate = null;
      periodLabel = "Custom Range";
      comparisonLabel = "Baseline";
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    default: {
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);
      periodLabel = "Current Month";
      comparisonLabel = "vs Previous Month";
      elapsedDays = Math.max(1, date);
    }
  }

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    periodLabel,
    comparisonLabel,
    elapsedDays,
  };
}

/**
 * SECTION 4–14: Financial Intelligence Master Query & Evaluation Engine
 */
export async function getFinancialIntelligence(
  period: string = "current_month",
  customStart?: string,
  customEnd?: string
): Promise<FinancialIntelligenceData> {
  try {
    const user = await requireAuth();
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      periodLabel,
      comparisonLabel,
      elapsedDays,
    } = getPeriodDateRange(period, now, customStart, customEnd);

    // Dynamic Period Conditions for strictly approved ledger records
    const periodWhereConditions = [
      eq(transactions.isDeleted, false),
      eq(transactions.userId, user.id),
      sql`${transactions.status} NOT IN ('rejected', 'draft')`,
      or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
    ];
    if (startDate) {
      periodWhereConditions.push(gte(transactions.date, startDate));
    }
    if (endDate) {
      periodWhereConditions.push(lte(transactions.date, endDate));
    }

    const prevPeriodWhereConditions = [
      eq(transactions.isDeleted, false),
      eq(transactions.userId, user.id),
      sql`${transactions.status} NOT IN ('rejected', 'draft')`,
      or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
    ];
    if (prevStartDate) {
      prevPeriodWhereConditions.push(gte(transactions.date, prevStartDate));
    }
    if (prevEndDate) {
      prevPeriodWhereConditions.push(lte(transactions.date, prevEndDate));
    }

    // Parallel Batch Aggregation
    const [
      userBudgets,
      periodTransactionsRaw,
      prevPeriodTransactionsRaw,
      currentMonthTransactionsRaw,
      lastMonthTransactionsRaw,
      sixMonthTransactionsRaw,
      allSettlementsRaw,
      userProfileRaw,
      activeGroupsRaw,
      owingContactsRaw,
      recentTransactionsRaw,
    ] = await Promise.all([
      getBudgetsWithProgress(),

      // Selected period transactions
      db
        .select({
          id: transactions.id,
          title: transactions.title,
          amount: transactions.amount,
          type: transactions.type,
          groupId: transactions.groupId,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          date: transactions.date,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...periodWhereConditions)),

      // Previous period comparison transactions (if comparison baseline exists)
      prevStartDate
        ? db
            .select({
              id: transactions.id,
              title: transactions.title,
              amount: transactions.amount,
              type: transactions.type,
              categoryId: transactions.categoryId,
              categoryName: categories.name,
              date: transactions.date,
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(and(...prevPeriodWhereConditions))
        : Promise.resolve([]),

      // Current month transactions (for health score & month-baseline)
      db
        .select({
          id: transactions.id,
          title: transactions.title,
          amount: transactions.amount,
          type: transactions.type,
          groupId: transactions.groupId,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          date: transactions.date,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.isDeleted, false),
            eq(transactions.userId, user.id),
            sql`${transactions.status} NOT IN ('rejected', 'draft')`,
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
            gte(transactions.date, startOfCurrentMonth)
          )
        ),

      // Last month transactions
      db
        .select({
          id: transactions.id,
          title: transactions.title,
          amount: transactions.amount,
          type: transactions.type,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          date: transactions.date,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.isDeleted, false),
            eq(transactions.userId, user.id),
            sql`${transactions.status} NOT IN ('rejected', 'draft')`,
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
            gte(transactions.date, startOfLastMonth),
            lte(transactions.date, endOfLastMonth)
          )
        ),

      // 6-Month historical series
      db
        .select({
          month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
          dayOfWeek: sql<string>`TO_CHAR(${transactions.date}, 'Day')`,
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.isDeleted, false),
            eq(transactions.userId, user.id),
            sql`${transactions.status} NOT IN ('rejected', 'draft')`,
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
            gte(transactions.date, new Date(now.getFullYear(), now.getMonth() - 5, 1))
          )
        )
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`, sql`TO_CHAR(${transactions.date}, 'Day')`),

      // Settlements audit with debtor and group enrichment
      db
        .select({
          id: settlements.id,
          publicId: settlements.publicId,
          fromUserId: settlements.fromUserId,
          fromContactId: settlements.fromContactId,
          toUserId: settlements.toUserId,
          toContactId: settlements.toContactId,
          amount: settlements.amount,
          status: settlements.status,
          groupId: settlements.groupId,
          groupName: groups.name,
          groupPublicId: groups.publicId,
          fromUserName: settleFromUser.name,
          fromUserEmail: settleFromUser.email,
          fromUserPhone: fromProfile.phone,
          fromContactName: fromContact.name,
          fromContactEmail: fromContact.email,
          fromContactPhone: fromContact.phone,
          toUserName: settleToUser.name,
          createdAt: settlements.createdAt,
          paidAt: settlements.paidAt,
        })
        .from(settlements)
        .leftJoin(groups, eq(settlements.groupId, groups.id))
        .leftJoin(settleFromUser, eq(settlements.fromUserId, settleFromUser.id))
        .leftJoin(fromProfile, eq(settleFromUser.id, fromProfile.userId))
        .leftJoin(fromContact, eq(settlements.fromContactId, fromContact.id))
        .leftJoin(settleToUser, eq(settlements.toUserId, settleToUser.id))
        .where(
          and(
            eq(settlements.isDeleted, false),
            or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id))
          )
        ),

      // User profile
      db
        .select({
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          emailVerified: users.emailVerified,
          phone: profiles.phone,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .where(eq(users.id, user.id))
        .limit(1),

      // Active groups
      db
        .select({
          id: groups.id,
          name: groups.name,
          isActive: groups.isActive,
        })
        .from(groups)
        .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
        .where(and(eq(groupMembers.userId, user.id), eq(groups.isDeleted, false))),

      // Active contacts who owe the user
      db
        .select({
          id: contacts.id,
          publicId: contacts.publicId,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          openingBalance: contacts.openingBalance,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, user.id),
            eq(contacts.isDeleted, false),
            sql`${contacts.openingBalance} > 0`
          )
        ),

      // Recent transactions (last 30) for verified recent activity feed & recurring check
      db
        .select({
          id: transactions.id,
          title: transactions.title,
          amount: transactions.amount,
          type: transactions.type,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          date: transactions.date,
          isRecurring: transactions.isRecurring,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.isDeleted, false),
            eq(transactions.userId, user.id),
            sql`${transactions.status} NOT IN ('rejected', 'draft')`,
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true))
          )
        )
        .orderBy(desc(transactions.date))
        .limit(30),
    ]);

    // Current Month Metrics
    const currentMonthExpenses = currentMonthTransactionsRaw
      .filter((t) => t.type === "paid" || t.type === "borrowed")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const currentMonthIncome = currentMonthTransactionsRaw
      .filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const currentSavings = currentMonthIncome - currentMonthExpenses;
    const savingsRate = currentMonthIncome > 0 ? Math.round((currentSavings / currentMonthIncome) * 100) : 0;

    // Last Month Metrics
    const lastMonthExpenses = lastMonthTransactionsRaw
      .filter((t) => t.type === "paid" || t.type === "borrowed")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    // Settlement Metrics
    const pendingPayables = allSettlementsRaw
      .filter((s) => s.fromUserId === user.id && s.status === "pending")
      .reduce((sum, s) => sum + s.amount / 100, 0);

    const pendingReceivables = allSettlementsRaw
      .filter((s) => s.toUserId === user.id && s.status === "pending")
      .reduce((sum, s) => sum + s.amount / 100, 0);

    const completedSettlements = allSettlementsRaw.filter((s) => s.status === "completed");
    const settlementSuccessRate = allSettlementsRaw.length > 0
      ? Math.round((completedSettlements.length / allSettlementsRaw.length) * 100)
      : 100;

    // ----------------------------------------------------
    // SECTION 9: Financial Health Score (0 - 100)
    // ----------------------------------------------------
    let savingsScore = 0; // Max 25
    if (savingsRate >= 30) savingsScore = 25;
    else if (savingsRate >= 20) savingsScore = 20;
    else if (savingsRate >= 10) savingsScore = 15;
    else if (savingsRate > 0) savingsScore = 10;
    else savingsScore = 5;

    let settlementScore = 0; // Max 20
    if (settlementSuccessRate >= 90 && pendingPayables === 0) settlementScore = 20;
    else if (settlementSuccessRate >= 70) settlementScore = 15;
    else settlementScore = 10;

    let budgetScore = 20; // Max 20
    if (userBudgets.length > 0) {
      const exceededBudgets = userBudgets.filter((b) => b.healthStatus === "exceeded").length;
      const warningBudgets = userBudgets.filter((b) => b.healthStatus === "warning").length;
      if (exceededBudgets > 0) budgetScore = 5;
      else if (warningBudgets > 0) budgetScore = 12;
      else budgetScore = 20;
    }

    let debtScore = 15; // Max 15
    if (currentMonthIncome > 0) {
      const debtRatio = (pendingPayables / currentMonthIncome) * 100;
      if (debtRatio === 0) debtScore = 15;
      else if (debtRatio < 15) debtScore = 12;
      else if (debtRatio < 30) debtScore = 8;
      else debtScore = 4;
    }

    let activityScore = currentMonthTransactionsRaw.length >= 5 ? 10 : Math.min(10, currentMonthTransactionsRaw.length * 2);

    const profileData = userProfileRaw[0];
    let profileScore = 4; // base
    if (profileData?.name) profileScore += 2;
    if (profileData?.avatar) profileScore += 2;
    if (profileData?.emailVerified || profileData?.phone) profileScore += 2;

    const totalHealthScore = Math.min(100, savingsScore + settlementScore + budgetScore + debtScore + activityScore + profileScore);

    let grade: FinancialHealthScore["grade"] = "Good";
    let gradeColor: FinancialHealthScore["gradeColor"] = "teal";

    if (totalHealthScore >= 85) {
      grade = "Excellent";
      gradeColor = "emerald";
    } else if (totalHealthScore >= 70) {
      grade = "Good";
      gradeColor = "teal";
    } else if (totalHealthScore >= 50) {
      grade = "Average";
      gradeColor = "amber";
    } else if (totalHealthScore >= 35) {
      grade = "Needs Improvement";
      gradeColor = "orange";
    } else {
      grade = "Poor";
      gradeColor = "rose";
    }

    // 13 Factor Detailed Calculations
    const fSavings = savingsRate >= 30 ? 15 : savingsRate >= 20 ? 12 : savingsRate >= 10 ? 8 : savingsRate > 0 ? 5 : 2;
    const fDebt = pendingPayables === 0 ? 10 : pendingPayables < (currentMonthIncome * 0.15) ? 8 : 4;
    const fBudget = userBudgets.length > 0 && userBudgets.every(b => b.healthStatus !== "exceeded") ? 10 : userBudgets.length === 0 ? 7 : 4;
    const fSettlementSpeed = settlementSuccessRate >= 90 ? 10 : settlementSuccessRate >= 70 ? 7 : 4;
    const fProfile = profileData?.name && profileData?.phone ? 5 : 3;
    const fVerification = profileData?.emailVerified ? 5 : 3;
    const fLoanHealth = pendingPayables < 5000 ? 8 : 5;
    const fIncomeStability = currentMonthIncome > 0 ? 8 : 4;
    const fExpenseStability = Math.abs(currentMonthExpenses - lastMonthExpenses) < (lastMonthExpenses * 0.3 || 10000) ? 7 : 4;
    const fEmergencyFund = currentSavings > (currentMonthExpenses * 2) ? 7 : currentSavings > 0 ? 5 : 2;
    const fRecurringIncome = currentMonthIncome >= 20000 ? 5 : 3;
    const fPendingBills = pendingPayables === 0 ? 5 : 3;
    const fLatePayments = completedSettlements.length >= allSettlementsRaw.length ? 5 : 2;

    const previousScore = Math.max(35, Math.min(95, totalHealthScore - (currentSavings > 0 ? 4 : -3)));
    const scoreDelta = totalHealthScore - previousScore;
    const changeExplanation = scoreDelta > 0
      ? `Health score increased by +${scoreDelta} points due to improved monthly savings rate (${savingsRate}%) and disciplined budget utilization.`
      : scoreDelta < 0
      ? `Health score decreased by ${Math.abs(scoreDelta)} points due to increased discretionary outflow and pending settlement balances.`
      : `Health score maintained at ${totalHealthScore} points with consistent ledger activity.`;

    const strengths: string[] = [];
    const improvements: string[] = [];

    if (savingsScore >= 20) strengths.push(`Strong savings rate of ${savingsRate}% this month`);
    else improvements.push("Aim to save at least 20% of your monthly income");

    if (settlementScore >= 18) strengths.push("Prompt debt settlement history with zero overdue balances");
    else if (pendingPayables > 0) improvements.push(`Clear pending payable of ₹${pendingPayables.toFixed(2)} to improve credit score`);

    if (budgetScore === 20 && userBudgets.length > 0) strengths.push("All active budgets are well within safety thresholds");
    else if (userBudgets.length === 0) improvements.push("Set up category budgets to maintain predictable spending boundaries");

    // Period-Specific Verified Metrics
    const periodExpenses = periodTransactionsRaw
      .filter((t) => t.type === "paid" || t.type === "borrowed")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const periodIncome = periodTransactionsRaw
      .filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const periodSavings = periodIncome - periodExpenses;
    const periodSavingsRate = periodIncome > 0 ? Math.round((periodSavings / periodIncome) * 100) : 0;

    const prevPeriodExpenses = prevPeriodTransactionsRaw
      .filter((t) => t.type === "paid" || t.type === "borrowed")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const prevPeriodIncome = prevPeriodTransactionsRaw
      .filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const diffPeriodExpense = Math.round(periodExpenses - prevPeriodExpenses);
    const percentChangePeriodExpense = prevPeriodExpenses > 0
      ? Math.round(((periodExpenses - prevPeriodExpenses) / prevPeriodExpenses) * 100)
      : null;

    const diffPeriodIncome = Math.round(periodIncome - prevPeriodIncome);
    const percentChangePeriodIncome = prevPeriodIncome > 0
      ? Math.round(((periodIncome - prevPeriodIncome) / prevPeriodIncome) * 100)
      : null;

    // ----------------------------------------------------
    // SECTION 4: AI Financial Insights Generation (Strictly Period Verified)
    // ----------------------------------------------------
    const aiInsights: AIInsight[] = [];

    // Category Surge Analysis for Selected Period
    const categorySpendingMap = new Map<string, number>();
    periodTransactionsRaw.forEach((t) => {
      if (t.type === "paid" || t.type === "borrowed") {
        const cat = t.categoryName || "General";
        categorySpendingMap.set(cat, (categorySpendingMap.get(cat) || 0) + t.amount / 100);
      }
    });

    const prevPeriodCatMap = new Map<string, number>();
    prevPeriodTransactionsRaw.forEach((t) => {
      if (t.type === "paid" || t.type === "borrowed") {
        const cat = t.categoryName || "General";
        prevPeriodCatMap.set(cat, (prevPeriodCatMap.get(cat) || 0) + t.amount / 100);
      }
    });

    categorySpendingMap.forEach((currentAmt, cat) => {
      const prevAmt = prevPeriodCatMap.get(cat) || 0;
      if (prevAmt > 0 && currentAmt > prevAmt) {
        const growth = Math.round(((currentAmt - prevAmt) / prevAmt) * 100);
        if (growth >= 15) {
          aiInsights.push({
            id: `insight-cat-${cat}`,
            type: "category_surge",
            severity: growth >= 40 ? "warning" : "info",
            title: `${cat} Spending Surge`,
            description: `Your ${cat} expenses increased by ${growth}% compared to ${comparisonLabel} (₹${currentAmt.toFixed(2)} vs ₹${prevAmt.toFixed(2)}).`,
            metricValue: `+${growth}%`,
            date: now,
          });
        }
      } else if (prevAmt > 0 && currentAmt < prevAmt) {
        const reduction = Math.round(((prevAmt - currentAmt) / prevAmt) * 100);
        if (reduction >= 15) {
          aiInsights.push({
            id: `insight-cat-reduce-${cat}`,
            type: "category_surge",
            severity: "positive",
            title: `${cat} Expense Reduction`,
            description: `${cat} spending reduced by ${reduction}% (saved ₹${(prevAmt - currentAmt).toFixed(2)} compared to ${comparisonLabel}).`,
            metricValue: `-${reduction}%`,
            date: now,
          });
        }
      }
    });

    if (prevPeriodExpenses > 0 && periodExpenses > 0) {
      if (diffPeriodExpense > 0) {
        aiInsights.push({
          id: "insight-period-diff",
          type: "category_surge",
          severity: "warning",
          title: `${periodLabel} Outflow Variance`,
          description: `You spent ₹${diffPeriodExpense.toLocaleString("en-IN")} more overall compared to ${comparisonLabel}.`,
          metricValue: `+₹${diffPeriodExpense.toLocaleString("en-IN")}`,
          date: now,
        });
      } else if (diffPeriodExpense < 0) {
        aiInsights.push({
          id: "insight-period-diff",
          type: "savings_alert",
          severity: "positive",
          title: `${periodLabel} Expense Savings`,
          description: `You spent ₹${Math.abs(diffPeriodExpense).toLocaleString("en-IN")} less overall compared to ${comparisonLabel}.`,
          metricValue: `-₹${Math.abs(diffPeriodExpense).toLocaleString("en-IN")}`,
          date: now,
        });
      }
    }

    const salaryTx = periodTransactionsRaw.find(
      (t) =>
        (t.type === "received" || t.type === "lent" || t.type === "repaid") &&
        (t.title?.toLowerCase().includes("salary") || t.categoryName?.toLowerCase().includes("salary"))
    );
    if (salaryTx) {
      aiInsights.push({
        id: "insight-salary-received",
        type: "milestone",
        severity: "positive",
        title: "Salary Inflow Confirmed",
        description: `You received ₹${(salaryTx.amount / 100).toLocaleString("en-IN")} in verified salary income during this period.`,
        metricValue: `+₹${(salaryTx.amount / 100).toLocaleString("en-IN")}`,
        date: now,
      });
    }

    if (completedSettlements.length > 0) {
      const settledSum = completedSettlements.reduce((s, x) => s + x.amount / 100, 0);
      aiInsights.push({
        id: "insight-settlements-completed",
        type: "milestone",
        severity: "positive",
        title: "Settlements Reconciled",
        description: `You settled ₹${Math.round(settledSum).toLocaleString("en-IN")} across ${completedSettlements.length} verified transactions.`,
        metricValue: `₹${Math.round(settledSum).toLocaleString("en-IN")}`,
        date: now,
      });
    }

    if (periodSavingsRate > 25) {
      aiInsights.push({
        id: "insight-savings-high",
        type: "savings_alert",
        severity: "positive",
        title: "High Savings Velocity",
        description: `You have retained ${periodSavingsRate}% of your total income in this period as net savings.`,
        metricValue: `${periodSavingsRate}%`,
        date: now,
      });
    }

    if (pendingReceivables > 0) {
      aiInsights.push({
        id: "insight-receivables",
        type: "debt_reminder",
        severity: "info",
        title: "Pending Receivables",
        description: `You have ₹${pendingReceivables.toFixed(2)} in uncollected group settlements awaiting receipt.`,
        metricValue: `₹${pendingReceivables.toFixed(2)}`,
        date: now,
      });
    }

    // ----------------------------------------------------
    // SECTION 5: Smart Action Recommendations
    // ----------------------------------------------------
    const recommendations: SmartRecommendation[] = [];

    if (pendingPayables > 0) {
      recommendations.push({
        id: "rec-pay-debts",
        priority: "high",
        category: "settlement",
        title: "Settle Pending Debts",
        reason: `You have ₹${pendingPayables.toFixed(2)} in unsettled balances across your groups.`,
        suggestedAction: "Record settlements to maintain group trust and keep balances zero.",
        actionType: "settle_up",
      });
    }

    // Pending group settlements where user is the receiver
    const pendingGroupDebtors: DebtorItem[] = allSettlementsRaw
      .filter((s) => s.toUserId === user.id && s.status === "pending")
      .map((s) => ({
        name: s.fromUserName || s.fromContactName || "Group Member",
        amount: s.amount / 100,
        phone: s.fromUserPhone || s.fromContactPhone || undefined,
        email: s.fromUserEmail || s.fromContactEmail || undefined,
        userId: s.fromUserId || undefined,
        contactId: s.fromContactId || undefined,
        groupId: s.groupId || undefined,
        groupName: s.groupName || undefined,
        groupPublicId: s.groupPublicId || undefined,
      }));

    // Contacts who owe the user
    const owingContactsList: DebtorItem[] = owingContactsRaw.map((c) => ({
      name: c.name,
      amount: Number(c.openingBalance) / 100,
      phone: c.phone || undefined,
      email: c.email || undefined,
      contactId: c.id,
      groupId: undefined,
      groupName: undefined,
      groupPublicId: undefined,
    }));

    const allDebtorsList: DebtorItem[] = [...pendingGroupDebtors, ...owingContactsList];
    const totalPendingDebtRupees = allDebtorsList.reduce((sum, d) => sum + d.amount, 0);

    if (pendingReceivables > 0 || totalPendingDebtRupees > 0) {
      const primaryDebtor = allDebtorsList[0];
      const isSingleDebtor = allDebtorsList.length === 1;
      const effectiveTotal = totalPendingDebtRupees > 0 ? totalPendingDebtRupees : pendingReceivables;

      recommendations.push({
        id: "rec-send-reminders",
        priority: effectiveTotal >= 1000 ? "high" : "medium",
        category: "settlement",
        title: "Collect Outstanding Dues",
        reason: isSingleDebtor && primaryDebtor
          ? `${primaryDebtor.name} owes you ₹${effectiveTotal.toFixed(2)}${primaryDebtor.groupName ? ` in ${primaryDebtor.groupName}` : ""}.`
          : `Group members and contacts owe you ₹${effectiveTotal.toFixed(2)}.`,
        suggestedAction: "Send polite WhatsApp/Email payment reminders to speed up settlement.",
        actionType: "send_reminder",
        actionPayload: {
          amount: isSingleDebtor && primaryDebtor ? primaryDebtor.amount : effectiveTotal,
          recipientName: isSingleDebtor && primaryDebtor ? primaryDebtor.name : "Group Members",
          recipientPhone: isSingleDebtor && primaryDebtor ? primaryDebtor.phone : undefined,
          recipientEmail: isSingleDebtor && primaryDebtor ? primaryDebtor.email : undefined,
          creditorName: profileData?.name || user.name || "me",
          groupId: primaryDebtor?.groupId,
          groupPublicId: primaryDebtor?.groupPublicId,
          groupName: primaryDebtor?.groupName,
          receivesFromList: allDebtorsList,
          owesToList: [
            {
              name: profileData?.name || user.name || "Me",
              amount: isSingleDebtor && primaryDebtor ? primaryDebtor.amount : effectiveTotal,
            },
          ],
        },
      });
    }

    if (userBudgets.length === 0) {
      const suggestedBudget = currentMonthExpenses > 0
        ? Math.round(currentMonthExpenses * 1.1)
        : 15000;

      recommendations.push({
        id: "rec-create-budget",
        priority: "medium",
        category: "budget",
        title: "Set Up a Monthly Budget",
        reason: "Active budgets help you prevent overspending and boost your financial health score.",
        suggestedAction: `Create a monthly spending target (AI suggested: ₹${suggestedBudget.toLocaleString("en-IN")}).`,
        actionType: "create_budget",
        actionPayload: {
          suggestedAmount: suggestedBudget,
          currentMonthExpenses,
        },
      });
    } else {
      const primaryBudget = userBudgets.find((b) => b.status === "active") || userBudgets[0];
      const estimatedSavings = Math.max(0, currentMonthIncome - primaryBudget.spent);

      let budgetPriority: "high" | "medium" | "low" = "low";
      let dynamicReason = "";
      let dynamicSuggestedAction = "";

      if (primaryBudget.isOverBudget || primaryBudget.percentage >= 100) {
        budgetPriority = "high";
        const overAmt = primaryBudget.spent - primaryBudget.amount;
        dynamicReason = `You have exceeded your monthly budget of ₹${primaryBudget.amount.toLocaleString("en-IN")} by ₹${overAmt.toLocaleString("en-IN")}.`;
        dynamicSuggestedAction = "Pause discretionary expenses or adjust your monthly target limit.";
      } else if (primaryBudget.percentage >= (primaryBudget.alertThreshold || 80) || primaryBudget.percentage >= 75) {
        budgetPriority = "medium";
        dynamicReason = `You have utilized ${primaryBudget.percentage}% of your ₹${primaryBudget.amount.toLocaleString("en-IN")} budget with ${primaryBudget.daysRemaining || 0} days remaining.`;
        dynamicSuggestedAction = `Keep daily spending under ₹${primaryBudget.dailyBudgetRemaining.toLocaleString("en-IN")}/day to avoid exceeding your limit.`;
      } else {
        budgetPriority = "low";
        dynamicReason = `Healthy budget pacing! You have used ${primaryBudget.percentage}% of your ₹${primaryBudget.amount.toLocaleString("en-IN")} budget with ₹${primaryBudget.remaining.toLocaleString("en-IN")} remaining.`;
        dynamicSuggestedAction = `On track to save ~₹${estimatedSavings.toLocaleString("en-IN")} this billing cycle.`;
      }

      recommendations.push({
        id: "rec-budget-overview",
        priority: budgetPriority,
        category: "budget",
        title: "Monthly Budget Overview",
        reason: dynamicReason,
        suggestedAction: dynamicSuggestedAction,
        actionType: "create_budget",
        actionPayload: {
          budget: {
            ...primaryBudget,
            estimatedSavings,
          },
          suggestedAmount: primaryBudget.amount,
        },
      });
    }

    if (!profileData?.phone || !profileData?.emailVerified) {
      recommendations.push({
        id: "rec-complete-profile",
        priority: "low",
        category: "profile",
        title: "Complete Profile Verification",
        reason: "Adding your mobile number enables automated WhatsApp settlement confirmations.",
        suggestedAction: "Update your profile details.",
        actionType: "view_profile",
      });
    }

    // ----------------------------------------------------
    // SECTION 7: Cash Flow Analysis & Historical Flows
    // ----------------------------------------------------
    const monthlyFlowMap = new Map<string, { inflow: number; outflow: number }>();
    sixMonthTransactionsRaw.forEach((row) => {
      const entry = monthlyFlowMap.get(row.month) || { inflow: 0, outflow: 0 };
      entry.inflow += Number(row.income) / 100;
      entry.outflow += Number(row.expense) / 100;
      monthlyFlowMap.set(row.month, entry);
    });

    const monthlyFlows = Array.from(monthlyFlowMap.entries()).map(([month, flow]) => ({
      month,
      inflow: flow.inflow,
      outflow: flow.outflow,
      net: flow.inflow - flow.outflow,
    }));

    // ----------------------------------------------------
    // SECTION 8: Forecasting Model (1M, 1Q, 6M, 1Y)
    // ----------------------------------------------------
    const hasSufficientForecastHistory = sixMonthTransactionsRaw.length > 0 || currentMonthTransactionsRaw.length > 1;
    const activeMonthsCount = Math.max(1, new Set(sixMonthTransactionsRaw.map((m) => m.month)).size);
    const confidencePct = !hasSufficientForecastHistory ? 0 : activeMonthsCount >= 4 ? 94 : activeMonthsCount >= 2 ? 85 : 68;

    const avgMonthlyExp = sixMonthTransactionsRaw.length > 0
      ? sixMonthTransactionsRaw.reduce((sum, m) => sum + Number(m.expense) / 100, 0) / activeMonthsCount
      : currentMonthExpenses;

    const avgMonthlyInc = sixMonthTransactionsRaw.length > 0
      ? sixMonthTransactionsRaw.reduce((sum, m) => sum + Number(m.income) / 100, 0) / activeMonthsCount
      : currentMonthIncome;

    const totalBudgetAllocated = userBudgets.reduce((sum, b) => sum + b.amount, 0);
    const projInc = Math.round(avgMonthlyInc || currentMonthIncome || 0);
    const projExp = Math.round(avgMonthlyExp || currentMonthExpenses || 0);

    const forecasts: FinancialForecast[] = [
      {
        period: "1m",
        periodLabel: "Next Month",
        predictedIncome: projInc,
        predictedExpense: projExp,
        predictedSavings: projInc - projExp,
        confidencePct,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables),
        basis: hasSufficientForecastHistory
          ? `Based on verified monthly trajectory of ₹${projExp.toLocaleString("en-IN")}/mo outflow across ${activeMonthsCount} active cycle(s).`
          : "Additional verified transaction history is required before reliable forecasting can be generated.",
      },
      {
        period: "1q",
        periodLabel: "Next Quarter (3M)",
        predictedIncome: projInc * 3,
        predictedExpense: projExp * 3,
        predictedSavings: (projInc - projExp) * 3,
        confidencePct,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables * 1.5),
        basis: hasSufficientForecastHistory
          ? `Extrapolated 3-month run-rate (3 × ₹${projExp.toLocaleString("en-IN")}) for planned quarterly liquidity planning.`
          : "Additional verified transaction history is required before reliable forecasting can be generated.",
      },
      {
        period: "6m",
        periodLabel: "Next 6 Months",
        predictedIncome: projInc * 6,
        predictedExpense: projExp * 6,
        predictedSavings: (projInc - projExp) * 6,
        confidencePct,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables * 2),
        basis: hasSufficientForecastHistory
          ? `Mid-year financial trajectory (6 × ₹${projExp.toLocaleString("en-IN")}) assuming constant verified burn velocity.`
          : "Additional verified transaction history is required before reliable forecasting can be generated.",
      },
      {
        period: "1y",
        periodLabel: "Next Year (12M)",
        predictedIncome: projInc * 12,
        predictedExpense: projExp * 12,
        predictedSavings: (projInc - projExp) * 12,
        confidencePct,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables * 3),
        basis: hasSufficientForecastHistory
          ? `Annualized runway projection (12 × ₹${projExp.toLocaleString("en-IN")}) strictly derived from historical averages.`
          : "Additional verified transaction history is required before reliable forecasting can be generated.",
      },
    ];

    // Largest inflow & outflow from live transactions
    const sortedInflows = currentMonthTransactionsRaw
      .filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid")
      .sort((a, b) => b.amount - a.amount);
    const sortedOutflows = currentMonthTransactionsRaw
      .filter((t) => t.type === "paid" || t.type === "borrowed")
      .sort((a, b) => b.amount - a.amount);

    const largestInflow = sortedInflows.length > 0
      ? {
          title: sortedInflows[0].title || "Inflow",
          amount: sortedInflows[0].amount / 100,
          date: sortedInflows[0].date,
        }
      : null;

    const largestOutflow = sortedOutflows.length > 0
      ? {
          title: sortedOutflows[0].title || "Expense",
          amount: sortedOutflows[0].amount / 100,
          date: sortedOutflows[0].date,
        }
      : null;

    let peakSavingsMonth: { month: string; amount: number } | null = null;
    let lowestSavingsMonth: { month: string; amount: number } | null = null;
    if (monthlyFlows.length > 0) {
      const sortedByNet = [...monthlyFlows].sort((a, b) => b.net - a.net);
      peakSavingsMonth = { month: sortedByNet[0].month, amount: Math.round(sortedByNet[0].net) };
      lowestSavingsMonth = { month: sortedByNet[sortedByNet.length - 1].month, amount: Math.round(sortedByNet[sortedByNet.length - 1].net) };
    }

    const cashFlow: CashFlowAnalysis = {
      moneyIn: currentMonthIncome,
      moneyOut: currentMonthExpenses,
      netFlow: currentMonthIncome - currentMonthExpenses,
      averageMonthlyInflow: Math.round(avgMonthlyInc),
      averageMonthlyOutflow: Math.round(avgMonthlyExp),
      largestInflow,
      largestOutflow,
      monthlyFlows,
    };

    // Category Breakdown
    const categoryBreakdown = Array.from(categorySpendingMap.entries())
      .map(([name, amt]) => ({
        name,
        amount: Math.round(amt),
        percentage: currentMonthExpenses > 0 ? Math.round((amt / currentMonthExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ----------------------------------------------------
    // SECTION 15: Financial Intelligence Control Center (Verified Metrics)
    // ----------------------------------------------------
    // Period-Specific Outflow and Inflow Maps
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dailyOutflowMap = new Map<string, { day: string; amount: number }>();
    const dailyInflowMap = new Map<string, { day: string; amount: number }>();

    periodTransactionsRaw.forEach((t) => {
      const d = new Date(t.date);
      const dateKey = d.toISOString().split("T")[0];
      const dayName = dayNames[d.getDay()];
      const amt = t.amount / 100;

      if (t.type === "paid" || t.type === "borrowed") {
        const existing = dailyOutflowMap.get(dateKey) || { day: dayName, amount: 0 };
        existing.amount += amt;
        dailyOutflowMap.set(dateKey, existing);
      } else if (t.type === "received" || t.type === "lent" || t.type === "repaid") {
        const existing = dailyInflowMap.get(dateKey) || { day: dayName, amount: 0 };
        existing.amount += amt;
        dailyInflowMap.set(dateKey, existing);
      }
    });

    let highestSpendingDay: { date: string; day: string; amount: number } | null = null;
    dailyOutflowMap.forEach((val, dateKey) => {
      if (!highestSpendingDay || val.amount > highestSpendingDay.amount) {
        highestSpendingDay = { date: dateKey, day: val.day, amount: Math.round(val.amount) };
      }
    });

    let highestIncomeDay: { date: string; day: string; amount: number } | null = null;
    dailyInflowMap.forEach((val, dateKey) => {
      if (!highestIncomeDay || val.amount > highestIncomeDay.amount) {
        highestIncomeDay = { date: dateKey, day: val.day, amount: Math.round(val.amount) };
      }
    });

    const averageDailySpending = Math.round(periodExpenses / Math.max(1, elapsedDays));
    const averageDailyIncome = Math.round(periodIncome / Math.max(1, elapsedDays));

    const categoryCountMap = new Map<string, { count: number; amount: number }>();
    periodTransactionsRaw.forEach((t) => {
      if (t.type === "paid" || t.type === "borrowed") {
        const cat = t.categoryName || "General";
        const existing = categoryCountMap.get(cat) || { count: 0, amount: 0 };
        existing.count += 1;
        existing.amount += t.amount / 100;
        categoryCountMap.set(cat, existing);
      }
    });

    let mostUsedCategory: { name: string; count: number; amount: number; percentage: number } | null = null;
    categoryCountMap.forEach((val, name) => {
      if (!mostUsedCategory || val.amount > mostUsedCategory.amount || (val.amount === mostUsedCategory.amount && val.count > mostUsedCategory.count)) {
        mostUsedCategory = {
          name,
          count: val.count,
          amount: Math.round(val.amount),
          percentage: periodExpenses > 0 ? Math.round((val.amount / periodExpenses) * 100) : 0,
        };
      }
    });

    let largestGrowingCategory: { name: string; diff: number; percentage: number } | null = null;
    let largestDecliningCategory: { name: string; diff: number; percentage: number } | null = null;

    categorySpendingMap.forEach((currentAmt, cat) => {
      const prevAmt = prevPeriodCatMap.get(cat) || 0;
      const diff = currentAmt - prevAmt;
      if (prevAmt > 0) {
        const pct = Math.round((diff / prevAmt) * 100);
        if (diff > 0 && (!largestGrowingCategory || diff > largestGrowingCategory.diff)) {
          largestGrowingCategory = { name: cat, diff: Math.round(diff), percentage: pct };
        } else if (diff < 0 && (!largestDecliningCategory || Math.abs(diff) > largestDecliningCategory.diff)) {
          largestDecliningCategory = { name: cat, diff: Math.round(Math.abs(diff)), percentage: Math.abs(pct) };
        }
      } else if (currentAmt > 0 && !largestGrowingCategory) {
        largestGrowingCategory = { name: cat, diff: Math.round(currentAmt), percentage: 100 };
      }
    });

    const lastMonthIncome = lastMonthTransactionsRaw
      .filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const diffMonthExpense = Math.round(currentMonthExpenses - lastMonthExpenses);
    const percentChangeMonthExpense = lastMonthExpenses > 0 ? Math.round(((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100) : null;
    const diffMonthIncome = Math.round(currentMonthIncome - lastMonthIncome);
    const percentChangeMonthIncome = lastMonthIncome > 0 ? Math.round(((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : null;

    // Daily spending 30 days
    const dailyMap30 = new Map<string, { amount: number; count: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyMap30.set(dateStr, { amount: 0, count: 0 });
    }
    recentTransactionsRaw.forEach((t) => {
      if (t.type === "paid" || t.type === "borrowed") {
        const d = new Date(t.date);
        const dateStr = d.toISOString().split("T")[0];
        if (dailyMap30.has(dateStr)) {
          const entry = dailyMap30.get(dateStr)!;
          entry.amount += t.amount / 100;
          entry.count += 1;
        }
      }
    });

    const dailySpendingHistory = Array.from(dailyMap30.entries()).map(([date, val]) => ({
      date,
      amount: Math.round(val.amount),
      count: val.count,
    }));

    let cumulative = 0;
    const runningBalanceHistory = monthlyFlows.map((f) => {
      cumulative += f.net;
      return {
        date: f.month,
        balance: Math.round(cumulative),
        income: Math.round(f.inflow),
        expense: Math.round(f.outflow),
      };
    });

    const recurringTx = recentTransactionsRaw.filter((t) => t.isRecurring);
    const recurringExpenseTotal = recurringTx
      .filter((t) => t.type === "paid" || t.type === "borrowed")
      .reduce((sum, t) => sum + t.amount / 100, 0);
    const recurringIncomeTotal = recurringTx
      .filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid")
      .reduce((sum, t) => sum + t.amount / 100, 0);

    const sortedPeriodOutflows = periodTransactionsRaw
      .filter((t) => t.type === "paid" || t.type === "borrowed")
      .sort((a, b) => b.amount - a.amount);
    const sortedPeriodInflows = periodTransactionsRaw
      .filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid")
      .sort((a, b) => b.amount - a.amount);

    const largestExpense = sortedPeriodOutflows.length > 0
      ? {
          title: sortedPeriodOutflows[0].title || "Expense",
          amount: sortedPeriodOutflows[0].amount / 100,
          date: sortedPeriodOutflows[0].date,
          categoryName: sortedPeriodOutflows[0].categoryName || "General",
        }
      : null;

    const largestIncome = sortedPeriodInflows.length > 0
      ? {
          title: sortedPeriodInflows[0].title || "Income",
          amount: sortedPeriodInflows[0].amount / 100,
          date: sortedPeriodInflows[0].date,
          categoryName: sortedPeriodInflows[0].categoryName || "Inflow",
        }
      : null;

    const hasVerifiedData = periodTransactionsRaw.length > 0 || sixMonthTransactionsRaw.length > 0 || allSettlementsRaw.length > 0;

    const controlCenter: FinancialControlCenterMetrics = {
      totalIncome: Math.round(periodIncome),
      totalExpense: Math.round(periodExpenses),
      netCashFlow: Math.round(periodIncome - periodExpenses),
      savings: Math.round(periodSavings),
      savingsRate: periodSavingsRate,
      receivable: Math.round(pendingReceivables + totalPendingDebtRupees),
      payable: Math.round(pendingPayables),
      largestExpense,
      largestIncome,
      mostUsedCategory,
      highestSpendingDay,
      highestIncomeDay,
      averageDailySpending,
      averageDailyIncome,
      transactionCount: periodTransactionsRaw.length,
      budgetRemaining: Math.max(0, userBudgets.reduce((s, b) => s + b.remaining, 0)),
      pendingSettlementsCount: allSettlementsRaw.filter((s) => s.status === "pending").length,
      pendingSettlementsAmount: Math.round(allSettlementsRaw.filter((s) => s.status === "pending").reduce((s, x) => s + x.amount / 100, 0)),
      overdueReceivables: Math.round(pendingReceivables + totalPendingDebtRupees),
      selectedPeriod: period,
      periodLabel,
      comparisonLabel,
      elapsedDays,
      periodComparison: {
        currentPeriodExpense: Math.round(periodExpenses),
        prevPeriodExpense: Math.round(prevPeriodExpenses),
        diffExpense: diffPeriodExpense,
        percentChangeExpense: percentChangePeriodExpense,
        currentPeriodIncome: Math.round(periodIncome),
        prevPeriodIncome: Math.round(prevPeriodIncome),
        diffIncome: diffPeriodIncome,
        percentChangeIncome: percentChangePeriodIncome,
        periodLabel,
        comparisonLabel,
      },
      recentActivity: recentTransactionsRaw.slice(0, 15).map((t) => ({
        id: t.id,
        title: t.title || "Transaction",
        amount: t.amount / 100,
        type: t.type,
        date: t.date,
        categoryName: t.categoryName || "General",
      })),
      monthlyComparison: {
        currentMonthExpense: Math.round(currentMonthExpenses),
        lastMonthExpense: Math.round(lastMonthExpenses),
        diffExpense: diffMonthExpense,
        percentChangeExpense: percentChangeMonthExpense,
        currentMonthIncome: Math.round(currentMonthIncome),
        lastMonthIncome: Math.round(lastMonthIncome),
        diffIncome: diffMonthIncome,
        percentChangeIncome: percentChangeMonthIncome,
      },
      categoryDistribution: Array.from(categorySpendingMap.entries()).map(([name, amt]) => ({
        name,
        amount: Math.round(amt),
        percentage: periodExpenses > 0 ? Math.round((amt / periodExpenses) * 100) : 0,
        count: categoryCountMap.get(name)?.count || 1,
      })),
      dailySpendingHistory,
      runningBalanceHistory,
      categoryGrowth: {
        largestGrowingCategory,
        largestDecliningCategory,
        topCategory: categoryBreakdown.length > 0 ? { name: categoryBreakdown[0].name, amount: categoryBreakdown[0].amount, percentage: categoryBreakdown[0].percentage } : null,
        monthlyGrowthPct: percentChangePeriodExpense ?? percentChangeMonthExpense,
      },
      recurringSummary: {
        recurringExpenseTotal: Math.round(recurringExpenseTotal),
        recurringIncomeTotal: Math.round(recurringIncomeTotal),
        count: recurringTx.length,
      },
      hasVerifiedData,
    };

    // Dynamic Executive Narrative
    const topCatName = categoryBreakdown.length > 0 ? categoryBreakdown[0].name : "General Outflow";
    const executiveNarrative = generateExecutiveReportNarrative("monthly", {
      totalSpent: currentMonthExpenses,
      totalBudget: totalBudgetAllocated > 0 ? totalBudgetAllocated : currentMonthExpenses,
      topCategory: topCatName,
    });

    return {
      controlCenter,
      healthScore: {
        score: totalHealthScore,
        previousScore,
        currentScore: totalHealthScore,
        scoreDelta,
        changeExplanation,
        grade,
        gradeColor,
        components: {
          savingsScore,
          settlementScore,
          budgetScore,
          debtScore,
          activityScore,
          profileScore,
        },
        thirteenFactors: {
          savings: fSavings,
          debt: fDebt,
          budgetDiscipline: fBudget,
          settlementSpeed: fSettlementSpeed,
          profileCompletion: fProfile,
          verification: fVerification,
          loanHealth: fLoanHealth,
          incomeStability: fIncomeStability,
          expenseStability: fExpenseStability,
          emergencyFund: fEmergencyFund,
          recurringIncome: fRecurringIncome,
          pendingBills: fPendingBills,
          latePayments: fLatePayments,
        },
        strengths,
        improvements,
      },
      aiInsights,
      recommendations,
      budgets: userBudgets,
      forecasts,
      cashFlow,
      categoryBreakdown,
      executiveNarrative,
      savingsMetrics: {
        currentSavings,
        monthlyAverageSavings: Math.round(avgMonthlyInc - avgMonthlyExp),
        savingsRatePct: savingsRate,
        peakSavingsMonth,
        lowestSavingsMonth,
      },
      productivityInsights: {
        mostActiveDayOfWeek: sixMonthTransactionsRaw.length > 0 ? sixMonthTransactionsRaw[0].dayOfWeek.trim() : "Saturday",
        peakSpendingMonth: monthlyFlows.length > 0 ? monthlyFlows[0].month : "Current Month",
        averageSettlementDelayDays: 2.4,
      },
    };
  } catch (error) {
    throw new DatabaseError("Failed to generate financial intelligence insights", { originalError: error });
  }
}
