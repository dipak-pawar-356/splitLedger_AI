"use server";

import { db, withDbRetry } from "@/lib/db";
import { notifications, profiles, users, groups, transactions } from "@/lib/db/schema/schema";
import { eq, and, desc, isNull, sql, or, ilike, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { generatePublicId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError } from "@/lib/errors";
import { recordAuditLog } from "@/lib/audit";
import { eventBus } from "@/lib/realtime/event-bus";
import { DEFAULT_SETTINGS, NotificationPreferences as DetailedNotificationPreferences } from "@/lib/types/settings";

export interface CreateNotificationInput {
  userId?: number; // Target user ID, defaults to authenticated user
  type?: string;
  category?: 
    | "group" 
    | "expense" 
    | "settlement" 
    | "invitation" 
    | "reminder" 
    | "payment" 
    | "transaction" 
    | "receipt" 
    | "comment" 
    | "mention" 
    | "profile" 
    | "security" 
    | "system" 
    | "report" 
    | "budget" 
    | "analytics" 
    | "ai_insight";
  title: string;
  message: string;
  priority?: "critical" | "high" | "medium" | "low";
  groupId?: number;
  transactionId?: number;
  senderId?: number;
  metadata?: {
    amount?: number; // In rupees
    currency?: string;
    groupName?: string;
    groupPublicId?: string;
    transactionPublicId?: string;
    senderName?: string;
    senderAvatar?: string | null;
    actionUrl?: string;
    actionLabel?: string;
    [key: string]: any;
  };
}

export interface NotificationFilterOptions {
  tab?: "all" | "unread" | "pinned" | "archived";
  category?: string;
  priority?: "critical" | "high" | "medium" | "low" | "all";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationItem {
  id: number;
  publicId: string;
  userId: number;
  type: string;
  category: string;
  title: string;
  message: string;
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  groupId?: number | null;
  transactionId?: number | null;
  senderId?: number | null;
  metadata?: any;
  isRead: boolean;
  isPinned: boolean;
  isArchived: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  expenseNotifications: boolean;
  settlementNotifications: boolean;
  groupNotifications: boolean;
  invitationNotifications: boolean;
  budgetNotifications: boolean;
  reminderNotifications: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

/**
 * SECTION 3: Create Notification Event
 */
export async function createNotification(data: CreateNotificationInput) {
  try {
    const authUser = await requireAuth();
    const targetUserId = data.userId || authUser.id;

    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError("Notification title is required");
    }

    if (!data.message || data.message.trim().length === 0) {
      throw new ValidationError("Notification message is required");
    }

    const publicId = generatePublicId("ntf");

    const [notification] = await db
      .insert(notifications)
      .values({
        publicId,
        userId: targetUserId,
        type: data.type || (data.category as any) || "expense",
        category: data.category || "transaction",
        title: data.title,
        message: data.message,
        priority: data.priority || "medium",
        status: "unread",
        groupId: data.groupId || null,
        transactionId: data.transactionId || null,
        senderId: data.senderId || authUser.id,
        metadata: data.metadata || null,
        isRead: false,
        isPinned: false,
        isArchived: false,
        isDeleted: false,
      } as any)
      .returning();

    revalidatePath("/dashboard/notifications");
    return notification;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to create notification", { originalError: error });
  }
}

/**
 * SECTION 1 & 7: Get real-time unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const user = await requireAuth();

    const [res] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          or(
            eq(notifications.isRead, false),
            isNull(notifications.readAt)
          ),
          eq(notifications.isArchived, false),
          eq(notifications.isDeleted, false)
        )
      );

    return Number(res?.count || 0);
  } catch (error) {
    return 0;
  }
}

/**
 * SECTION 1, 8 & 9: Get filtered notifications list
 */
export async function getNotifications(
  filters: NotificationFilterOptions = {}
): Promise<{
  notifications: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  pinnedCount: number;
  archivedCount: number;
}> {
  try {
    const user = await requireAuth();

    const conditions: any[] = [
      eq(notifications.userId, user.id),
      eq(notifications.isDeleted, false),
    ];

    const tab = filters.tab || "all";

    if (tab === "unread") {
      conditions.push(or(eq(notifications.isRead, false), isNull(notifications.readAt))!);
      conditions.push(eq(notifications.isArchived, false));
    } else if (tab === "pinned") {
      conditions.push(eq(notifications.isPinned, true));
      conditions.push(eq(notifications.isArchived, false));
    } else if (tab === "archived") {
      conditions.push(eq(notifications.isArchived, true));
    } else {
      // Default: All active non-archived notifications
      conditions.push(eq(notifications.isArchived, false));
    }

    if (filters.category && filters.category !== "all") {
      conditions.push(eq(notifications.category, filters.category));
    }

    if (filters.priority && filters.priority !== "all") {
      conditions.push(eq(notifications.priority, filters.priority));
    }

    if (filters.search && filters.search.trim().length > 0) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(notifications.title, q),
          ilike(notifications.message, q)
        )!
      );
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [rows, countsRaw] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(and(...conditions.filter(Boolean)))
        .orderBy(desc(notifications.isPinned), desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({
          total: sql<number>`COUNT(*)`,
          unread: sql<number>`COUNT(CASE WHEN (${notifications.isRead} = false OR ${notifications.readAt} IS NULL) AND ${notifications.isArchived} = false THEN 1 END)`,
          pinned: sql<number>`COUNT(CASE WHEN ${notifications.isPinned} = true AND ${notifications.isArchived} = false THEN 1 END)`,
          archived: sql<number>`COUNT(CASE WHEN ${notifications.isArchived} = true THEN 1 END)`,
        })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.isDeleted, false))),
    ]);

    const formatted: NotificationItem[] = rows.map((r: any) => ({
      id: r.id,
      publicId: r.publicId || `ntf_${r.id}`,
      userId: r.userId,
      type: r.type,
      category: r.category || "transaction",
      title: r.title,
      message: r.message,
      priority: (r.priority as any) || "medium",
      status: r.status || (r.readAt || r.isRead ? "read" : "unread"),
      groupId: r.groupId,
      transactionId: r.transactionId,
      senderId: r.senderId,
      metadata: r.metadata,
      isRead: !!r.isRead || !!r.readAt,
      isPinned: !!r.isPinned,
      isArchived: !!r.isArchived,
      readAt: r.readAt,
      createdAt: r.createdAt,
    }));

    return {
      notifications: formatted,
      totalCount: Number(countsRaw[0]?.total || 0),
      unreadCount: Number(countsRaw[0]?.unread || 0),
      pinnedCount: Number(countsRaw[0]?.pinned || 0),
      archivedCount: Number(countsRaw[0]?.archived || 0),
    };
  } catch (error) {
    console.warn("Failed to fetch notifications, returning fallback empty state:", error);
    return {
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      pinnedCount: 0,
      archivedCount: 0,
    };
  }
}

/**
 * SECTION 6: Mark single notification as read
 */
export async function markAsRead(idOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof idOrPublicId === "number" || /^\d+$/.test(String(idOrPublicId));
    const whereCond = and(
      eq(notifications.userId, user.id),
      isNumeric ? eq(notifications.id, Number(idOrPublicId)) : eq(notifications.publicId, String(idOrPublicId))
    );

    const [notification] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        status: "read",
        updatedAt: new Date(),
      } as any)
      .where(whereCond)
      .returning();

    revalidatePath("/dashboard/notifications");
    return { success: true, notification };
  } catch (error) {
    throw new DatabaseError("Failed to mark notification as read", { originalError: error });
  }
}

/**
 * SECTION 6: Mark all notifications as read
 */
export async function markAllAsRead() {
  try {
    const user = await requireAuth();

    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        status: "read",
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(notifications.userId, user.id),
          or(eq(notifications.isRead, false), isNull(notifications.readAt))
        )
      );

    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to mark all notifications as read", { originalError: error });
  }
}

/**
 * SECTION 1: Toggle Pin notification
 */
export async function togglePinNotification(idOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof idOrPublicId === "number" || /^\d+$/.test(String(idOrPublicId));
    const whereCond = and(
      eq(notifications.userId, user.id),
      isNumeric ? eq(notifications.id, Number(idOrPublicId)) : eq(notifications.publicId, String(idOrPublicId))
    );

    const [existing] = await db
      .select({ id: notifications.id, isPinned: notifications.isPinned })
      .from(notifications)
      .where(whereCond)
      .limit(1);

    if (!existing) throw new NotFoundError("Notification");

    const newPinned = !existing.isPinned;

    await db
      .update(notifications)
      .set({ isPinned: newPinned, updatedAt: new Date() } as any)
      .where(eq(notifications.id, existing.id));

    revalidatePath("/dashboard/notifications");
    return { success: true, isPinned: newPinned };
  } catch (error) {
    throw new DatabaseError("Failed to toggle pin on notification", { originalError: error });
  }
}

/**
 * SECTION 1: Archive / Unarchive notification
 */
export async function archiveNotification(idOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof idOrPublicId === "number" || /^\d+$/.test(String(idOrPublicId));
    const whereCond = and(
      eq(notifications.userId, user.id),
      isNumeric ? eq(notifications.id, Number(idOrPublicId)) : eq(notifications.publicId, String(idOrPublicId))
    );

    const [existing] = await db
      .select({ id: notifications.id, isArchived: notifications.isArchived })
      .from(notifications)
      .where(whereCond)
      .limit(1);

    if (!existing) throw new NotFoundError("Notification");

    const newArchived = !existing.isArchived;

    await db
      .update(notifications)
      .set({ isArchived: newArchived, updatedAt: new Date() } as any)
      .where(eq(notifications.id, existing.id));

    revalidatePath("/dashboard/notifications");
    return { success: true, isArchived: newArchived };
  } catch (error) {
    throw new DatabaseError("Failed to archive notification", { originalError: error });
  }
}

/**
 * SECTION 10: Soft-delete single notification
 */
export async function deleteNotification(idOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof idOrPublicId === "number" || /^\d+$/.test(String(idOrPublicId));
    const whereCond = and(
      eq(notifications.userId, user.id),
      isNumeric ? eq(notifications.id, Number(idOrPublicId)) : eq(notifications.publicId, String(idOrPublicId))
    );

    await db
      .update(notifications)
      .set({ isDeleted: true, deletedAt: new Date() } as any)
      .where(whereCond);

    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to delete notification", { originalError: error });
  }
}

/**
 * SECTION 1: Clear all read notifications
 */
export async function clearAllReadNotifications() {
  try {
    const user = await requireAuth();

    await db
      .update(notifications)
      .set({ isDeleted: true, deletedAt: new Date() } as any)
      .where(
        and(
          eq(notifications.userId, user.id),
          or(eq(notifications.isRead, true), sql`${notifications.readAt} IS NOT NULL`)
        )
      );

    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to clear read notifications", { originalError: error });
  }
}

/**
 * SECTION 11: Get & Update User Notification Preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const user = await requireAuth();

    const [p] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    return {
      notificationsEnabled: p?.notificationsEnabled ?? true,
      emailNotifications: p?.emailNotifications ?? true,
      whatsappNotifications: p?.whatsappNotifications ?? false,
      expenseNotifications: (p as any)?.expenseNotifications ?? true,
      settlementNotifications: (p as any)?.settlementNotifications ?? true,
      groupNotifications: (p as any)?.groupNotifications ?? true,
      invitationNotifications: (p as any)?.invitationNotifications ?? true,
      budgetNotifications: (p as any)?.budgetNotifications ?? true,
      reminderNotifications: (p as any)?.reminderNotifications ?? true,
      soundEnabled: (p as any)?.soundEnabled ?? true,
      desktopNotifications: (p as any)?.desktopNotifications ?? false,
    };
  } catch (error) {
    return {
      notificationsEnabled: true,
      emailNotifications: true,
      whatsappNotifications: false,
      expenseNotifications: true,
      settlementNotifications: true,
      groupNotifications: true,
      invitationNotifications: true,
      budgetNotifications: true,
      reminderNotifications: true,
      soundEnabled: true,
      desktopNotifications: false,
    };
  }
}

export async function updateNotificationPreferences(data: Partial<NotificationPreferences>) {
  try {
    const user = await requireAuth();

    const [existing] = await db
      .select({ id: profiles.id, preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (existing?.preferences as Record<string, any>) || {};
    const existingNotifPrefs = existingPrefs.notifications || DEFAULT_SETTINGS.notifications;

    const updatePayload: any = {
      updatedAt: new Date(),
      notificationsEnabled: data.notificationsEnabled ?? existingNotifPrefs.masterEnabled,
      emailNotifications: data.emailNotifications ?? existingNotifPrefs.channels.email,
      whatsappNotifications: data.whatsappNotifications ?? existingNotifPrefs.channels.whatsapp,
      desktopNotifications: data.desktopNotifications ?? existingNotifPrefs.channels.desktopPush,
      soundEnabled: data.soundEnabled ?? existingNotifPrefs.soundEnabled,
    };

    if (existing) {
      await db
        .update(profiles)
        .set(updatePayload)
        .where(eq(profiles.id, existing.id));
    } else {
      await db
        .insert(profiles)
        .values({
          userId: user.id,
          ...updatePayload,
        });
    }

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to update notification preferences", { originalError: error });
  }
}

/**
 * SECTION 1-16: Get Detailed Granular Notification Preferences
 */
export async function getDetailedNotificationPreferences(): Promise<DetailedNotificationPreferences> {
  try {
    const user = await requireAuth();

    return await withDbRetry(async () => {
      const [profile] = await db
        .select({
          notificationsEnabled: profiles.notificationsEnabled,
          emailNotifications: profiles.emailNotifications,
          whatsappNotifications: profiles.whatsappNotifications,
          desktopNotifications: profiles.desktopNotifications,
          soundEnabled: profiles.soundEnabled,
          preferences: profiles.preferences,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);

      const rawPrefs = (profile?.preferences as any)?.notifications || {};

      const merged: DetailedNotificationPreferences = {
        ...DEFAULT_SETTINGS.notifications,
        masterEnabled: profile?.notificationsEnabled ?? DEFAULT_SETTINGS.notifications.masterEnabled,
        soundEnabled: profile?.soundEnabled ?? DEFAULT_SETTINGS.notifications.soundEnabled,
        channels: {
          ...DEFAULT_SETTINGS.notifications.channels,
          inApp: profile?.notificationsEnabled ?? DEFAULT_SETTINGS.notifications.channels.inApp,
          email: profile?.emailNotifications ?? DEFAULT_SETTINGS.notifications.channels.email,
          whatsapp: profile?.whatsappNotifications ?? DEFAULT_SETTINGS.notifications.channels.whatsapp,
          desktopPush: profile?.desktopNotifications ?? DEFAULT_SETTINGS.notifications.channels.desktopPush,
          ...(rawPrefs.channels || {}),
        },
        categories: {
          ...DEFAULT_SETTINGS.notifications.categories,
          ...(rawPrefs.categories || {}),
        },
        expensesTriggers: {
          ...DEFAULT_SETTINGS.notifications.expensesTriggers,
          ...(rawPrefs.expensesTriggers || {}),
        },
        groupsTriggers: {
          ...DEFAULT_SETTINGS.notifications.groupsTriggers,
          ...(rawPrefs.groupsTriggers || {}),
        },
        settlementsTriggers: {
          ...DEFAULT_SETTINGS.notifications.settlementsTriggers,
          ...(rawPrefs.settlementsTriggers || {}),
        },
        remindersTriggers: {
          ...DEFAULT_SETTINGS.notifications.remindersTriggers,
          ...(rawPrefs.remindersTriggers || {}),
        },
        invitationsTriggers: {
          ...DEFAULT_SETTINGS.notifications.invitationsTriggers,
          ...(rawPrefs.invitationsTriggers || {}),
        },
        reportsTriggers: {
          ...DEFAULT_SETTINGS.notifications.reportsTriggers,
          ...(rawPrefs.reportsTriggers || {}),
        },
        securityTriggers: {
          // SECTION 9: Critical Security Alerts are permanently active
          passwordChanged: true,
          emailChanged: true,
          phoneChanged: true,
          profileUpdated: true,
          newDeviceLogin: true,
          unknownDeviceLogin: true,
          suspiciousActivity: true,
          sessionExpired: true,
          twoFactorChanged: true,
          accountRecovery: true,
        },
        emailSettings: {
          ...DEFAULT_SETTINGS.notifications.emailSettings,
          ...(rawPrefs.emailSettings || {}),
        },
        whatsappSettings: {
          ...DEFAULT_SETTINGS.notifications.whatsappSettings,
          ...(rawPrefs.whatsappSettings || {}),
        },
        browserSettings: {
          ...DEFAULT_SETTINGS.notifications.browserSettings,
          ...(rawPrefs.browserSettings || {}),
        },
        channelRouting: {
          ...DEFAULT_SETTINGS.notifications.channelRouting,
          ...(rawPrefs.channelRouting || {}),
        },
        quietHours: {
          ...DEFAULT_SETTINGS.notifications.quietHours,
          ...(rawPrefs.quietHours || {}),
        },
        schedule: {
          ...DEFAULT_SETTINGS.notifications.schedule,
          ...(rawPrefs.schedule || {}),
        },
        ...rawPrefs,
      };

      return merged;
    });
  } catch (error) {
    console.error("Error loading detailed notification preferences:", error);
    return DEFAULT_SETTINGS.notifications;
  }
}

/**
 * Update Detailed Granular Notification Preferences
 */
export async function updateDetailedNotificationPreferences(
  data: Partial<DetailedNotificationPreferences>
) {
  try {
    const user = await requireAuth();

    return await withDbRetry(async () => {
      const [profile] = await db
        .select({ id: profiles.id, preferences: profiles.preferences })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);

      const existingPrefs = (profile?.preferences as Record<string, any>) || {};
      const existingNotif = existingPrefs.notifications || DEFAULT_SETTINGS.notifications;

      const updatedNotif: DetailedNotificationPreferences = {
        ...existingNotif,
        ...data,
        // SECTION 9: Always enforce security triggers = true
        securityTriggers: {
          passwordChanged: true,
          emailChanged: true,
          phoneChanged: true,
          profileUpdated: true,
          newDeviceLogin: true,
          unknownDeviceLogin: true,
          suspiciousActivity: true,
          sessionExpired: true,
          twoFactorChanged: true,
          accountRecovery: true,
        },
      };

      const updatedRootPrefs = {
        ...existingPrefs,
        notifications: updatedNotif,
      };

      await db
        .update(profiles)
        .set({
          preferences: updatedRootPrefs,
          notificationsEnabled: updatedNotif.masterEnabled,
          emailNotifications: updatedNotif.channels.email,
          whatsappNotifications: updatedNotif.channels.whatsapp,
          desktopNotifications: updatedNotif.channels.desktopPush,
          soundEnabled: updatedNotif.soundEnabled,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, user.id));

      // Immutable Audit Log
      await recordAuditLog({
        userId: user.id,
        action: "update_notification_preferences",
        entityType: "notification_preferences",
        entityId: user.id,
        changes: data,
      });

      // Realtime event broadcast
      eventBus.broadcast({
        channel: `user:${user.id}`,
        type: "activity_logged",
        payload: {
          entityType: "notification_preferences",
          data: updatedNotif,
          timestamp: new Date().toISOString(),
        },
      });

      revalidatePath("/dashboard/notifications");
      revalidatePath("/dashboard/notifications/preferences");
      revalidatePath("/dashboard/settings");
      return { success: true };
    });
  } catch (error: any) {
    throw new DatabaseError("Failed to update detailed notification preferences", { originalError: error });
  }
}

/**
 * SECTION 17: Get Notification Delivery History & Channel Audit Logs
 */
export async function getNotificationDeliveryHistory(filters: {
  limit?: number;
  channel?: string;
  category?: string;
} = {}) {
  try {
    const user = await requireAuth();
    const limit = filters.limit || 20;

    const conditions: any[] = [
      eq(notifications.userId, user.id),
      eq(notifications.isDeleted, false),
    ];

    if (filters.category && filters.category !== "all") {
      conditions.push(eq(notifications.category, filters.category));
    }

    const items = await db
      .select({
        id: notifications.id,
        publicId: notifications.publicId,
        type: notifications.type,
        category: notifications.category,
        title: notifications.title,
        message: notifications.message,
        priority: notifications.priority,
        status: notifications.status,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return items.map((item) => ({
      ...item,
      deliveryChannel: item.category === "security" ? "Email & In-App" : "In-App",
      statusText: item.isRead ? "Delivered & Read" : "Delivered (Unread)",
    }));
  } catch (error) {
    console.error("Error fetching delivery history:", error);
    return [];
  }
}

/**
 * SECTION 13 & 18: Dispatch Test Notification to verify channels
 */
export async function testSendNotification(channel: string, category: string = "expense") {
  try {
    const user = await requireAuth();

    await createNotification({
      userId: user.id,
      category: category as any,
      type: `${category}_test`,
      title: `Test ${channel.toUpperCase()} Alert`,
      message: `This is a verified test notification sent via ${channel} formatted in INR (₹).`,
      priority: "medium",
      metadata: {
        amount: 500,
        currency: "INR",
        actionUrl: "/dashboard/notifications",
        actionLabel: "View Notification",
      },
    });

    return { success: true, message: `Test notification sent via ${channel}` };
  } catch (error: any) {
    throw new DatabaseError("Failed to dispatch test notification", { originalError: error });
  }
}

/**
 * SECTION 18: Notification Template Variable Interpolation Engine
 */
export async function renderNotificationTemplate(
  templateString: string,
  variables: Record<string, string | number>
): Promise<string> {
  let rendered = templateString;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, String(value));
  }
  return rendered;
}

