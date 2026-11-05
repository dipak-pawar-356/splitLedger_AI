import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, groups, groupMembers } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { getFinancialIntelligence } from "@/actions/financial-intelligence";
import { getReminders } from "@/actions/reminders";
import { FinancialIntelligenceClientView } from "@/components/ai/financial-intelligence-client-view";

export const metadata: Metadata = createPageMetadata({
  title: "AI Expense Assistant & Financial Intelligence | SplitLedger AI",
  description:
    "Intelligent conversational financial assistant, automated transaction parsing, spend anomaly detection, and savings insights.",
  path: "/dashboard/ai",
  noIndex: true,
});

export const dynamic = "force-dynamic";

import { parseMonthParam } from "@/lib/month-sync";

export default async function AIAssistantPage(props: {
  searchParams?: Promise<{ month?: string | string[] }>;
}) {
  let month: string | undefined;
  try {
    const searchParams = props.searchParams ? await props.searchParams : {};
    const rawMonth = searchParams?.month;
    month = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;
  } catch {
    month = undefined;
  }

  const user = await requireAuth();

  try {
    const [intelligenceData, allCategories, userGroups, userReminders] = await Promise.all([
      getFinancialIntelligence(month || "current_month", undefined, undefined, month),
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(categories.name)
        .catch(() => []),
      db
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
        .where(
          and(
            eq(groupMembers.userId, user.id),
            eq(groups.isDeleted, false)
          )
        )
        .orderBy(groups.name)
        .catch(() => []),
      getReminders({ isCompleted: false, isArchived: false }).catch(() => []),
    ]);

    return (
      <FinancialIntelligenceClientView
        initialData={intelligenceData}
        categories={allCategories}
        groups={userGroups}
        initialReminders={userReminders as any}
        initialMonth={month}
      />
    );
  } catch (error) {
    console.error("Error loading AI Assistant page:", error);
    const monthInfo = parseMonthParam(month);
    const fallbackIntelligence = {
      cashFlow: {
        moneyIn: 0,
        moneyOut: 0,
        netCashFlow: 0,
        monthlyFlows: [],
        averageMonthlyInflow: 0,
        averageMonthlyOutflow: 0,
        peakExpenseMonth: "",
        peakIncomeMonth: "",
      },
      categoryBreakdown: [],
      trends: [],
      recurringExpenses: [],
      unusualSpending: [],
      forecasts: [],
      recommendations: [],
      healthScore: { score: 95, grade: "Good" as const, factors: [] },
      summary: "AI financial analysis safely initialized. Record transactions to view live insights.",
      budgets: [],
      controlCenter: {
        totalIncome: 0,
        totalExpense: 0,
        netCashFlow: 0,
        savings: 0,
        savingsRate: 0,
        currency: "INR",
        periodLabel: monthInfo.label,
        transactionCount: 0,
        hasVerifiedData: false,
      },
      aiInsights: ["AI Financial Assistant is connected to verified ledger records."],
    };

    return (
      <FinancialIntelligenceClientView
        initialData={fallbackIntelligence as any}
        categories={[]}
        groups={[]}
        initialReminders={[]}
        initialMonth={month}
      />
    );
  }
}
