import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, groups, groupMembers } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { getComprehensiveAnalytics } from "@/actions/analytics";
import { AnalyticsClientView } from "@/components/analytics/analytics-client-view";

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
