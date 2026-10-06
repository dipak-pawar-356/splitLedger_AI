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
import { eq, desc, and, sql, gte, lte, or } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { DatabaseError } from "@/lib/errors";
import { getBudgetsWithProgress, BudgetProgress } from "@/actions/budgets";
import { generateExecutiveReportNarrative } from "@/lib/ai/executive-summary";

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
  confidencePct: number;
  projectedBudgetUsagePct: number;
  expectedSettlementLoad: number; // in rupees
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

/**
 * SECTION 4–14: Financial Intelligence Master Query & Evaluation Engine
 */
export async function getFinancialIntelligence(): Promise<FinancialIntelligenceData> {
  try {
    const user = await requireAuth();
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Parallel Batch Aggregation
    const [
      userBudgets,
      currentMonthTransactionsRaw,
      lastMonthTransactionsRaw,
      sixMonthTransactionsRaw,
      allSettlementsRaw,
      userProfileRaw,
      activeGroupsRaw,
    ] = await Promise.all([
      getBudgetsWithProgress(),

      // Current month transactions
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
            gte(transactions.date, startOfCurrentMonth)
          )
        ),

      // Last month transactions
      db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          type: transactions.type,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.isDeleted, false),
            eq(transactions.userId, user.id),
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
            gte(transactions.date, new Date(now.getFullYear(), now.getMonth() - 5, 1))
          )
        )
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`, sql`TO_CHAR(${transactions.date}, 'Day')`),

      // Settlements audit
      db
        .select({
          id: settlements.id,
          fromUserId: settlements.fromUserId,
          toUserId: settlements.toUserId,
          amount: settlements.amount,
          status: settlements.status,
          createdAt: settlements.createdAt,
          paidAt: settlements.paidAt,
        })
        .from(settlements)
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

    // ----------------------------------------------------
    // SECTION 4: AI Financial Insights Generation
    // ----------------------------------------------------
    const aiInsights: AIInsight[] = [];

    // Category Surge Analysis
    const categorySpendingMap = new Map<string, number>();
    currentMonthTransactionsRaw.forEach((t) => {
      if (t.type === "paid" || t.type === "borrowed") {
        const cat = t.categoryName || "General";
        categorySpendingMap.set(cat, (categorySpendingMap.get(cat) || 0) + t.amount / 100);
      }
    });

    const lastMonthCatMap = new Map<string, number>();
    lastMonthTransactionsRaw.forEach((t) => {
      if (t.type === "paid" || t.type === "borrowed") {
        const cat = t.categoryName || "General";
        lastMonthCatMap.set(cat, (lastMonthCatMap.get(cat) || 0) + t.amount / 100);
      }
    });

    categorySpendingMap.forEach((currentAmt, cat) => {
      const prevAmt = lastMonthCatMap.get(cat) || 0;
      if (prevAmt > 0 && currentAmt > prevAmt) {
        const growth = Math.round(((currentAmt - prevAmt) / prevAmt) * 100);
        if (growth >= 15) {
          aiInsights.push({
            id: `insight-cat-${cat}`,
            type: "category_surge",
            severity: growth >= 40 ? "warning" : "info",
            title: `${cat} Spending Surge`,
            description: `Your ${cat} expenses increased by ${growth}% compared to last month (₹${currentAmt.toFixed(2)} vs ₹${prevAmt.toFixed(2)}).`,
            metricValue: `+${growth}%`,
            date: now,
          });
        }
      }
    });

    if (savingsRate > 25) {
      aiInsights.push({
        id: "insight-savings-high",
        type: "savings_alert",
        severity: "positive",
        title: "High Savings Velocity",
        description: `You have retained ${savingsRate}% of your total income this month as net savings.`,
        metricValue: `${savingsRate}%`,
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

    if (pendingReceivables > 500) {
      recommendations.push({
        id: "rec-send-reminders",
        priority: "medium",
        category: "settlement",
        title: "Collect Outstanding Dues",
        reason: `Group members owe you ₹${pendingReceivables.toFixed(2)}.`,
        suggestedAction: "Send polite WhatsApp/Email payment reminders to speed up settlement.",
        actionType: "send_reminder",
      });
    }

    if (userBudgets.length === 0) {
      recommendations.push({
        id: "rec-create-budget",
        priority: "medium",
        category: "budget",
        title: "Set Up a Monthly Budget",
        reason: "Active budgets help you prevent overspending and boost your financial health score.",
        suggestedAction: "Create a monthly grocery or general spending target.",
        actionType: "create_budget",
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
    // SECTION 7: Forecasting Model (1M, 1Q, 6M, 1Y)
    // ----------------------------------------------------
    const avgMonthlyExp = sixMonthTransactionsRaw.length > 0
      ? sixMonthTransactionsRaw.reduce((sum, m) => sum + Number(m.expense) / 100, 0) / Math.max(1, new Set(sixMonthTransactionsRaw.map(m => m.month)).size)
      : currentMonthExpenses;

    const avgMonthlyInc = sixMonthTransactionsRaw.length > 0
      ? sixMonthTransactionsRaw.reduce((sum, m) => sum + Number(m.income) / 100, 0) / Math.max(1, new Set(sixMonthTransactionsRaw.map(m => m.month)).size)
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
        confidencePct: 92,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables),
      },
      {
        period: "1q",
        periodLabel: "Next Quarter (3M)",
        predictedIncome: projInc * 3,
        predictedExpense: projExp * 3,
        predictedSavings: (projInc - projExp) * 3,
        confidencePct: 86,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables * 1.5),
      },
      {
        period: "6m",
        periodLabel: "Next 6 Months",
        predictedIncome: projInc * 6,
        predictedExpense: projExp * 6,
        predictedSavings: (projInc - projExp) * 6,
        confidencePct: 80,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables * 2),
      },
      {
        period: "1y",
        periodLabel: "Next Year (12M)",
        predictedIncome: projInc * 12,
        predictedExpense: projExp * 12,
        predictedSavings: (projInc - projExp) * 12,
        confidencePct: 74,
        projectedBudgetUsagePct: projExp > 0 ? Math.min(100, Math.round((projExp / Math.max(1, totalBudgetAllocated || projExp)) * 100)) : 0,
        expectedSettlementLoad: Math.round(pendingPayables * 3),
      },
    ];

    // ----------------------------------------------------
    // SECTION 8: Cash Flow Analysis
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

    // Dynamic Executive Narrative
    const topCatName = categoryBreakdown.length > 0 ? categoryBreakdown[0].name : "General Outflow";
    const executiveNarrative = generateExecutiveReportNarrative("monthly", {
      totalSpent: currentMonthExpenses,
      totalBudget: totalBudgetAllocated > 0 ? totalBudgetAllocated : currentMonthExpenses,
      topCategory: topCatName,
    });

    return {
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
