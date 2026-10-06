import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { getUserActivityTimeline } from "@/actions/activity";
import { ActivityTimelineView } from "@/components/activity/activity-timeline-view";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<{ action?: string; entity?: string; groupId?: string }>;
}) {
  const user = await requireAuth();
  const sParams = await searchParams;

  const [timelineData, userGroups] = await Promise.all([
    getUserActivityTimeline({
      action: sParams?.action,
      entityType: sParams?.entity,
      groupId: sParams?.groupId ? Number(sParams.groupId) : undefined,
    }),
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
    <ActivityTimelineView
      initialSections={timelineData.sections}
      initialTotalCount={timelineData.totalCount}
      groups={userGroups}
    />
  );
}
