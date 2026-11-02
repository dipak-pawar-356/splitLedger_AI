import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, groups, groupMembers } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { getComprehensiveAnalytics } from "@/actions/analytics";
import { AnalyticsClientView } from "@/components/analytics/analytics-client-view";

export const metadata: Metadata = createPageMetadata({
  title: "Cashflow & Expense Analytics | SplitLedger AI",
  description:
    "Interactive financial analytics, category breakdowns, month-over-month trends, and burn rate visualization.",
  path: "/dashboard/analytics",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await requireAuth();

  const [initialData, allCategories, userGroups] = await Promise.all([
    getComprehensiveAnalytics({ period: "this_month" }),
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
  ]);

  return (
    <AnalyticsClientView
      initialData={initialData}
      categories={allCategories}
      groups={userGroups}
    />
  );
}
