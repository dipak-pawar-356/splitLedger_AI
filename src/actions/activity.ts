"use server";

import { db } from "@/lib/db";
import { 
  auditLogs, 
  users, 
  groups, 
  groupMembers, 
  transactions, 
  settlements 
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, or, gte, lte, ilike, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { DatabaseError, NotFoundError } from "@/lib/errors";

export interface ActivityItem {
  id: number;
  publicId: string;
  action: string;
  entityType: string;
  entityId: number;
  entityPublicId?: string | null;
  actorId?: number | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  title: string;
  description: string;
  groupName?: string | null;
  groupId?: number | null;
  groupPublicId?: string | null;
  amount?: number | null; // in rupees
  currency?: string;
  changes?: any;
  deepLink?: string | null;
  actionLabel?: string | null;
  createdAt: Date;
}

export interface ActivityTimelineSection {
  title: "Today" | "Yesterday" | "This Week" | "Earlier";
  items: ActivityItem[];
}

export interface ActivityFilterOptions {
  search?: string;
  action?: string;
  entityType?: string;
  groupId?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number;
  offset?: number;
}

/**
 * Format activity title, description, and deep links
 */
function buildActivityPresentation(
  log: any,
  actorName: string,
  groupName?: string | null,
  groupPublicId?: string | null
): { title: string; description: string; deepLink: string | null; actionLabel: string | null; amount: number | null } {
  let title = "Action Performed";
  let description = `${actorName} performed an action.`;
  let deepLink: string | null = null;
  let actionLabel: string | null = null;
  let amount: number | null = null;

  const after = log.afterData || {};
  const before = log.beforeData || {};
  const rawAmt = after.amount || before.amount;
  if (rawAmt) {
    amount = Number(rawAmt) / 100;
  }

  switch (log.action) {
    case "create_group":
    case "group_created":
      title = "Group Created";
      description = `${actorName} created the group "${after.name || groupName || 'New Group'}".`;
      if (groupPublicId || log.entityPublicId) deepLink = `/dashboard/groups/${groupPublicId || log.entityPublicId}`;
      actionLabel = "View Group";
      break;

    case "update_group":
    case "group_updated":
      title = "Group Settings Updated";
      description = `${actorName} updated settings for "${groupName || 'Group'}".`;
      if (groupPublicId || log.entityPublicId) deepLink = `/dashboard/groups/${groupPublicId || log.entityPublicId}`;
      actionLabel = "View Group";
      break;

    case "delete_group":
    case "group_deleted":
      title = "Group Deleted";
      description = `${actorName} deleted group "${groupName || 'Group'}".`;
      break;

    case "create_transaction":
    case "transaction_created":
    case "expense_created":
      title = groupName ? "Group Expense Added" : "Personal Expense Added";
      description = `${actorName} recorded "${after.title || 'Expense'}" in ${groupName ? groupName : 'Personal Ledger'}.`;
      if (log.entityPublicId) deepLink = `/dashboard/transactions/${log.entityPublicId}`;
      actionLabel = "View Expense";
      break;

    case "update_transaction":
    case "transaction_updated":
    case "expense_updated":
      title = "Expense Edited";
      description = `${actorName} updated details for "${after.title || before.title || 'Expense'}".`;
      if (log.entityPublicId) deepLink = `/dashboard/transactions/${log.entityPublicId}`;
      actionLabel = "View Changes";
      break;

    case "delete_transaction":
    case "transaction_deleted":
      title = "Expense Deleted";
      description = `${actorName} removed transaction "${before.title || 'Expense'}".`;
      break;

    case "restore_transaction":
    case "transaction_restored":
      title = "Expense Restored";
      description = `${actorName} restored transaction "${after.title || 'Expense'}".`;
      if (log.entityPublicId) deepLink = `/dashboard/transactions/${log.entityPublicId}`;
      actionLabel = "View Expense";
      break;

    case "create_settlement":
    case "settlement_created":
      title = "Settlement Requested";
      description = `${actorName} initiated a settlement of ₹${amount ? amount.toFixed(2) : '0'}.`;
      if (groupPublicId) deepLink = `/dashboard/groups/${groupPublicId}?tab=settlements`;
      actionLabel = "View Settlement";
      break;

    case "complete_settlement":
    case "settlement_completed":
      title = "Settlement Completed";
      description = `${actorName} completed payment settlement of ₹${amount ? amount.toFixed(2) : '0'}.`;
      if (groupPublicId) deepLink = `/dashboard/groups/${groupPublicId}?tab=settlements`;
      actionLabel = "View Settlement";
      break;

    case "member_invited":
    case "invite_sent":
      title = "Group Invitation Sent";
      description = `${actorName} invited a new member to ${groupName || 'group'}.`;
      if (groupPublicId) deepLink = `/dashboard/groups/${groupPublicId}`;
      actionLabel = "View Members";
      break;

    case "member_joined":
      title = "New Member Joined";
      description = `${actorName} joined ${groupName || 'the group'}.`;
      if (groupPublicId) deepLink = `/dashboard/groups/${groupPublicId}`;
      actionLabel = "View Group";
      break;

    case "member_removed":
      title = "Member Removed";
      description = `${actorName} removed a member from ${groupName || 'the group'}.`;
      break;

    case "receipt_uploaded":
      title = "Receipt Uploaded";
      description = `${actorName} uploaded an expense receipt for OCR analysis.`;
      if (log.entityPublicId) deepLink = `/dashboard/transactions/${log.entityPublicId}?tab=receipts`;
      actionLabel = "View Receipt";
      break;

    case "comment_added":
      title = "Comment Added";
      description = `${actorName} added a comment: "${(after.content || '').substring(0, 40)}..."`;
      break;

    case "report_export":
      title = "Report Exported";
      description = `${actorName} generated and exported financial reports.`;
      deepLink = "/dashboard/reports";
      actionLabel = "View Reports";
      break;

    case "profile_updated":
      title = "Profile Updated";
      description = `${actorName} updated profile settings.`;
      deepLink = "/dashboard/profile";
      actionLabel = "View Profile";
      break;

    case "budget_created":
      title = "Budget Target Created";
      description = `${actorName} created a new spending budget "${after.name || 'Budget'}".`;
      deepLink = "/dashboard/ai";
      actionLabel = "View Budgets";
      break;

    default:
      title = log.action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
      description = `${actorName} executed ${title.toLowerCase()}.`;
      break;
  }

  return { title, description, deepLink, actionLabel, amount };
}

/**
 * SECTION 1 & 2: Get user activity timeline (Own activities + Group activities)
 */
export async function getUserActivityTimeline(
  filters: ActivityFilterOptions = {}
): Promise<{
  sections: ActivityTimelineSection[];
  totalCount: number;
}> {
  try {
    const user = await requireAuth();

    // Find all group IDs user is a member of
    const userGroups = await db
      .select({ id: groups.id, name: groups.name, publicId: groups.publicId })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(and(eq(groupMembers.userId, user.id), eq(groups.isDeleted, false)));

    const groupMap = new Map<number, { name: string; publicId: string }>();
    userGroups.forEach((g) => groupMap.set(g.id, { name: g.name, publicId: g.publicId }));

    const userGroupIds = userGroups.map((g) => g.id);

    // Build conditions: User's own actions OR actions relating to user's groups
    const baseCondition = userGroupIds.length > 0
      ? or(
          eq(auditLogs.userId, user.id),
          and(eq(auditLogs.entityType, "group"), inArray(auditLogs.entityId, userGroupIds))
        )
      : eq(auditLogs.userId, user.id);

    const conditions: any[] = [baseCondition];

    if (filters.action && filters.action !== "all") {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters.entityType && filters.entityType !== "all") {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }

    if (filters.groupId) {
      conditions.push(
        and(eq(auditLogs.entityType, "group"), eq(auditLogs.entityId, filters.groupId))
      );
    }

    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [rows, countRes] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          publicId: auditLogs.publicId,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          entityPublicId: auditLogs.entityPublicId,
          changes: auditLogs.changes,
          beforeData: auditLogs.beforeData,
          afterData: auditLogs.afterData,
          reason: auditLogs.reason,
          createdAt: auditLogs.createdAt,
          actorId: auditLogs.userId,
          actorName: users.name,
          actorAvatar: users.avatar,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(...conditions.filter(Boolean)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(auditLogs)
        .where(and(...conditions.filter(Boolean))),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

    const formattedItems: ActivityItem[] = rows.map((r: any) => {
      const actorName = r.actorId === user.id ? "You" : r.actorName || "A Member";
      const relatedGroup = r.entityType === "group" ? groupMap.get(r.entityId) : null;
      const groupName = relatedGroup?.name || (r.afterData?.groupName || r.beforeData?.groupName);
      const groupPublicId = relatedGroup?.publicId;

      const { title, description, deepLink, actionLabel, amount } = buildActivityPresentation(
        r,
        actorName,
        groupName,
        groupPublicId
      );

      return {
        id: r.id,
        publicId: r.publicId || `aud_${r.id}`,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        entityPublicId: r.entityPublicId,
        actorId: r.actorId,
        actorName: r.actorId === user.id ? "You" : r.actorName || "Member",
        actorAvatar: r.actorAvatar,
        title,
        description,
        groupName,
        groupId: relatedGroup ? r.entityId : null,
        groupPublicId,
        amount,
        currency: "INR",
        changes: r.changes,
        deepLink,
        actionLabel,
        createdAt: r.createdAt,
      };
    });

    // Group into Today, Yesterday, This Week, Earlier (SECTION 2)
    const todayItems: ActivityItem[] = [];
    const yesterdayItems: ActivityItem[] = [];
    const thisWeekItems: ActivityItem[] = [];
    const earlierItems: ActivityItem[] = [];

    formattedItems.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      if (itemDate >= startOfToday) {
        todayItems.push(item);
      } else if (itemDate >= startOfYesterday) {
        yesterdayItems.push(item);
      } else if (itemDate >= startOfWeek) {
        thisWeekItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    const sections: ActivityTimelineSection[] = [];
    if (todayItems.length > 0) sections.push({ title: "Today", items: todayItems });
    if (yesterdayItems.length > 0) sections.push({ title: "Yesterday", items: yesterdayItems });
    if (thisWeekItems.length > 0) sections.push({ title: "This Week", items: thisWeekItems });
    if (earlierItems.length > 0) sections.push({ title: "Earlier", items: earlierItems });

    return {
      sections,
      totalCount: Number(countRes[0]?.count || 0),
    };
  } catch (error) {
    throw new DatabaseError("Failed to fetch user activity timeline", { originalError: error });
  }
}

/**
 * SECTION 3: Get Group-Specific Activity Timeline
 */
export async function getGroupActivityTimeline(
  groupPublicId: string,
  limit: number = 30
): Promise<ActivityItem[]> {
  try {
    const user = await requireAuth();

    // Verify membership
    const [group] = await db
      .select({ id: groups.id, name: groups.name, publicId: groups.publicId })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          eq(groups.publicId, groupPublicId),
          eq(groupMembers.userId, user.id),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) throw new NotFoundError("Group");

    const rows = await db
      .select({
        id: auditLogs.id,
        publicId: auditLogs.publicId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        entityPublicId: auditLogs.entityPublicId,
        changes: auditLogs.changes,
        beforeData: auditLogs.beforeData,
        afterData: auditLogs.afterData,
        reason: auditLogs.reason,
        createdAt: auditLogs.createdAt,
        actorId: auditLogs.userId,
        actorName: users.name,
        actorAvatar: users.avatar,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.entityType, "group"),
          eq(auditLogs.entityId, group.id)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return rows.map((r: any) => {
      const actorName = r.actorId === user.id ? "You" : r.actorName || "A Member";
      const { title, description, deepLink, actionLabel, amount } = buildActivityPresentation(
        r,
        actorName,
        group.name,
        group.publicId
      );

      return {
        id: r.id,
        publicId: r.publicId || `aud_${r.id}`,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        entityPublicId: r.entityPublicId,
        actorId: r.actorId,
        actorName,
        actorAvatar: r.actorAvatar,
        title,
        description,
        groupName: group.name,
        groupId: group.id,
        groupPublicId: group.publicId,
        amount,
        currency: "INR",
        changes: r.changes,
        deepLink,
        actionLabel,
        createdAt: r.createdAt,
      };
    });
  } catch (error) {
    throw new DatabaseError("Failed to fetch group activity timeline", { originalError: error });
  }
}

export interface ActivityEntry {
  id: number;
  userId: number | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: number;
  changes?: any;
  createdAt: Date;
}

export async function getActivityLog(data: {
  transactionId?: number;
  settlementId?: number;
  groupId?: number;
  limit?: number;
}): Promise<ActivityEntry[]> {
  try {
    const user = await requireAuth();
    const limit = data.limit || 50;

    let whereClause = undefined;
    if (data.transactionId) {
      whereClause = and(
        eq(auditLogs.entityType, "transaction"),
        eq(auditLogs.entityId, data.transactionId)
      );
    } else if (data.settlementId) {
      whereClause = and(
        eq(auditLogs.entityType, "settlement"),
        eq(auditLogs.entityId, data.settlementId)
      );
    } else if (data.groupId) {
      whereClause = and(
        eq(auditLogs.entityType, "group"),
        eq(auditLogs.entityId, data.groupId)
      );
    }

    const query = db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        changes: auditLogs.changes,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

    const activities = whereClause
      ? await query.where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(limit)
      : await query.orderBy(desc(auditLogs.createdAt)).limit(limit);

    return activities.map((activity) => ({
      ...activity,
      changes: typeof activity.changes === "string" ? JSON.parse(activity.changes) : activity.changes,
    }));
  } catch (error) {
    throw new DatabaseError("Failed to fetch activity log", { originalError: error });
  }
}

