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
  auditLogs,
  savedReports,
  scheduledReports,
  expenseSplits
} from "@/lib/db/schema/schema";
import { eq, desc, and, sql, gte, lte, or, inArray, ilike, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { ValidationError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { generateReportId, generateScheduleId, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { 
  generateCSVExport, 
  generateJSONExport, 
  generatePrintableHTMLReport, 
  generateExcelWorkbook,
  type ExportReportData,
  type ExportTransactionItem
} from "@/lib/export/export-engine";
import { getDashboardData } from "@/actions/dashboard";
import { revalidatePath } from "next/cache";

export interface ReportFilterOptions {
  reportType?: 
    | "overview"
    | "personal" 
    | "group" 
    | "individual_group" 
    | "member" 
    | "settlement" 
    | "category" 
    | "monthly" 
    | "weekly" 
    | "daily" 
    | "custom" 
    | "payment_method" 
    | "activity" 
    | "audit_logs";
  period?: 
    | "today" 
    | "yesterday" 
    | "this_week" 
    | "last_week" 
    | "this_month" 
    | "last_month" 
    | "quarter" 
    | "year" 
    | "7d" 
    | "30d" 
    | "3m" 
    | "1y" 
    | "custom" 
    | "all";
  startDate?: string | Date;
  endDate?: string | Date;
  groupId?: number;
  contactId?: number;
  categoryId?: number;
  paymentMethod?: string;
  type?: string;
  status?: string;
  minAmount?: number; // in paise
  maxAmount?: number; // in paise
  hasReceipt?: boolean;
  tag?: string;
  search?: string;
  sortBy?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "title_asc";
  page?: number;
  limit?: number;
  reportScope?: "combined" | "group" | "personal";
}

/**
 * Standardized Date Window Calculation Helper
 * Supports current period [startDate, endDate] and comparison prior period [prevStartDate, prevEndDate]
 */
function calculateDateWindows(
  period?: string,
  customStart?: string | Date,
  customEnd?: string | Date
) {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined = now;
  let prevStartDate: Date | undefined;
  let prevEndDate: Date | undefined;

  switch (period) {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    }
    case "yesterday": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59, 999);
      break;
    }
    case "this_week":
    case "7d": {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevEndDate = startDate;
      break;
    }
    case "last_week": {
      const day = now.getDay() || 7;
      const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 1, 23, 59, 59, 999);
      startDate = lastMonday;
      endDate = lastSunday;
      prevStartDate = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() - 7);
      prevEndDate = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() - 1, 23, 59, 59, 999);
      break;
    }
    case "this_month":
    case "30d": {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevEndDate = startDate;
      break;
    }
    case "last_month": {
      const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      startDate = firstLastMonth;
      endDate = lastDayLastMonth;
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      break;
    }
    case "quarter":
    case "3m": {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = now;
      prevStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      prevEndDate = startDate;
      break;
    }
    case "year":
    case "1y": {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      endDate = now;
      prevStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      prevEndDate = startDate;
      break;
    }
    case "custom": {
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
      if (startDate && endDate) {
        const span = endDate.getTime() - startDate.getTime();
        prevStartDate = new Date(startDate.getTime() - span);
        prevEndDate = startDate;
      }
      break;
    }
    default: {
      // "all"
      startDate = undefined;
      endDate = undefined;
      prevStartDate = undefined;
      prevEndDate = undefined;
      break;
    }
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
}

/**
 * Helper to compute 7-point real sparkline series
 */
function buildSparkline(
  items: Array<{ date: Date | string; amount: number }>,
  startDate?: Date,
  endDate?: Date
): number[] {
  if (items.length === 0) return [0, 0, 0, 0, 0, 0, 0];

  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const start = startDate 
    ? new Date(startDate).getTime() 
    : items.length > 0 ? Math.min(...items.map((i) => new Date(i.date).getTime())) : end - 30 * 24 * 3600 * 1000;

  const duration = Math.max(1, end - start);
  const step = duration / 7;
  const buckets = [0, 0, 0, 0, 0, 0, 0];

  for (const item of items) {
    const t = new Date(item.date).getTime();
    if (t < start || t > end) continue;
    const bucketIndex = Math.min(6, Math.max(0, Math.floor((t - start) / step)));
    buckets[bucketIndex] += Number(item.amount) / 100;
  }

  // Round values
  return buckets.map((v) => Number(v.toFixed(1)));
}

/**
 * Financial Health Score Calculator (0-100)
 */
function calculateFinancialHealth({
  settlementCompletionRate,
  savingsRate,
  moneyYouOwe,
  totalExpense,
  expenseGrowth,
  hasTransactions,
}: {
  settlementCompletionRate: number;
  savingsRate: number;
  moneyYouOwe: number;
  totalExpense: number;
  expenseGrowth: number;
  hasTransactions: boolean;
}) {
  if (!hasTransactions) {
    return {
      score: 80,
      grade: "A" as const,
      label: "Balanced Baseline",
      breakdown: {
        settlementCompletion: 20,
        savingsRatio: 20,
        debtStability: 16,
        expensePredictability: 12,
        groupEngagement: 12,
      },
      improvementTips: [
        "Record transactions regularly to establish predictive spending baselines.",
        "Use UPI QR settlement to resolve group debts instantly.",
      ],
    };
  }

  // 1. Settlement Completion (max 25)
  const settlementScore = Math.min(25, Math.max(5, Math.round((settlementCompletionRate / 100) * 25)));

  // 2. Savings Ratio (max 25)
  let savingsScore = 15;
  if (savingsRate >= 35) savingsScore = 25;
  else if (savingsRate >= 20) savingsScore = 22;
  else if (savingsRate >= 10) savingsScore = 18;
  else if (savingsRate >= 0) savingsScore = 14;
  else if (savingsRate >= -20) savingsScore = 8;
  else savingsScore = 4;

  // 3. Debt Stability vs Outflows (max 20)
  let debtScore = 18;
  const debtRatio = totalExpense > 0 ? moneyYouOwe / totalExpense : 0;
  if (moneyYouOwe === 0) debtScore = 20;
  else if (debtRatio < 0.2) debtScore = 18;
  else if (debtRatio < 0.5) debtScore = 14;
  else if (debtRatio < 1.0) debtScore = 10;
  else debtScore = 5;

  // 4. Expense Predictability & Volatility (max 15)
  let expenseScore = 13;
  if (Math.abs(expenseGrowth) <= 15) expenseScore = 15;
  else if (Math.abs(expenseGrowth) <= 30) expenseScore = 12;
  else if (Math.abs(expenseGrowth) <= 60) expenseScore = 9;
  else expenseScore = 6;

  // 5. Group Engagement & Platform Utilization (max 15)
  const engagementScore = 14;

  const total = Math.min(100, Math.max(0, settlementScore + savingsScore + debtScore + expenseScore + engagementScore));

  let grade: "A+" | "A" | "B" | "C" | "D" = "B";
  let label = "Moderate Financial Health";
  if (total >= 90) { grade = "A+"; label = "Elite Financial Health"; }
  else if (total >= 78) { grade = "A"; label = "Strong Financial Health"; }
  else if (total >= 65) { grade = "B"; label = "Good Financial Health"; }
  else if (total >= 50) { grade = "C"; label = "Moderate Financial Health"; }
  else { grade = "D"; label = "Needs Immediate Attention"; }

  const tips: string[] = [];
  if (settlementCompletionRate < 80) {
    tips.push("Accelerate settlement turnaround to boost credit reliability across groups.");
  }
  if (savingsRate < 20) {
    tips.push("Target a minimum 20% savings margin by trimming discretionary categories.");
  }
  if (debtRatio > 0.3) {
    tips.push("Pay down outstanding liabilities to keep debt-to-expense ratio below 20%.");
  }
  if (expenseGrowth > 25) {
    tips.push("Spending expanded rapidly compared to the previous period; set category caps.");
  }
  if (tips.length === 0) {
    tips.push("Excellent financial discipline! Keep settlement turnarounds swift.");
    tips.push("Consider parking surplus liquidity in short-term interest-bearing instruments.");
  }

  return {
    score: total,
    grade,
    label,
    breakdown: {
      settlementCompletion: settlementScore,
      savingsRatio: savingsScore,
      debtStability: debtScore,
      expensePredictability: expenseScore,
      groupEngagement: engagementScore,
    },
    improvementTips: tips,
  };
}

/**
 * SECTION 1: Report Dashboard Summary Cards
 * Consumes the central Financial Engine (getDashboardData) to ensure 100% mathematical consistency.
 */
export async function getReportDashboardSummary() {
  try {
    const dashboardData = await getDashboardData();

    // Additional rolling 30d metrics
    const user = await requireAuth();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [largestExpenseRow, largestCatRow, activeGroupRow] = await Promise.all([
      db
        .select({
          amount: transactions.amount,
          title: transactions.title,
          description: transactions.description,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
            sql`${transactions.type} IN ('paid', 'borrowed')`
          )
        )
        .orderBy(desc(transactions.amount))
        .limit(1),

      db
        .select({
          name: categories.name,
          amount: sql<number>`SUM(${transactions.amount})`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
            sql`${transactions.type} IN ('paid', 'borrowed')`
          )
        )
        .groupBy(categories.id, categories.name)
        .orderBy(sql`SUM(${transactions.amount}) DESC`)
        .limit(1),

      db
        .select({
          name: groups.name,
          txCount: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .innerJoin(groups, eq(transactions.groupId, groups.id))
        .where(
          and(
            eq(transactions.isDeleted, false),
            or(
              eq(transactions.userId, user.id),
              sql`${transactions.groupId} IN (
                SELECT id FROM groups WHERE created_by = ${user.id} AND is_deleted = false
                UNION
                SELECT group_id FROM group_members WHERE user_id = ${user.id}
              )`
            )
          )
        )
        .groupBy(groups.id, groups.name)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(1),
    ]);

    const monthlyExpense = dashboardData.summary.monthlySpending;
    const monthlyIncome = dashboardData.summary.monthlyIncome;
    const monthlySaving = Math.max(0, monthlyIncome - monthlyExpense);
    const avgDailySpending = Number((monthlyExpense / 30).toFixed(2));

    const largestExpense = {
      amount: largestExpenseRow[0] ? Number(largestExpenseRow[0].amount) / 100 : 0,
      title: largestExpenseRow[0]?.title || largestExpenseRow[0]?.description || "None",
    };

    const largestCategory = {
      name: largestCatRow[0]?.name || "General",
      amount: largestCatRow[0] ? Number(largestCatRow[0].amount) / 100 : 0,
    };

    const mostActiveGroup = {
      name: activeGroupRow[0]?.name || "None",
      count: activeGroupRow[0] ? Number(activeGroupRow[0].txCount) : 0,
    };

    const settlementCompletionRate = dashboardData.summary.pendingSettlementsCount === 0 
      ? 100 
      : Math.round((1 / (dashboardData.summary.pendingSettlementsCount + 1)) * 100);

    const health = calculateFinancialHealth({
      settlementCompletionRate,
      savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0,
      moneyYouOwe: dashboardData.summary.totalPayable,
      totalExpense: monthlyExpense,
      expenseGrowth: dashboardData.trends.spendingTrend || 0,
      hasTransactions: dashboardData.summary.totalTransactions > 0,
    });

    return {
      totalIncome: dashboardData.personalStats.personalIncome,
      totalExpense: dashboardData.summary.monthlySpending,
      netBalance: dashboardData.summary.netBalance,
      totalReceivable: dashboardData.summary.totalReceivable,
      totalPayable: dashboardData.summary.totalPayable,
      totalSettlements: dashboardData.summary.pendingSettlementsAmount,
      totalSettlementCount: dashboardData.summary.pendingSettlementsCount,
      pendingSettlementsCount: dashboardData.summary.pendingSettlementsCount,
      activeGroupsCount: dashboardData.summary.myGroupsCount,
      personalTxCount: dashboardData.personalStats.personalTransactionsCount,
      groupTxCount: dashboardData.groupStats.totalGroups,
      totalMembersCount: dashboardData.groupStats.totalGroupMembers,
      totalTransactions: dashboardData.summary.totalTransactions,
      // Extended Enterprise KPIs
      monthlySpending: monthlyExpense,
      monthlySaving,
      avgDailySpending,
      largestExpense,
      largestCategory,
      mostActiveGroup,
      financialHealthScore: health.score,
      financialHealthGrade: health.grade,
      financialHealthLabel: health.label,
    };
  } catch (error) {
    throw new DatabaseError("Failed to calculate report dashboard summary", { originalError: error });
  }
}

/**
/**
 * SECTION 2: Centralized Comprehensive Financial Model
 * Reconciles Group Financial Activity and Personal Financial Activity with 100% mathematical precision.
 * Distinguishes between:
 * 1. Overall Group Financial Activity (All members combined)
 * 2. My Personal Financial Activity (Logged-in user ONLY)
 * 3. Payment Summary (My vs Others, Shared vs Personal)
 * 4. My Transactions & Group Transactions
 */
function computeComprehensiveFinancialModel({
  user,
  targetGroupIds,
  transactionsList,
  splitsList,
  settlementsList,
  groupMembersList,
  daysCount = 30,
}: {
  user: { id: number; name?: string | null; email?: string | null };
  targetGroupIds: number[];
  transactionsList: any[];
  splitsList: any[];
  settlementsList: any[];
  groupMembersList: Array<{ groupId: number; userId: number | null }>;
  daysCount?: number;
}) {
  const splitsByTx = new Map<number, any[]>();
  splitsList.forEach((s) => {
    const arr = splitsByTx.get(s.transactionId) || [];
    arr.push(s);
    splitsByTx.set(s.transactionId, arr);
  });

  const membersByGroup = new Map<number, number>();
  groupMembersList.forEach((m) => {
    membersByGroup.set(m.groupId, (membersByGroup.get(m.groupId) || 0) + 1);
  });

  // Group Financial Accumulators
  let totalGroupExpense = 0;
  let totalGroupIncome = 0;
  let totalGroupTransactions = 0;
  let largestGroupTx = { title: "None", amount: 0, groupName: "None", date: "", paidBy: "None" };
  const groupExpenseByGroup = new Map<string, number>();
  const groupCategoryMap = new Map<string, { total: number; count: number }>();
  const groupPaymentMethodMap = new Map<string, { total: number; count: number }>();
  const groupMonthlyMap = new Map<string, { expense: number; income: number }>();

  // Personal Financial Accumulators
  let totalPaidByMe = 0;
  let totalPaidByMeInGroups = 0;
  let totalPaidByOthersInGroup = 0;
  let totalPersonalExpenses = 0;
  let myTotalSpending = 0;
  let myTotalIncome = 0;
  let myPersonalTxCount = 0;
  let largestPersonalTx = { title: "None", amount: 0, category: "General", date: "" };
  const personalCategoryMap = new Map<string, { total: number; count: number }>();
  const personalPaymentMethodMap = new Map<string, { total: number; count: number }>();
  const personalMonthlyMap = new Map<string, { expense: number; income: number }>();

  // Itemized lists
  const myTxList: any[] = [];
  const groupTxList: any[] = [];
  const expenseTxList: Array<{ date: Date | string; amount: number; title: string; category?: string }> = [];

  for (const tx of transactionsList) {
    const amtRupees = Number(tx.amount) / 100;
    const isGroup = tx.groupId !== null && targetGroupIds.includes(tx.groupId);
    const isUserPayer = tx.paidBy === user.id || (tx.paidBy === null && (tx.createdBy === user.id || tx.userId === user.id));
    const monthKey = tx.date ? new Date(tx.date).toISOString().slice(0, 7) : "2026-10";

    const txSplits = splitsByTx.get(tx.id) || [];
    const userSplit = txSplits.find((s) => s.userId === user.id);

    let myShare = 0;
    if (!isGroup) {
      myShare = amtRupees;
    } else if (userSplit) {
      myShare = Number(userSplit.amount) / 100;
    } else if (txSplits.length === 0) {
      const memCount = membersByGroup.get(tx.groupId!) || 2;
      myShare = Number((amtRupees / memCount).toFixed(2));
    } else {
      myShare = 0;
    }

    const otherMembersShare = isGroup ? Math.max(0, Number((amtRupees - myShare).toFixed(2))) : 0;
    const isUserParticipant = isUserPayer || tx.userId === user.id || tx.createdBy === user.id || myShare > 0;

    // Group Accounting
    if (isGroup) {
      totalGroupTransactions++;
      const gName = tx.groupName || "Group";
      const catName = tx.categoryName || "General";
      const pMethod = tx.paymentMethod || "UPI";

      if (tx.type === "paid" || tx.type === "borrowed") {
        totalGroupExpense += amtRupees;
        groupExpenseByGroup.set(gName, (groupExpenseByGroup.get(gName) || 0) + amtRupees);

        const gCat = groupCategoryMap.get(catName) || { total: 0, count: 0 };
        gCat.total += amtRupees;
        gCat.count += 1;
        groupCategoryMap.set(catName, gCat);

        const gPm = groupPaymentMethodMap.get(pMethod) || { total: 0, count: 0 };
        gPm.total += amtRupees;
        gPm.count += 1;
        groupPaymentMethodMap.set(pMethod, gPm);

        const gM = groupMonthlyMap.get(monthKey) || { expense: 0, income: 0 };
        gM.expense += amtRupees;
        groupMonthlyMap.set(monthKey, gM);

        if (amtRupees > largestGroupTx.amount) {
          largestGroupTx = {
            title: tx.title || tx.description,
            amount: amtRupees,
            groupName: gName,
            date: formatDate(tx.date),
            paidBy: isUserPayer ? "You" : (tx.paidByName || "Member"),
          };
        }

        if (isUserPayer) {
          totalPaidByMe += amtRupees;
          totalPaidByMeInGroups += amtRupees;
        } else {
          totalPaidByOthersInGroup += amtRupees;
        }
      } else if (tx.type === "received" || tx.type === "lent" || tx.type === "repaid") {
        totalGroupIncome += amtRupees;
        const gM = groupMonthlyMap.get(monthKey) || { expense: 0, income: 0 };
        gM.income += amtRupees;
        groupMonthlyMap.set(monthKey, gM);
      }

      groupTxList.push({
        id: tx.id,
        publicId: tx.publicId,
        title: tx.title || tx.description,
        description: tx.description,
        groupName: tx.groupName || "Group",
        groupId: tx.groupId,
        totalAmount: amtRupees,
        paidByName: isUserPayer ? "You" : (tx.paidByName || "Member"),
        splitBetween: txSplits.length > 0 ? `${txSplits.length} members` : `${membersByGroup.get(tx.groupId!) || 2} members`,
        splitMethod: txSplits[0]?.splitMethod || tx.splitMethod || "equal",
        myShare,
        otherMembersShare,
        pendingAmount: tx.status === "pending" ? amtRupees : 0,
        completedAmount: tx.status === "completed" ? amtRupees : 0,
        settlementStatus: tx.status,
        date: tx.date,
        categoryName: tx.categoryName || "General",
        paymentMethod: tx.paymentMethod || "UPI",
      });
    } else {
      // Purely personal transaction
      if (tx.type === "paid" || tx.type === "borrowed") {
        totalPersonalExpenses += amtRupees;
        if (isUserPayer) totalPaidByMe += amtRupees;
      }
    }

    // Personal Accounting (Only user's money!)
    if (isUserParticipant) {
      myPersonalTxCount++;
      const catName = tx.categoryName || "General";
      const pMethod = tx.paymentMethod || "UPI";

      if (tx.type === "paid" || tx.type === "borrowed") {
        myTotalSpending += myShare;
        expenseTxList.push({
          date: tx.date,
          amount: myShare * 100,
          title: tx.title || tx.description || "Expense",
          category: catName,
        });

        const pCat = personalCategoryMap.get(catName) || { total: 0, count: 0 };
        pCat.total += myShare;
        pCat.count += 1;
        personalCategoryMap.set(catName, pCat);

        const pPm = personalPaymentMethodMap.get(pMethod) || { total: 0, count: 0 };
        pPm.total += myShare;
        pPm.count += 1;
        personalPaymentMethodMap.set(pMethod, pPm);

        const pM = personalMonthlyMap.get(monthKey) || { expense: 0, income: 0 };
        pM.expense += myShare;
        personalMonthlyMap.set(monthKey, pM);

        if (myShare > largestPersonalTx.amount) {
          largestPersonalTx = {
            title: tx.title || tx.description,
            amount: myShare,
            category: catName,
            date: formatDate(tx.date),
          };
        }
      } else if (tx.type === "received" || tx.type === "lent" || tx.type === "repaid") {
        myTotalIncome += amtRupees;
        const pM = personalMonthlyMap.get(monthKey) || { expense: 0, income: 0 };
        pM.income += amtRupees;
        personalMonthlyMap.set(monthKey, pM);
      }

      const amountIPaidForThis = isUserPayer ? amtRupees : 0;
      myTxList.push({
        id: tx.id,
        publicId: tx.publicId,
        title: tx.title || tx.description,
        description: tx.description,
        date: tx.date,
        amountPaid: amountIPaidForThis,
        myShare,
        categoryName: catName,
        groupName: tx.groupName || "Personal",
        splitType: txSplits[0]?.splitMethod ? txSplits[0].splitMethod.toUpperCase() : "Equal",
        settlementStatus: tx.status,
        paymentMethod: pMethod,
        runningBalance: 0,
        type: tx.type,
        status: tx.status,
        isUserPayer,
      });
    }
  }

  // Chronological running balance for My Transactions
  myTxList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningBal = 0;
  for (const item of myTxList) {
    if (item.type === "received" || item.type === "repaid") {
      runningBal += item.amountPaid > 0 ? item.amountPaid : item.myShare;
    } else {
      runningBal -= item.amountPaid > 0 ? item.amountPaid : item.myShare;
    }
    item.runningBalance = Number(runningBal.toFixed(2));
  }
  myTxList.reverse(); // Newest first

  // Settlements Accounting
  let pendingGroupAmount = 0;
  let pendingGroupCount = 0;
  let completedGroupAmount = 0;
  let completedGroupCount = 0;

  let userPendingReceivable = 0;
  let userPendingPayable = 0;
  let userPendingCount = 0;
  let userCompletedCount = 0;
  let userCompletedAmount = 0;
  let totalSettlementVolume = 0;

  for (const s of settlementsList) {
    const sAmt = Number(s.amount) / 100;
    totalSettlementVolume += sAmt;
    const isGroupS = s.groupId !== null && targetGroupIds.includes(s.groupId);

    if (isGroupS) {
      if (s.status === "pending") {
        pendingGroupAmount += sAmt;
        pendingGroupCount++;
      } else if (s.status === "completed") {
        completedGroupAmount += sAmt;
        completedGroupCount++;
      }
    }

    const isUserCreditor = s.toUserId === user.id;
    const isUserDebtor = s.fromUserId === user.id;

    if (isUserCreditor || isUserDebtor) {
      if (s.status === "pending") {
        userPendingCount++;
        if (isUserCreditor) userPendingReceivable += sAmt;
        if (isUserDebtor) userPendingPayable += sAmt;
      } else if (s.status === "completed") {
        userCompletedCount++;
        userCompletedAmount += sAmt;
      }
    }
  }

  // Top spending group
  let topGroup = { name: "None", amount: 0 };
  groupExpenseByGroup.forEach((amt, name) => {
    if (amt > topGroup.amount) topGroup = { name, amount: amt };
  });

  const totalMembersCount = new Set(groupMembersList.map((m) => m.userId).filter(Boolean)).size || Math.max(1, targetGroupIds.length * 2);
  const myAverageTransaction = myPersonalTxCount > 0 ? Number((myTotalSpending / myPersonalTxCount).toFixed(2)) : 0;
  const groupAverageExpense = totalGroupTransactions > 0 ? Number((totalGroupExpense / totalGroupTransactions).toFixed(2)) : 0;
  const myNetBalance = Number((userPendingReceivable - userPendingPayable).toFixed(2));
  const mySavings = Math.max(0, Number((myTotalIncome - myTotalSpending).toFixed(2)));

  const health = calculateFinancialHealth({
    settlementCompletionRate: userCompletedCount + userPendingCount > 0
      ? Math.round((userCompletedCount / (userCompletedCount + userPendingCount)) * 100)
      : 100,
    savingsRate: myTotalIncome > 0 ? ((myTotalIncome - myTotalSpending) / myTotalIncome) * 100 : 0,
    moneyYouOwe: userPendingPayable,
    totalExpense: myTotalSpending,
    expenseGrowth: 0,
    hasTransactions: myTxList.length > 0,
  });

  // Category distributions
  const totalGroupCatVol = Array.from(groupCategoryMap.values()).reduce((sum, c) => sum + c.total, 0) || 1;
  const groupCategoryBreakdown = Array.from(groupCategoryMap.entries())
    .map(([name, stat]) => ({
      name,
      value: Number(stat.total.toFixed(2)),
      count: stat.count,
      percentage: Number(((stat.total / totalGroupCatVol) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value);

  const totalPersonalCatVol = Array.from(personalCategoryMap.values()).reduce((sum, c) => sum + c.total, 0) || 1;
  const personalCategoryBreakdown = Array.from(personalCategoryMap.entries())
    .map(([name, stat]) => ({
      name,
      value: Number(stat.total.toFixed(2)),
      count: stat.count,
      percentage: Number(((stat.total / totalPersonalCatVol) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value);

  // Payment Methods
  const totalGroupPmVol = Array.from(groupPaymentMethodMap.values()).reduce((sum, p) => sum + p.total, 0) || 1;
  const groupPaymentMethods = Array.from(groupPaymentMethodMap.entries())
    .map(([name, stat]) => ({
      name,
      amount: Number(stat.total.toFixed(2)),
      count: stat.count,
      percentage: Number(((stat.total / totalGroupPmVol) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalPersonalPmVol = Array.from(personalPaymentMethodMap.values()).reduce((sum, p) => sum + p.total, 0) || 1;
  const personalPaymentMethods = Array.from(personalPaymentMethodMap.entries())
    .map(([name, stat]) => ({
      name,
      amount: Number(stat.total.toFixed(2)),
      count: stat.count,
      percentage: Number(((stat.total / totalPersonalPmVol) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly trends
  const allMonths = Array.from(new Set([...groupMonthlyMap.keys(), ...personalMonthlyMap.keys()])).sort();
  const groupMonthlyTrend = allMonths.map((m) => {
    const data = groupMonthlyMap.get(m) || { expense: 0, income: 0 };
    return {
      month: m,
      expense: Number(data.expense.toFixed(2)),
      income: Number(data.income.toFixed(2)),
    };
  });

  let runningPersonalNet = 0;
  const personalMonthlyTrend = allMonths.map((m) => {
    const data = personalMonthlyMap.get(m) || { expense: 0, income: 0 };
    const net = data.income - data.expense;
    runningPersonalNet += net;
    return {
      month: m,
      expense: Number(data.expense.toFixed(2)),
      income: Number(data.income.toFixed(2)),
      net: Number(net.toFixed(2)),
      runningBalance: Number(runningPersonalNet.toFixed(2)),
      savingsRate: data.income > 0 ? Number(((net / data.income) * 100).toFixed(1)) : 0,
    };
  });

  // Top spending group
  const groupSpending = Array.from(groupExpenseByGroup.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  // Group and Personal Summaries
  const groupSummary = {
    totalGroupExpense: Number(totalGroupExpense.toFixed(2)),
    totalGroupIncome: Number(totalGroupIncome.toFixed(2)),
    totalGroupTransactions,
    totalMembers: totalMembersCount,
    totalGroups: targetGroupIds.length,
    totalPendingSettlements: {
      amount: Number(pendingGroupAmount.toFixed(2)),
      count: pendingGroupCount,
    },
    totalCompletedSettlements: {
      amount: Number(completedGroupAmount.toFixed(2)),
      count: completedGroupCount,
    },
    largestGroupExpense: largestGroupTx,
    topSpendingGroup: topGroup,
    groupAverageExpense,
  };

  const personalSummary = {
    myTotalSpending: Number(myTotalSpending.toFixed(2)),
    myTotalIncome: Number(myTotalIncome.toFixed(2)),
    myNetBalance,
    amountIPaid: Number(totalPaidByMe.toFixed(2)),
    amountIOwe: Number(userPendingPayable.toFixed(2)),
    amountOthersOweMe: Number(userPendingReceivable.toFixed(2)),
    myPendingSettlements: {
      amount: Number((userPendingReceivable + userPendingPayable).toFixed(2)),
      count: userPendingCount,
    },
    myCompletedSettlements: {
      amount: Number(userCompletedAmount.toFixed(2)),
      count: userCompletedCount,
    },
    myAverageTransaction,
    myLargestExpense: largestPersonalTx,
    myMonthlySpending: Number(myTotalSpending.toFixed(2)),
    mySavings,
    myFinancialHealth: {
      score: health.score,
      grade: health.grade,
      label: health.label,
    },
  };

  const paymentSummary = {
    totalPaidByMe: Number(totalPaidByMe.toFixed(2)),
    totalPaidByOthers: Number(totalPaidByOthersInGroup.toFixed(2)),
    totalSharedExpenses: Number(totalGroupExpense.toFixed(2)),
    totalPersonalExpenses: Number(totalPersonalExpenses.toFixed(2)),
    settlementAmount: Number(totalSettlementVolume.toFixed(2)),
    outstandingReceivables: Number(userPendingReceivable.toFixed(2)),
    outstandingPayables: Number(userPendingPayable.toFixed(2)),
  };

  // AI Insights - Separated!
  const topGroupCat = groupCategoryBreakdown[0];
  const groupInsights: string[] = [
    `The group spent ₹${Math.round(totalGroupExpense).toLocaleString("en-IN")} during the selected period.`,
    topGroupCat ? `${topGroupCat.name} accounts for ${topGroupCat.percentage}% of total group expenses (₹${Math.round(topGroupCat.value).toLocaleString("en-IN")}).` : "Group expenditures are diversified.",
    largestGroupTx.amount > 0 ? `The largest group transaction was "${largestGroupTx.title}" (₹${Math.round(largestGroupTx.amount).toLocaleString("en-IN")}) in ${largestGroupTx.groupName}.` : "No group transactions recorded.",
    `Group average transaction value is ₹${Math.round(groupAverageExpense).toLocaleString("en-IN")}.`,
    pendingGroupCount > 0 ? `${pendingGroupCount} pending group settlements totaling ₹${Math.round(pendingGroupAmount).toLocaleString("en-IN")} await completion.` : "All recorded group settlements are currently cleared.",
  ];

  const personalInsights: string[] = [
    `You personally contributed ₹${Math.round(totalPaidByMe).toLocaleString("en-IN")}.`,
    userPendingReceivable > 0 ? `You are expected to receive ₹${userPendingReceivable.toLocaleString("en-IN")} from other members.` : "You currently have no pending receivables owed to you.",
    userPendingPayable === 0 ? "You currently have no outstanding personal dues." : `You currently owe ₹${userPendingPayable.toLocaleString("en-IN")} in personal settlement dues.`,
    `Your average transaction value is ₹${Math.round(myAverageTransaction).toLocaleString("en-IN")}.`,
    mySavings > 0 ? `You retained ₹${Math.round(mySavings).toLocaleString("en-IN")} in net savings.` : "Your net personal balance is fully balanced.",
  ];

  return {
    groupSummary,
    personalSummary,
    paymentSummary,
    myTxList,
    groupTxList,
    groupCategoryBreakdown,
    personalCategoryBreakdown,
    groupPaymentMethods,
    personalPaymentMethods,
    groupMonthlyTrend,
    personalMonthlyTrend,
    groupSpending,
    groupInsights,
    personalInsights,
    health,
    expenseTxList,
  };
}

/**
 * SECTION 3: Comprehensive Report Query Engine
 * Returns separated Group, Personal, Payment summaries, and independent Transaction tables.
 */
export async function getComprehensiveReport(options: ReportFilterOptions = {}) {
  try {
    const user = await requireAuth();

    // 1. Get user's active groups (as creator or as active/non-inactive member)
    const userGroupsQuery = await db
      .select({ id: groups.id })
      .from(groups)
      .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          eq(groups.isDeleted, false),
          or(
            eq(groups.createdBy, user.id),
            and(
              eq(groupMembers.userId, user.id),
              or(
                isNull(groupMembers.membershipStatus),
                eq(groupMembers.membershipStatus, "active"),
                sql`${groupMembers.membershipStatus} != 'expense_inactive'`
              )
            )
          )
        )
      );
    const userGroupIds = Array.from(new Set(userGroupsQuery.map((g) => g.id).filter(Boolean))) as number[];
    const targetGroupIds = options.groupId ? [options.groupId] : userGroupIds;

    // 2. Standardized Period calculation
    const { startDate, endDate } = calculateDateWindows(options.period, options.startDate, options.endDate);

    const conditions: any[] = [
      eq(transactions.isDeleted, false),
      or(
        targetGroupIds.length > 0 ? inArray(transactions.groupId, targetGroupIds) : sql`FALSE`,
        and(
          isNull(transactions.groupId),
          or(
            eq(transactions.userId, user.id),
            eq(transactions.createdBy, user.id),
            eq(transactions.paidBy, user.id)
          )
        ),
        eq(transactions.userId, user.id),
        eq(transactions.createdBy, user.id),
        eq(transactions.paidBy, user.id),
        sql`EXISTS (SELECT 1 FROM expense_splits WHERE expense_splits.transaction_id = transactions.id AND expense_splits.user_id = ${user.id})`
      ),
    ];

    if (!options.contactId) {
      conditions.push(or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)));
    }

    if (startDate) conditions.push(gte(transactions.date, startDate));
    if (endDate) conditions.push(lte(transactions.date, endDate));

    if (options.reportType === "personal" || options.reportScope === "personal") {
      conditions.push(or(isNull(transactions.groupId), eq(transactions.paidBy, user.id)));
    } else if (options.reportType === "group" || options.reportScope === "group") {
      conditions.push(sql`${transactions.groupId} IS NOT NULL`);
    } else if (options.reportType === "settlement") {
      conditions.push(sql`${transactions.type} IN ('repaid', 'lent', 'borrowed')`);
    } else if (options.reportType === "individual_group" && options.groupId) {
      conditions.push(eq(transactions.groupId, options.groupId));
    } else if (options.reportType === "member" && options.contactId) {
      conditions.push(eq(transactions.contactId, options.contactId));
    } else if (options.reportType === "category" && options.categoryId) {
      conditions.push(eq(transactions.categoryId, options.categoryId));
    } else if (options.reportType === "payment_method" && options.paymentMethod) {
      conditions.push(eq(transactions.paymentMethod, options.paymentMethod));
    }

    if (options.groupId && options.reportType !== "individual_group") {
      conditions.push(eq(transactions.groupId, options.groupId));
    }
    if (options.contactId && options.reportType !== "member") {
      conditions.push(eq(transactions.contactId, options.contactId));
    }
    if (options.categoryId && options.reportType !== "category") {
      conditions.push(eq(transactions.categoryId, options.categoryId));
    }
    if (options.paymentMethod && options.reportType !== "payment_method") {
      conditions.push(eq(transactions.paymentMethod, options.paymentMethod));
    }
    if (options.type && options.type !== "all") {
      conditions.push(eq(transactions.type, options.type as any));
    }
    if (options.status && options.status !== "all") {
      conditions.push(eq(transactions.status, options.status));
    }
    if (options.minAmount && options.minAmount > 0) {
      conditions.push(gte(transactions.amount, options.minAmount));
    }
    if (options.maxAmount && options.maxAmount > 0) {
      conditions.push(lte(transactions.amount, options.maxAmount));
    }
    if (options.hasReceipt === true) {
      conditions.push(sql`${transactions.receiptUrl} IS NOT NULL AND ${transactions.receiptUrl} != ''`);
    }
    if (options.tag) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(${transactions.tags}, '[]'::jsonb)) AS elem WHERE elem ILIKE ${`%${options.tag}%`})`
      );
    }
    if (options.search && options.search.trim().length > 0) {
      const st = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(transactions.publicId, st),
          ilike(transactions.title, st),
          ilike(transactions.description, st),
          ilike(transactions.notes, st),
          ilike(categories.name, st),
          ilike(groups.name, st),
          ilike(contacts.name, st)
        )
      );
    }

    let orderByClause: any = desc(transactions.date);
    if (options.sortBy === "date_asc") orderByClause = transactions.date;
    else if (options.sortBy === "amount_desc") orderByClause = desc(transactions.amount);
    else if (options.sortBy === "amount_asc") orderByClause = transactions.amount;
    else if (options.sortBy === "title_asc") orderByClause = transactions.description;

    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const creatorUser = alias(users, "creator_user");
    const payerUser = alias(users, "payer_user");

    const [rawTxList, settlementsList, groupMembersList] = await Promise.all([
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
          location: transactions.location,
          tags: transactions.tags,
          notes: transactions.notes,
          categoryName: categories.name,
          categoryId: categories.id,
          groupName: groups.name,
          groupId: groups.id,
          contactName: contacts.name,
          contactId: contacts.id,
          createdBy: transactions.createdBy,
          createdByName: creatorUser.name,
          paidBy: transactions.paidBy,
          paidByName: payerUser.name,
          paidByContact: transactions.paidByContact,
          userId: transactions.userId,
          isPersonal: transactions.isPersonal,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .leftJoin(creatorUser, eq(transactions.createdBy, creatorUser.id))
        .leftJoin(payerUser, eq(transactions.paidBy, payerUser.id))
        .where(and(...conditions))
        .orderBy(orderByClause),

      db
        .select({
          id: settlements.id,
          publicId: settlements.publicId,
          groupId: settlements.groupId,
          fromUserId: settlements.fromUserId,
          toUserId: settlements.toUserId,
          amount: settlements.amount,
          currency: settlements.currency,
          status: settlements.status,
          paymentMethod: settlements.paymentMethod,
          createdAt: settlements.createdAt,
          paidAt: settlements.paidAt,
        })
        .from(settlements)
        .where(
          and(
            eq(settlements.isDeleted, false),
            or(
              targetGroupIds.length > 0 ? inArray(settlements.groupId, targetGroupIds) : sql`FALSE`,
              eq(settlements.fromUserId, user.id),
              eq(settlements.toUserId, user.id)
            )
          )
        ),

      targetGroupIds.length > 0
        ? db
            .select({
              groupId: groupMembers.groupId,
              userId: groupMembers.userId,
            })
            .from(groupMembers)
            .where(
              and(
                inArray(groupMembers.groupId, targetGroupIds),
                or(
                  isNull(groupMembers.membershipStatus),
                  eq(groupMembers.membershipStatus, "active"),
                  sql`${groupMembers.membershipStatus} != 'expense_inactive'`
                )
              )
            )
        : Promise.resolve([]),
    ]);

    const txIds = rawTxList.map((t) => t.id);
    const splitRecords = txIds.length > 0
      ? await db
          .select({
            id: expenseSplits.id,
            transactionId: expenseSplits.transactionId,
            userId: expenseSplits.userId,
            contactId: expenseSplits.contactId,
            splitMethod: expenseSplits.splitMethod,
            amount: expenseSplits.amount,
            percentage: expenseSplits.percentage,
            shares: expenseSplits.shares,
            isExcluded: expenseSplits.isExcluded,
          })
          .from(expenseSplits)
          .where(inArray(expenseSplits.transactionId, txIds))
      : [];

    const splitsByTx = new Map<number, string>();
    splitRecords.forEach((s) => {
      if (!splitsByTx.has(s.transactionId) && s.splitMethod) {
        splitsByTx.set(s.transactionId, s.splitMethod);
      }
    });

    const enrichedRawTxList = rawTxList.map((tx) => ({
      ...tx,
      splitMethod: splitsByTx.get(tx.id) || "equal",
    }));

    const model = computeComprehensiveFinancialModel({
      user,
      targetGroupIds,
      transactionsList: enrichedRawTxList,
      splitsList: splitRecords,
      settlementsList,
      groupMembersList,
    });

    const totalCount = enrichedRawTxList.length;

    return {
      transactions: enrichedRawTxList.slice(offset, offset + limit),
      myTransactions: model.myTxList.slice(offset, offset + limit),
      groupTransactions: model.groupTxList.slice(offset, offset + limit),
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      reportScope: options.reportScope || "combined",
      summary: {
        totalIncome: model.personalSummary.myTotalIncome,
        totalExpense: model.personalSummary.myTotalSpending,
        netBalance: model.personalSummary.myNetBalance,
        transactionCount: totalCount,
      },
      groupSummary: model.groupSummary,
      personalSummary: model.personalSummary,
      paymentSummary: model.paymentSummary,
    };
  } catch (error) {
    throw new DatabaseError("Failed to generate comprehensive report", { originalError: error });
  }
}

/**
 * SECTION 7: Enterprise Analytics & Business Intelligence Engine
 * Computes all KPI cards, previous period comparisons, sparklines,
 * separated group vs personal breakdowns, dynamic AI insights and recommendations.
 */
export async function getReportAnalytics(options: ReportFilterOptions = {}) {
  try {
    const user = await requireAuth();

    // 1. Group memberships & ownership
    const userGroupsQuery = await db
      .select({ id: groups.id })
      .from(groups)
      .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          eq(groups.isDeleted, false),
          or(
            eq(groups.createdBy, user.id),
            and(
              eq(groupMembers.userId, user.id),
              or(
                isNull(groupMembers.membershipStatus),
                eq(groupMembers.membershipStatus, "active"),
                sql`${groupMembers.membershipStatus} != 'expense_inactive'`
              )
            )
          )
        )
      );
    const userGroupIds = Array.from(new Set(userGroupsQuery.map((g) => g.id).filter(Boolean))) as number[];
    const targetGroupIds = options.groupId ? [options.groupId] : userGroupIds;

    // 2. Determine current period and comparison prior period
    const { startDate, endDate, prevStartDate, prevEndDate } = calculateDateWindows(
      options.period,
      options.startDate,
      options.endDate
    );

    const baseScope = or(
      targetGroupIds.length > 0 ? inArray(transactions.groupId, targetGroupIds) : sql`FALSE`,
      and(
        isNull(transactions.groupId),
        or(
          eq(transactions.userId, user.id),
          eq(transactions.createdBy, user.id),
          eq(transactions.paidBy, user.id)
        )
      ),
      eq(transactions.userId, user.id),
      eq(transactions.createdBy, user.id),
      eq(transactions.paidBy, user.id),
      sql`EXISTS (SELECT 1 FROM expense_splits WHERE expense_splits.transaction_id = transactions.id AND expense_splits.user_id = ${user.id})`
    );

    const currentConditions: any[] = [
      eq(transactions.isDeleted, false),
      baseScope,
      or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
    ];
    if (startDate) currentConditions.push(gte(transactions.date, startDate));
    if (endDate) currentConditions.push(lte(transactions.date, endDate));
    if (options.groupId) currentConditions.push(eq(transactions.groupId, options.groupId));
    if (options.categoryId) currentConditions.push(eq(transactions.categoryId, options.categoryId));
    if (options.paymentMethod) currentConditions.push(eq(transactions.paymentMethod, options.paymentMethod));

    const prevConditions: any[] = [
      eq(transactions.isDeleted, false),
      baseScope,
      or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true)),
    ];
    if (prevStartDate) prevConditions.push(gte(transactions.date, prevStartDate));
    if (prevEndDate) prevConditions.push(lte(transactions.date, prevEndDate));
    if (options.groupId) prevConditions.push(eq(transactions.groupId, options.groupId));
    if (options.categoryId) prevConditions.push(eq(transactions.categoryId, options.categoryId));
    if (options.paymentMethod) prevConditions.push(eq(transactions.paymentMethod, options.paymentMethod));

    const creatorUser = alias(users, "creator_user");
    const payerUser = alias(users, "payer_user");

    const [
      currentPeriodTxList,
      prevPeriodSummary,
      settlementsList,
      groupsList,
      groupMembersList,
    ] = await Promise.all([
      db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          amount: transactions.amount,
          type: transactions.type,
          date: transactions.date,
          status: transactions.status,
          paymentMethod: transactions.paymentMethod,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          groupId: transactions.groupId,
          groupName: groups.name,
          title: transactions.title,
          description: transactions.description,
          createdBy: transactions.createdBy,
          createdByName: creatorUser.name,
          paidBy: transactions.paidBy,
          paidByName: payerUser.name,
          paidByContact: transactions.paidByContact,
          userId: transactions.userId,
          isPersonal: transactions.isPersonal,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(creatorUser, eq(transactions.createdBy, creatorUser.id))
        .leftJoin(payerUser, eq(transactions.paidBy, payerUser.id))
        .where(and(...currentConditions))
        .orderBy(desc(transactions.date)),

      prevStartDate && prevEndDate
        ? db
            .select({
              totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
              totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
              txCount: sql<number>`COUNT(*)`,
            })
            .from(transactions)
            .where(and(...prevConditions))
        : Promise.resolve([{ totalIncome: 0, totalExpense: 0, txCount: 0 }]),

      db
        .select({
          id: settlements.id,
          publicId: settlements.publicId,
          groupId: settlements.groupId,
          fromUserId: settlements.fromUserId,
          toUserId: settlements.toUserId,
          amount: settlements.amount,
          currency: settlements.currency,
          status: settlements.status,
          paymentMethod: settlements.paymentMethod,
          createdAt: settlements.createdAt,
          paidAt: settlements.paidAt,
        })
        .from(settlements)
        .where(
          and(
            eq(settlements.isDeleted, false),
            or(
              targetGroupIds.length > 0 ? inArray(settlements.groupId, targetGroupIds) : sql`FALSE`,
              eq(settlements.fromUserId, user.id),
              eq(settlements.toUserId, user.id)
            )
          )
        ),

      db
        .select({
          id: groups.id,
          name: groups.name,
        })
        .from(groups)
        .where(eq(groups.isDeleted, false)),

      targetGroupIds.length > 0
        ? db
            .select({
              groupId: groupMembers.groupId,
              userId: groupMembers.userId,
            })
            .from(groupMembers)
            .where(
              and(
                inArray(groupMembers.groupId, targetGroupIds),
                or(
                  isNull(groupMembers.membershipStatus),
                  eq(groupMembers.membershipStatus, "active"),
                  sql`${groupMembers.membershipStatus} != 'expense_inactive'`
                )
              )
            )
        : Promise.resolve([]),
    ]);

    const txIds = currentPeriodTxList.map((t) => t.id);
    const splitRecords = txIds.length > 0
      ? await db
          .select({
            id: expenseSplits.id,
            transactionId: expenseSplits.transactionId,
            userId: expenseSplits.userId,
            contactId: expenseSplits.contactId,
            splitMethod: expenseSplits.splitMethod,
            amount: expenseSplits.amount,
            percentage: expenseSplits.percentage,
            shares: expenseSplits.shares,
            isExcluded: expenseSplits.isExcluded,
          })
          .from(expenseSplits)
          .where(inArray(expenseSplits.transactionId, txIds))
      : [];

    const daysCount = startDate && endDate
      ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 3600 * 1000)))
      : 30;

    const model = computeComprehensiveFinancialModel({
      user,
      targetGroupIds,
      transactionsList: currentPeriodTxList,
      splitsList: splitRecords,
      settlementsList,
      groupMembersList,
      daysCount,
    });

    // Previous period comparative growth
    const prevExpenseRupees = (prevPeriodSummary[0]?.totalExpense || 0) / 100;
    const prevIncomeRupees = (prevPeriodSummary[0]?.totalIncome || 0) / 100;
    const prevNetBalanceRupees = prevIncomeRupees - prevExpenseRupees;

    const calcPercentDiff = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
    };

    const expenseGrowthPercent = calcPercentDiff(model.personalSummary.myTotalSpending, prevExpenseRupees);
    const incomeGrowthPercent = calcPercentDiff(model.personalSummary.myTotalIncome, prevIncomeRupees);
    const netGrowthPercent = calcPercentDiff(model.personalSummary.myNetBalance, prevNetBalanceRupees);

    // Sparklines
    const expenseSparkline = buildSparkline(
      model.expenseTxList.map((x) => ({ date: x.date, amount: x.amount })),
      startDate,
      endDate
    );
    const incomeSparkline = buildSparkline(
      currentPeriodTxList.filter((x) => x.type === "received" || x.type === "repaid").map((x) => ({ date: x.date, amount: x.amount })),
      startDate,
      endDate
    );
    const netSparkline = expenseSparkline.map((exp, idx) => Number(((incomeSparkline[idx] || 0) - exp).toFixed(1)));

    // Weekend vs Weekday analysis (Personal)
    let weekendExpense = 0;
    let weekdayExpense = 0;
    let weekendCount = 0;
    let weekdayCount = 0;

    const dayBuckets = [
      { day: "Sun", dayIndex: 0, amount: 0, count: 0 },
      { day: "Mon", dayIndex: 1, amount: 0, count: 0 },
      { day: "Tue", dayIndex: 2, amount: 0, count: 0 },
      { day: "Wed", dayIndex: 3, amount: 0, count: 0 },
      { day: "Thu", dayIndex: 4, amount: 0, count: 0 },
      { day: "Fri", dayIndex: 5, amount: 0, count: 0 },
      { day: "Sat", dayIndex: 6, amount: 0, count: 0 },
    ];

    for (const item of model.expenseTxList) {
      const d = new Date(item.date);
      const dow = d.getDay();
      const val = item.amount / 100;
      dayBuckets[dow].amount += val;
      dayBuckets[dow].count += 1;
      if (dow === 0 || dow === 6) {
        weekendExpense += val;
        weekendCount += 1;
      } else {
        weekdayExpense += val;
        weekdayCount += 1;
      }
    }

    const totalTrackedExpense = weekendExpense + weekdayExpense || 1;
    const weekendPercentage = Number(((weekendExpense / totalTrackedExpense) * 100).toFixed(1));
    const weekdayPercentage = Number(((weekdayExpense / totalTrackedExpense) * 100).toFixed(1));

    const dailyDistribution = [
      dayBuckets[1], dayBuckets[2], dayBuckets[3], dayBuckets[4], dayBuckets[5], dayBuckets[6], dayBuckets[0]
    ].map((b) => ({
      ...b,
      amount: Number(b.amount.toFixed(2)),
      percentage: Number(((b.amount / totalTrackedExpense) * 100).toFixed(1)),
    }));

    // Settlement turnaround
    let completedWithDatesCount = 0;
    let totalSettlementTurnaroundDays = 0;
    let upiSettlementsCount = 0;

    for (const s of settlementsList) {
      if (s.status === "completed") {
        if (s.paymentMethod?.toLowerCase().includes("upi") || s.paymentMethod === null) {
          upiSettlementsCount += 1;
        }
        if (s.paidAt && s.createdAt) {
          const diffDays = Math.max(0.1, (new Date(s.paidAt).getTime() - new Date(s.createdAt).getTime()) / (24 * 3600 * 1000));
          totalSettlementTurnaroundDays += diffDays;
          completedWithDatesCount += 1;
        }
      }
    }

    const completedSCount = model.personalSummary.myCompletedSettlements.count;
    const pendingSCount = model.personalSummary.myPendingSettlements.count;
    const settlementSuccessRate = completedSCount + pendingSCount > 0
      ? Number(((completedSCount / (completedSCount + pendingSCount)) * 100).toFixed(1))
      : 100;
    const avgSettlementSpeedDays = completedWithDatesCount > 0
      ? Number((totalSettlementTurnaroundDays / completedWithDatesCount).toFixed(1))
      : 1.4;

    // Debt Simplification savings calculation
    const totalGroupCount = groupsList.length || 1;
    const estDirectTransfers = Math.max(pendingSCount + completedSCount, totalGroupCount * 4);
    const estOptimizedTransfers = Math.max(1, Math.ceil(estDirectTransfers * 0.42));
    const transfersSaved = Math.max(0, estDirectTransfers - estOptimizedTransfers);
    const moneyVolumeOptimized = (model.personalSummary.myCompletedSettlements.amount + model.personalSummary.myPendingSettlements.amount) * 0.35;
    const estimatedTimeSavedHours = Number((transfersSaved * 0.6).toFixed(1));

    // Structured 17 KPI Cards organized with clear scope prefixes
    const kpiCards = {
      // Group Overview
      overallGroupExpense: {
        title: "Overall Group Expense",
        value: model.groupSummary.totalGroupExpense,
        trend: "neutral" as const,
        comparisonText: `Across ${model.groupSummary.totalGroups} groups`,
        tooltip: "Total sum of all expenses incurred by all members across all collaborative groups.",
        icon: "TrendingDown",
      },
      overallGroupIncome: {
        title: "Overall Group Income",
        value: model.groupSummary.totalGroupIncome,
        trend: "neutral" as const,
        comparisonText: "Total group inflows",
        tooltip: "Total repayments and inflows received across group accounts.",
        icon: "TrendingUp",
      },
      totalGroupTransactions: {
        title: "Group Transactions",
        value: model.groupSummary.totalGroupTransactions,
        comparisonText: "All members combined",
        tooltip: "Total transaction count recorded across all groups.",
        icon: "Receipt",
      },
      totalMembers: {
        title: "Total Members",
        value: model.groupSummary.totalMembers,
        comparisonText: "Active participants",
        tooltip: "Distinct members participating across selected groups.",
        icon: "Users",
      },
      totalGroups: {
        title: "Total Groups",
        value: model.groupSummary.totalGroups,
        comparisonText: "Active circles",
        tooltip: "Total number of shared expense groups.",
        icon: "Layers",
      },
      groupPendingSettlements: {
        title: "Pending Group Settlements",
        value: model.groupSummary.totalPendingSettlements.amount,
        count: model.groupSummary.totalPendingSettlements.count,
        comparisonText: `${model.groupSummary.totalPendingSettlements.count} pending transfers`,
        tooltip: "Total unsettled balances awaiting payment between group members.",
        icon: "Clock",
      },
      groupCompletedSettlements: {
        title: "Completed Group Settlements",
        value: model.groupSummary.totalCompletedSettlements.amount,
        count: model.groupSummary.totalCompletedSettlements.count,
        comparisonText: `${model.groupSummary.totalCompletedSettlements.count} cleared`,
        tooltip: "Total reconciled settlement volume cleared successfully.",
        icon: "CheckCircle",
      },
      largestGroupExpense: {
        title: "Largest Group Expense",
        value: model.groupSummary.largestGroupExpense.amount,
        subtitle: model.groupSummary.largestGroupExpense.title,
        tooltip: "The single highest value expense logged in the group.",
        icon: "AlertCircle",
      },
      topSpendingGroup: {
        title: "Top Spending Group",
        name: model.groupSummary.topSpendingGroup.name,
        value: model.groupSummary.topSpendingGroup.amount,
        tooltip: "The shared group logging the highest total expenditure.",
        icon: "Layers",
      },
      groupAverageExpense: {
        title: "Group Average Expense",
        value: model.groupSummary.groupAverageExpense,
        tooltip: "Average amount per group transaction.",
        icon: "Calendar",
      },

      // Personal Overview
      myTotalSpending: {
        title: "My Personal Spending",
        value: model.personalSummary.myTotalSpending,
        prevValue: prevExpenseRupees,
        percentChange: expenseGrowthPercent,
        trend: expenseGrowthPercent > 0 ? ("up" as const) : ("down" as const),
        sparkline: expenseSparkline,
        comparisonText: "My actual allocated share",
        tooltip: "Your personal purchases plus your allocated share of group expenses. Excludes other members' shares.",
        icon: "CreditCard",
      },
      myTotalIncome: {
        title: "My Total Income",
        value: model.personalSummary.myTotalIncome,
        prevValue: prevIncomeRupees,
        percentChange: incomeGrowthPercent,
        trend: incomeGrowthPercent > 0 ? ("up" as const) : ("neutral" as const),
        sparkline: incomeSparkline,
        comparisonText: "My total inflows",
        tooltip: "Total personal income and reimbursements received by you.",
        icon: "TrendingUp",
      },
      myNetBalance: {
        title: "My Net Balance",
        value: model.personalSummary.myNetBalance,
        trend: model.personalSummary.myNetBalance >= 0 ? ("up" as const) : ("down" as const),
        sparkline: netSparkline,
        comparisonText: model.personalSummary.myNetBalance >= 0 ? "Net asset position" : "Net liability position",
        tooltip: "Amount others owe you minus amount you owe others.",
        icon: "IndianRupee",
      },
      amountIPaid: {
        title: "Amount I Paid (Contribution)",
        value: model.personalSummary.amountIPaid,
        trend: "neutral" as const,
        comparisonText: "Cash/UPI out of pocket",
        tooltip: "The total money you physically paid upfront for transactions.",
        icon: "ArrowUpRight",
      },
      amountIOwe: {
        title: "Amount I Owe",
        value: model.personalSummary.amountIOwe,
        trend: model.personalSummary.amountIOwe > 0 ? ("down" as const) : ("neutral" as const),
        comparisonText: "Pending payable dues",
        tooltip: "Money you still owe to other members.",
        icon: "ArrowDownLeft",
      },
      amountOthersOweMe: {
        title: "Amount Others Owe Me",
        value: model.personalSummary.amountOthersOweMe,
        trend: "up" as const,
        comparisonText: "Pending receivables",
        tooltip: "Money other members still owe to you for shared bills you paid upfront.",
        icon: "ArrowUpRight",
      },
      myPendingSettlements: {
        title: "My Pending Settlements",
        value: model.personalSummary.myPendingSettlements.amount,
        count: model.personalSummary.myPendingSettlements.count,
        comparisonText: `${model.personalSummary.myPendingSettlements.count} pending`,
        tooltip: "Unsettled reimbursement transfers involving your account.",
        icon: "Clock",
      },
      myCompletedSettlements: {
        title: "My Completed Settlements",
        value: model.personalSummary.myCompletedSettlements.amount,
        count: model.personalSummary.myCompletedSettlements.count,
        comparisonText: `${model.personalSummary.myCompletedSettlements.count} cleared`,
        tooltip: "Reconciled settlements completed by or to your account.",
        icon: "CheckCircle",
      },
      myAverageTransaction: {
        title: "My Average Transaction",
        value: model.personalSummary.myAverageTransaction,
        tooltip: "Average value of transactions where you participated or paid.",
        icon: "Calendar",
      },
      myLargestExpense: {
        title: "My Largest Expense",
        value: model.personalSummary.myLargestExpense.amount,
        subtitle: model.personalSummary.myLargestExpense.title,
        tooltip: "The single highest expense belonging to your personal share.",
        icon: "AlertCircle",
      },
      myMonthlySpending: {
        title: "My Monthly Spending",
        value: model.personalSummary.myMonthlySpending,
        comparisonText: "Rolling run rate",
        tooltip: "Trailing 30-day personal expenditure.",
        icon: "CreditCard",
      },
      mySavings: {
        title: "My Savings",
        value: model.personalSummary.mySavings,
        comparisonText: "Retained cash",
        tooltip: "Personal income retained after deducting living expenses and bill shares.",
        icon: "PiggyBank",
      },
      myFinancialHealth: {
        title: "My Financial Health",
        value: model.health.score,
        grade: model.health.grade,
        label: model.health.label,
        breakdown: model.health.breakdown,
        tips: model.health.improvementTips,
        tooltip: "Composite financial health index measuring personal settlement speed, savings, and debt ratio.",
        icon: "ShieldCheck",
      },

      // Legacy key compatibility for existing dashboard bindings
      totalExpenses: {
        title: "My Personal Spending",
        value: model.personalSummary.myTotalSpending,
        prevValue: prevExpenseRupees,
        percentChange: expenseGrowthPercent,
        trend: expenseGrowthPercent > 0 ? ("up" as const) : ("down" as const),
        sparkline: expenseSparkline,
        comparisonText: "My actual allocated share",
        tooltip: "Your personal purchases plus your allocated share of group expenses.",
        icon: "TrendingDown",
      },
      totalIncome: {
        title: "My Total Income",
        value: model.personalSummary.myTotalIncome,
        prevValue: prevIncomeRupees,
        percentChange: incomeGrowthPercent,
        trend: incomeGrowthPercent > 0 ? ("up" as const) : ("neutral" as const),
        sparkline: incomeSparkline,
        comparisonText: "My total inflows",
        tooltip: "Total personal income and peer reimbursements received.",
        icon: "TrendingUp",
      },
      netBalance: {
        title: "My Net Balance",
        value: model.personalSummary.myNetBalance,
        trend: model.personalSummary.myNetBalance >= 0 ? ("up" as const) : ("down" as const),
        sparkline: netSparkline,
        comparisonText: model.personalSummary.myNetBalance >= 0 ? "Net asset surplus" : "Net debt payable",
        tooltip: "Amount others owe you minus amount you owe others.",
        icon: "IndianRupee",
      },
      moneyYouOwe: {
        title: "Amount I Owe",
        value: model.personalSummary.amountIOwe,
        comparisonText: "Payable dues",
        tooltip: "Money you still owe to other members.",
        icon: "ArrowDownLeft",
      },
      moneyOwedToYou: {
        title: "Amount Others Owe Me",
        value: model.personalSummary.amountOthersOweMe,
        comparisonText: "Receivables",
        tooltip: "Money others owe you.",
        icon: "ArrowUpRight",
      },
      pendingSettlements: {
        title: "Pending Settlements",
        value: model.personalSummary.myPendingSettlements.amount,
        count: model.personalSummary.myPendingSettlements.count,
        comparisonText: `${model.personalSummary.myPendingSettlements.count} pending`,
        tooltip: "Unsettled balances involving you.",
        icon: "Clock",
      },
      completedSettlements: {
        title: "Completed Settlements",
        value: model.personalSummary.myCompletedSettlements.amount,
        count: model.personalSummary.myCompletedSettlements.count,
        comparisonText: `${model.personalSummary.myCompletedSettlements.count} completed`,
        tooltip: "Completed settlements involving you.",
        icon: "CheckCircle",
      },
      activeMembers: {
        title: "Total Members",
        value: model.groupSummary.totalMembers,
        comparisonText: "Group peers",
        tooltip: "Active members in your groups.",
        icon: "Users",
      },
      monthlySpending: {
        title: "Monthly Spending",
        value: model.personalSummary.myMonthlySpending,
        comparisonText: "30-day run rate",
        tooltip: "Your 30-day spending rate.",
        icon: "CreditCard",
      },
      monthlySaving: {
        title: "Monthly Saving",
        value: model.personalSummary.mySavings,
        comparisonText: "Retained cash",
        tooltip: "Monthly income retained.",
        icon: "PiggyBank",
      },
      avgDailySpending: {
        title: "Avg Daily Spending",
        value: Number((model.personalSummary.myTotalSpending / daysCount).toFixed(2)),
        comparisonText: `Over ${daysCount} days`,
        tooltip: "Average daily personal expenditure.",
        icon: "Calendar",
      },
      largestExpense: {
        title: "Largest Expense",
        value: model.personalSummary.myLargestExpense.amount,
        subtitle: model.personalSummary.myLargestExpense.title,
        tooltip: "Your single largest expense.",
        icon: "AlertCircle",
      },
      largestCategory: {
        title: "Top Category",
        name: model.personalCategoryBreakdown[0]?.name || "General",
        value: model.personalCategoryBreakdown[0]?.value || 0,
        percentage: model.personalCategoryBreakdown[0]?.percentage || 0,
        tooltip: "Your highest spending category.",
        icon: "PieChart",
      },
      mostActiveGroup: {
        title: "Most Active Group",
        name: model.groupSpending[0]?.name || "Personal",
        value: model.groupSpending[0]?.value || 0,
        tooltip: "The group with the highest spending.",
        icon: "Layers",
      },
      totalTransactions: {
        title: "Total Transactions",
        value: currentPeriodTxList.length,
        comparisonText: "Entries recorded",
        tooltip: "Total transactions recorded in current filters.",
        icon: "Receipt",
      },
      financialHealthScore: {
        title: "Financial Health Score",
        value: model.health.score,
        grade: model.health.grade,
        label: model.health.label,
        breakdown: model.health.breakdown,
        tips: model.health.improvementTips,
        tooltip: "Composite health score.",
        icon: "ShieldCheck",
      },
    };

    // AI Insight Objects
    const aiInsights: Array<{
      id: string;
      type: "positive" | "warning" | "trend" | "saving" | "anomaly" | "settlement";
      title: string;
      description: string;
      impact: string;
      metric?: string;
      scope?: "group" | "personal";
    }> = [
      {
        id: "insight-group-expense",
        type: "trend",
        title: "Overall Group Expenditure",
        description: `The group spent ₹${Math.round(model.groupSummary.totalGroupExpense).toLocaleString("en-IN")} during the selected period across ${targetGroupIds.length} groups.`,
        impact: `Group average transaction value is ₹${Math.round(model.groupSummary.groupAverageExpense).toLocaleString("en-IN")}`,
        metric: `₹${Math.round(model.groupSummary.totalGroupExpense).toLocaleString("en-IN")}`,
        scope: "group",
      },
      {
        id: "insight-personal-contribution",
        type: "positive",
        title: "Your Personal Contribution",
        description: `You personally contributed ₹${Math.round(model.personalSummary.amountIPaid).toLocaleString("en-IN")} upfront. Your actual share of expenses is ₹${Math.round(model.personalSummary.myTotalSpending).toLocaleString("en-IN")}.`,
        impact: model.personalSummary.amountIPaid >= model.personalSummary.myTotalSpending ? "You have funded group expenses generously" : "Your group expenses are funded by others",
        metric: `₹${Math.round(model.personalSummary.amountIPaid).toLocaleString("en-IN")}`,
        scope: "personal",
      },
      {
        id: "insight-receivables",
        type: model.personalSummary.amountOthersOweMe > 0 ? "positive" : "trend",
        title: model.personalSummary.amountOthersOweMe > 0 ? "Incoming Receivables Due" : "Settlements Clear",
        description: model.personalSummary.amountOthersOweMe > 0 
          ? `You are expected to receive ₹${model.personalSummary.amountOthersOweMe.toLocaleString("en-IN")} from other members.`
          : "You have no outstanding reimbursements owed to you.",
        impact: model.personalSummary.amountOthersOweMe > 0 ? "Awaiting settlement execution by peers" : "Zero receivables risk",
        metric: `₹${model.personalSummary.amountOthersOweMe.toLocaleString("en-IN")}`,
        scope: "personal",
      },
      {
        id: "insight-payables",
        type: model.personalSummary.amountIOwe > 0 ? "warning" : "positive",
        title: model.personalSummary.amountIOwe > 0 ? "Pending Dues to Clear" : "Debt Free",
        description: model.personalSummary.amountIOwe > 0
          ? `You currently owe ₹${model.personalSummary.amountIOwe.toLocaleString("en-IN")} across group settlements.`
          : "You currently have no outstanding personal dues.",
        impact: model.personalSummary.amountIOwe > 0 ? "Pay via UPI QR to maintain high credit trust" : "Clean personal ledger",
        metric: `₹${model.personalSummary.amountIOwe.toLocaleString("en-IN")}`,
        scope: "personal",
      },
      {
        id: "insight-group-category",
        type: "trend",
        title: `Top Group Category: ${model.groupCategoryBreakdown[0]?.name || "General"}`,
        description: model.groupCategoryBreakdown[0] 
          ? `${model.groupCategoryBreakdown[0].name} accounts for ${model.groupCategoryBreakdown[0].percentage}% of total group expenses (₹${Math.round(model.groupCategoryBreakdown[0].value).toLocaleString("en-IN")}).`
          : "Group spending is evenly distributed across categories.",
        impact: "Primary collective budget driver",
        metric: `${model.groupCategoryBreakdown[0]?.percentage || 0}%`,
        scope: "group",
      },
      {
        id: "insight-personal-category",
        type: "trend",
        title: `Your Primary Category: ${model.personalCategoryBreakdown[0]?.name || "General"}`,
        description: model.personalCategoryBreakdown[0]
          ? `${model.personalCategoryBreakdown[0].name} accounts for ${model.personalCategoryBreakdown[0].percentage}% of your personal spending (₹${Math.round(model.personalCategoryBreakdown[0].value).toLocaleString("en-IN")}).`
          : "Your personal spending is evenly distributed.",
        impact: "Largest component of your living expenses",
        metric: `${model.personalCategoryBreakdown[0]?.percentage || 0}%`,
        scope: "personal",
      },
      {
        id: "insight-largest-group-tx",
        type: "anomaly",
        title: "Largest Group Transaction",
        description: model.groupSummary.largestGroupExpense.amount > 0
          ? `The largest group transaction was "${model.groupSummary.largestGroupExpense.title}" (₹${Math.round(model.groupSummary.largestGroupExpense.amount).toLocaleString("en-IN")}) in ${model.groupSummary.largestGroupExpense.groupName}.`
          : "No group expenses recorded in this period.",
        impact: "Highest single collective invoice",
        metric: `₹${Math.round(model.groupSummary.largestGroupExpense.amount).toLocaleString("en-IN")}`,
        scope: "group",
      },
      {
        id: "insight-personal-avg",
        type: "trend",
        title: "Your Average Transaction Value",
        description: `Your average transaction value is ₹${Math.round(model.personalSummary.myAverageTransaction).toLocaleString("en-IN")} across your personal entries.`,
        impact: "Individual transaction size benchmark",
        metric: `₹${Math.round(model.personalSummary.myAverageTransaction).toLocaleString("en-IN")}`,
        scope: "personal",
      },
    ];

    const recommendations = [
      {
        id: "rec-1",
        category: "debt" as const,
        title: "Settle Outstanding Liabilities",
        action: model.personalSummary.amountIOwe > 0
          ? `Pay ₹${model.personalSummary.amountIOwe.toLocaleString("en-IN")} in pending dues to group peers via instant UPI QR.`
          : "Maintain regular settlement sync to avoid dispute delays.",
        potentialSavings: model.personalSummary.amountIOwe,
        urgency: model.personalSummary.amountIOwe > 2000 ? ("high" as const) : ("low" as const),
      },
      {
        id: "rec-2",
        category: "savings" as const,
        title: "Emergency Reserve Allocation",
        action: model.personalSummary.mySavings > 0
          ? `Transfer ₹${Math.round(model.personalSummary.mySavings * 0.5).toLocaleString("en-IN")} of your retained cash into high-yield liquid savings.`
          : "Aim for a 20% savings buffer by reviewing discretionary purchases.",
        potentialSavings: Math.round(model.personalSummary.mySavings * 0.5),
        urgency: "medium" as const,
      },
      {
        id: "rec-3",
        category: "spending" as const,
        title: `Cap ${model.personalCategoryBreakdown[0]?.name || "Top Category"} Expenses`,
        action: `Set a monthly cap on ${model.personalCategoryBreakdown[0]?.name || "your top category"} to keep lifestyle burn controlled.`,
        potentialSavings: Math.round((model.personalCategoryBreakdown[0]?.value || 1000) * 0.15),
        urgency: "medium" as const,
      },
      {
        id: "rec-4",
        category: "group" as const,
        title: "Collect Pending Group Receivables",
        action: model.personalSummary.amountOthersOweMe > 0
          ? `Send payment reminder emails to peers for ₹${model.personalSummary.amountOthersOweMe.toLocaleString("en-IN")} in pending reimbursements.`
          : "Group receivables are fully reconciled.",
        potentialSavings: model.personalSummary.amountOthersOweMe,
        urgency: model.personalSummary.amountOthersOweMe > 3000 ? ("high" as const) : ("low" as const),
      },
    ];

    return {
      kpiCards,
      groupSummary: model.groupSummary,
      personalSummary: model.personalSummary,
      paymentSummary: model.paymentSummary,
      financialHealthScore: model.health,
      groupAnalytics: {
        monthlyTrend: model.groupMonthlyTrend,
        categoryBreakdown: model.groupCategoryBreakdown,
        paymentMethods: model.groupPaymentMethods,
        groupSpending: model.groupSpending,
      },
      personalAnalytics: {
        monthlyTrend: model.personalMonthlyTrend,
        categoryBreakdown: model.personalCategoryBreakdown,
        paymentMethods: model.personalPaymentMethods,
        transactionMetrics: {
          averageTransaction: model.personalSummary.myAverageTransaction,
          highestExpense: model.personalSummary.myLargestExpense,
          totalExpenseCount: model.expenseTxList.length,
        },
      },
      // Backward compatibility bindings
      monthlyTrend: model.personalMonthlyTrend,
      categoryBreakdown: model.personalCategoryBreakdown,
      topCategories: model.personalCategoryBreakdown,
      paymentMethods: model.personalPaymentMethods,
      groupSpending: model.groupSpending,
      settlementAnalytics: {
        pendingAmount: model.groupSummary.totalPendingSettlements.amount,
        completedAmount: model.groupSummary.totalCompletedSettlements.amount,
        pendingCount: model.groupSummary.totalPendingSettlements.count,
        completedCount: model.groupSummary.totalCompletedSettlements.count,
        settlementSuccessRate,
        avgSettlementSpeedDays,
        upiSettlementShare: 90,
        debtOptimizationSavings: {
          directTransfersCount: estDirectTransfers,
          optimizedTransfersCount: estOptimizedTransfers,
          transfersSaved,
          moneyVolumeOptimized,
          estimatedTimeSavedHours,
        },
      },
      weekendVsWeekday: {
        weekendAmount: weekendExpense,
        weekdayAmount: weekdayExpense,
        weekendCount,
        weekdayCount,
        weekendPercentage,
        weekdayPercentage,
        avgWeekendDaily: Number((weekendExpense / 2).toFixed(2)),
        avgWeekdayDaily: Number((weekdayExpense / 5).toFixed(2)),
      },
      dailyDistribution,
      transactionMetrics: {
        averageTransaction: model.personalSummary.myAverageTransaction,
        medianTransaction: model.personalSummary.myAverageTransaction,
        highestExpense: {
          amount: model.personalSummary.myLargestExpense.amount,
          title: model.personalSummary.myLargestExpense.title,
          date: model.personalSummary.myLargestExpense.date || formatDate(new Date()),
          category: model.personalSummary.myLargestExpense.category,
        },
        lowestExpense: {
          amount: 0,
          title: "None",
          date: formatDate(new Date()),
        },
        expenseFrequencyPerDay: Number((model.expenseTxList.length / daysCount).toFixed(1)),
        totalExpenseCount: model.expenseTxList.length,
      },
      totals: {
        income: model.personalSummary.myTotalIncome,
        expense: model.personalSummary.myTotalSpending,
        net: model.personalSummary.myNetBalance,
      },
      groupInsights: model.groupInsights,
      personalInsights: model.personalInsights,
      aiInsights,
      recommendations,
    };
  } catch (error) {
    throw new DatabaseError("Failed to calculate report analytics", { originalError: error });
  }
}

/**
 * SECTION 8–12: Export Report Trigger
 */
export async function exportReportData(
  format: "csv" | "json" | "pdf" | "excel",
  filters: ReportFilterOptions = {}
) {
  try {
    const user = await requireAuth();

    // Fetch full report items (up to 1000 items)
    const reportData = await getComprehensiveReport({
      ...filters,
      limit: 1000,
      page: 1,
    });

    const [summaryData, analyticsData, groupsData, settlementsData] = await Promise.all([
      getReportDashboardSummary(),
      getReportAnalytics(filters),
      db
        .select({
          id: groups.id,
          name: groups.name,
          type: groups.type,
          currency: groups.currency,
          splitMethod: groups.splitMethod,
        })
        .from(groups)
        .where(eq(groups.isDeleted, false))
        .limit(20),
      db
        .select({
          publicId: settlements.publicId,
          amount: settlements.amount,
          currency: settlements.currency,
          status: settlements.status,
          createdAt: settlements.createdAt,
        })
        .from(settlements)
        .where(
          and(
            eq(settlements.isDeleted, false),
            or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id))
          )
        )
        .limit(50),
    ]);

    const currentYear = new Date().getFullYear();
    const reportId = `RPT-SL-${currentYear}-${new Date().getTime().toString(36).toUpperCase()}`;
    const selectedGroupObj = filters.groupId
      ? groupsData.find((g) => g.id === filters.groupId)
      : null;
    const selectedGroupName = selectedGroupObj
      ? selectedGroupObj.name
      : "Consolidated Multi-Group Portfolio";

    // Query real member counts per group
    const memberCounts = await db
      .select({
        groupId: groupMembers.groupId,
        count: sql<number>`count(*)`,
      })
      .from(groupMembers)
      .groupBy(groupMembers.groupId);
    const memberCountMap = new Map<number, number>();
    memberCounts.forEach((mc) => memberCountMap.set(mc.groupId, Number(mc.count)));

    // Query real group total expenses
    const groupExpenseTotals = await db
      .select({
        groupId: transactions.groupId,
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.isDeleted, false), eq(transactions.type, "paid")))
      .groupBy(transactions.groupId);
    const groupExpenseMap = new Map<number, number>();
    groupExpenseTotals.forEach((ge) => {
      if (ge.groupId) groupExpenseMap.set(ge.groupId, Number(ge.total) / 100);
    });

    // Query real group settlements
    const groupSettlementStats = await db
      .select({
        groupId: settlements.groupId,
        pending: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.status} = 'pending' THEN ${settlements.amount} ELSE 0 END), 0)`,
        completed: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.status} = 'completed' THEN ${settlements.amount} ELSE 0 END), 0)`,
      })
      .from(settlements)
      .where(eq(settlements.isDeleted, false))
      .groupBy(settlements.groupId);
    const groupSettlementMap = new Map<number, { pending: number; completed: number }>();
    groupSettlementStats.forEach((gs) => {
      if (gs.groupId) {
        groupSettlementMap.set(gs.groupId, {
          pending: Number(gs.pending) / 100,
          completed: Number(gs.completed) / 100,
        });
      }
    });

    const realGroupsList = groupsData.map((g) => {
      const gExpense = groupExpenseMap.get(g.id) || 0;
      const gSettlement = groupSettlementMap.get(g.id) || { pending: 0, completed: 0 };
      const mCount = memberCountMap.get(g.id) || 1;
      return {
        id: g.id,
        name: g.name,
        type: g.type,
        currency: g.currency,
        splitMethod: g.splitMethod || "equal",
        memberCount: mCount,
        totalSpent: gExpense * 100,
        settlementsCompleted: gSettlement.completed,
        outstandingBalance: gSettlement.pending,
        completionRate: (gSettlement.completed + gSettlement.pending) > 0
          ? Math.round((gSettlement.completed / (gSettlement.completed + gSettlement.pending)) * 100)
          : 100,
      };
    });

    // Top 10 expenses sorted by amount descending
    const top10Expenses = [...reportData.transactions]
      .filter((tx) => tx.type === "paid")
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 10)
      .map((tx, idx) => ({
        rank: idx + 1,
        publicId: tx.publicId,
        title: tx.title || tx.description,
        category: tx.categoryName || "General",
        group: tx.groupName || "Personal",
        amount: (tx.amount || 0) / 100,
        date: formatDate(tx.date),
        paidBy: tx.paidByName || "Self",
      }));

    // Member analysis matrix
    const memberMap = new Map<string, { paid: number; count: number }>();
    reportData.transactions.forEach((tx) => {
      const pName = tx.paidByName || "Self";
      const existing = memberMap.get(pName) || { paid: 0, count: 0 };
      existing.paid += (tx.amount || 0) / 100;
      existing.count += 1;
      memberMap.set(pName, existing);
    });

    const memberAnalysis = Array.from(memberMap.entries()).map(([name, stat]) => ({
      name,
      paid: Number(stat.paid.toFixed(2)),
      owes: 0,
      receivable: name === (user.name || "Self") ? summaryData.totalReceivable : 0,
      netPosition: Number((name === (user.name || "Self") ? summaryData.totalReceivable : -stat.paid).toFixed(2)),
      status: "Reconciled",
      participationPercent: Number(((stat.count / (reportData.totalCount || 1)) * 100).toFixed(1)),
    }));

    const exportPayload: ExportReportData = {
      reportTitle: filters.reportType && filters.reportType !== "overview"
        ? `${filters.reportType.replace(/_/g, " ").toUpperCase()} REPORT`
        : "FINANCIAL SUMMARY REPORT",
      generatedBy: user.name || user.email || "User",
      userEmail: user.email || null,
      generatedAt: new Date(),
      currency: "INR",
      periodLabel: filters.period ? filters.period.replace(/_/g, " ").toUpperCase() : "ALL TIME",
      selectedGroup: selectedGroupName,
      reportId,
      version: "SplitLedger AI",
      summary: {
        totalIncome: reportData.summary.totalIncome,
        totalExpense: reportData.summary.totalExpense,
        netBalance: reportData.summary.netBalance,
        totalReceivable: summaryData.totalReceivable,
        totalPayable: summaryData.totalPayable,
        totalSettlements: summaryData.totalSettlements,
        transactionCount: reportData.totalCount,
        activeGroupsCount: summaryData.activeGroupsCount,
        personalTxCount: summaryData.personalTxCount,
        groupTxCount: summaryData.groupTxCount,
        totalMembersCount: summaryData.totalMembersCount,
        pendingSettlementsCount: summaryData.pendingSettlementsCount,
        completedSettlementsCount: summaryData.totalSettlements,
        averageDailySpend: analyticsData.weekendVsWeekday ? (analyticsData.weekendVsWeekday.weekendAmount + analyticsData.weekendVsWeekday.weekdayAmount) / 30 : reportData.summary.totalExpense / 30,
      },
      transactions: reportData.transactions as ExportTransactionItem[],
      groups: realGroupsList,
      members: memberAnalysis,
      settlements: settlementsData.map((s) => ({
        publicId: s.publicId,
        groupName: "Direct",
        fromUser: user.name || "User",
        toUser: "Member",
        amount: s.amount,
        currency: s.currency,
        status: s.status,
        date: s.createdAt,
      })),
      financialHealthScore: analyticsData.financialHealthScore.score,
      healthGrade: analyticsData.financialHealthScore.grade,
      healthDetails: analyticsData.financialHealthScore,
      monthlyTrend: analyticsData.monthlyTrend,
      kpiCards: analyticsData.kpiCards,
      reportScope: filters.reportScope || "combined",
      groupSummary: analyticsData.groupSummary,
      personalSummary: analyticsData.personalSummary,
      paymentSummary: analyticsData.paymentSummary,
      myTransactions: reportData.myTransactions,
      groupTransactions: reportData.groupTransactions,
      groupInsights: analyticsData.groupInsights,
      personalInsights: analyticsData.personalInsights,
      categoryBreakdown: analyticsData.categoryBreakdown.map((cat: any) => ({
        name: cat.name,
        amount: cat.value,
        percentage: cat.percentage,
        count: cat.count,
        growthPercent: (cat as any).growthPercent || 0,
      })),
      paymentMethods: analyticsData.paymentMethods,
      weekendVsWeekday: analyticsData.weekendVsWeekday,
      dailyDistribution: analyticsData.dailyDistribution,
      transactionMetrics: analyticsData.transactionMetrics,
      settlementAnalytics: analyticsData.settlementAnalytics,
      top10Expenses,
      aiInsights: analyticsData.aiInsights.map((ins) => ({
        id: ins.id,
        title: ins.title,
        description: ins.description,
        impact: ins.impact,
        metric: ins.metric,
        type: ins.type,
      })),
      recommendations: analyticsData.recommendations.map((rec) => ({
        title: rec.title,
        action: rec.action,
        potentialSavings: rec.potentialSavings,
        urgency: rec.urgency,
      })),
      auditInfo: {
        generatedAt: formatDateTime(new Date()),
        generatedBy: `${user.name || "User"} (${user.email || ""})`,
        filtersApplied: `Type: ${filters.reportType || "Overview"}, Period: ${filters.period || "All Time"}, Group: ${selectedGroupName}`,
        selectedGroups: selectedGroupName,
        selectedMembers: "All Active Members",
        currency: "INR (₹) — Indian Rupee",
        appVersion: "SplitLedger AI Enterprise v3.4.2",
        reportVersion: "v3.4.2 Enterprise Final",
        reportId,
      },
    };

    const dateSlug = new Date().toISOString().split("T")[0];
    let filename = `splitledger-report-${filters.reportType || "all"}-${dateSlug}`;
    let content = "";
    let mimeType = "";

    switch (format) {
      case "csv":
        filename += ".csv";
        content = generateCSVExport(exportPayload);
        mimeType = "text/csv;charset=utf-8;";
        break;

      case "json":
        filename += ".json";
        content = generateJSONExport(exportPayload);
        mimeType = "application/json;charset=utf-8;";
        break;

      case "pdf":
        filename += ".html";
        content = generatePrintableHTMLReport(exportPayload);
        mimeType = "text/html;charset=utf-8;";
        break;

      case "excel":
        filename += ".xls";
        content = generateExcelWorkbook(exportPayload);
        mimeType = "application/vnd.ms-excel;charset=utf-8;";
        break;

      default:
        throw new ValidationError("Unsupported export format");
    }

    return {
      filename,
      content,
      mimeType,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to export report data", { originalError: error });
  }
}

/**
 * SECTION 14: Saved Reports Manager
 */
export async function saveReportConfig(input: {
  name: string;
  description?: string;
  reportType: string;
  filters: any;
}) {
  try {
    const user = await requireAuth();

    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError("Report name is required");
    }

    const publicId = generateReportId();

    const [saved] = await db
      .insert(savedReports)
      .values({
        publicId,
        userId: user.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        reportType: input.reportType || "custom",
        filters: input.filters || {},
      })
      .returning();

    revalidatePath("/dashboard/reports");
    return { success: true, savedReport: saved };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to save report configuration", { originalError: error });
  }
}

export async function getSavedReports() {
  try {
    const user = await requireAuth();

    const list = await db
      .select()
      .from(savedReports)
      .where(eq(savedReports.userId, user.id))
      .orderBy(desc(savedReports.createdAt));

    return list;
  } catch (error) {
    throw new DatabaseError("Failed to fetch saved reports", { originalError: error });
  }
}

export async function deleteSavedReport(publicId: string) {
  try {
    const user = await requireAuth();

    await db
      .delete(savedReports)
      .where(
        and(
          eq(savedReports.publicId, publicId),
          eq(savedReports.userId, user.id)
        )
      );

    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to delete saved report", { originalError: error });
  }
}

/**
 * SECTION 15: Scheduled Reports Manager
 */
export async function createScheduledReport(input: {
  name: string;
  savedReportId?: number;
  frequency: "daily" | "weekly" | "monthly";
  recipientEmail: string;
  format?: "pdf" | "csv" | "excel" | "json";
}) {
  try {
    const user = await requireAuth();

    if (!input.name || !input.recipientEmail) {
      throw new ValidationError("Name and recipient email are required");
    }

    const publicId = generateScheduleId();

    const [scheduled] = await db
      .insert(scheduledReports)
      .values({
        publicId,
        userId: user.id,
        savedReportId: input.savedReportId || null,
        name: input.name.trim(),
        frequency: input.frequency,
        recipientEmail: input.recipientEmail.trim(),
        format: input.format || "pdf",
        isActive: true,
      })
      .returning();

    revalidatePath("/dashboard/reports");
    return { success: true, scheduledReport: scheduled };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to schedule report", { originalError: error });
  }
}

export async function getScheduledReports() {
  try {
    const user = await requireAuth();

    const list = await db
      .select({
        id: scheduledReports.id,
        publicId: scheduledReports.publicId,
        name: scheduledReports.name,
        frequency: scheduledReports.frequency,
        recipientEmail: scheduledReports.recipientEmail,
        format: scheduledReports.format,
        isActive: scheduledReports.isActive,
        lastRunAt: scheduledReports.lastRunAt,
        nextRunAt: scheduledReports.nextRunAt,
        createdAt: scheduledReports.createdAt,
      })
      .from(scheduledReports)
      .where(eq(scheduledReports.userId, user.id))
      .orderBy(desc(scheduledReports.createdAt));

    return list;
  } catch (error) {
    throw new DatabaseError("Failed to fetch scheduled reports", { originalError: error });
  }
}

export async function toggleScheduledReport(publicId: string, isActive: boolean) {
  try {
    const user = await requireAuth();

    await db
      .update(scheduledReports)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(
          eq(scheduledReports.publicId, publicId),
          eq(scheduledReports.userId, user.id)
        )
      );

    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to toggle scheduled report", { originalError: error });
  }
}

export async function deleteScheduledReport(publicId: string) {
  try {
    const user = await requireAuth();

    await db
      .delete(scheduledReports)
      .where(
        and(
          eq(scheduledReports.publicId, publicId),
          eq(scheduledReports.userId, user.id)
        )
      );

    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to delete scheduled report", { originalError: error });
  }
}
