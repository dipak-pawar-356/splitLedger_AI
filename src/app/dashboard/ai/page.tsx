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

export default async function AIAssistantPage(props: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const month = searchParams.month;
  const user = await requireAuth();

  const [intelligenceData, allCategories, userGroups, userReminders] = await Promise.all([
    getFinancialIntelligence(month || "current_month", undefined, undefined, month),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.name),
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
      .orderBy(groups.name),
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
}
