"use server";

import { db, withDbRetry } from "@/lib/db";
import { users, profiles } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, DatabaseError } from "@/lib/errors";
import { recordAuditLog } from "@/lib/audit";
import { eventBus } from "@/lib/realtime/event-bus";

import {
  GeneralPreferences,
  AppearancePreferences,
  RegionalPreferences,
  DashboardPreferences,
  GroupPreferences,
  TransactionPreferences,
  ReportPreferences,
  NotificationPreferences,
  AccessibilityPreferences,
  PrivacyPreferences,
  DataBackupPreferences,
  ConnectedServicesStatus,
  AllSettingsState,
  DEFAULT_SETTINGS,
} from "@/lib/types/settings";

export type {
  GeneralPreferences,
  AppearancePreferences,
  RegionalPreferences,
  DashboardPreferences,
  GroupPreferences,
  TransactionPreferences,
  ReportPreferences,
  NotificationPreferences,
  AccessibilityPreferences,
  PrivacyPreferences,
  DataBackupPreferences,
  ConnectedServicesStatus,
  AllSettingsState,
};

// ==========================================
// SERVER ACTIONS
// ==========================================

/**
 * SECTION 1: Get all unified settings merged with defaults
 */
export async function getAllSettings(): Promise<AllSettingsState> {
  try {
    const user = await requireAuth();

    return await withDbRetry(async () => {
      const [userRow] = await db
        .select({
          name: users.name,
          theme: users.theme,
          defaultCurrency: users.defaultCurrency,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const [profileRow] = await db
        .select({
          timezone: profiles.timezone,
          language: profiles.language,
          country: profiles.country,
          state: profiles.state,
          city: profiles.city,
          notificationsEnabled: profiles.notificationsEnabled,
          emailNotifications: profiles.emailNotifications,
          whatsappNotifications: profiles.whatsappNotifications,
          autoSettlement: profiles.autoSettlement,
          privacySettings: profiles.privacySettings,
          preferences: profiles.preferences,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);

      const rawPrefs = (profileRow?.preferences as Partial<AllSettingsState>) || {};
      const privacy = (profileRow?.privacySettings as any) || {};

      const merged: AllSettingsState = {
        general: {
          ...DEFAULT_SETTINGS.general,
          displayName: userRow?.name || DEFAULT_SETTINGS.general.displayName,
          ...(rawPrefs.general || {}),
        },
        appearance: {
          ...DEFAULT_SETTINGS.appearance,
          theme: (userRow?.theme as any) || DEFAULT_SETTINGS.appearance.theme,
          ...(rawPrefs.appearance || {}),
        },
        regional: {
          ...DEFAULT_SETTINGS.regional,
          currency: userRow?.defaultCurrency || DEFAULT_SETTINGS.regional.currency,
          language: profileRow?.language || DEFAULT_SETTINGS.regional.language,
          timezone: profileRow?.timezone || DEFAULT_SETTINGS.regional.timezone,
          country: profileRow?.country || DEFAULT_SETTINGS.regional.country,
          state: profileRow?.state || DEFAULT_SETTINGS.regional.state,
          city: profileRow?.city || DEFAULT_SETTINGS.regional.city,
          ...(rawPrefs.regional || {}),
        },
        dashboard: {
          ...DEFAULT_SETTINGS.dashboard,
          ...(rawPrefs.dashboard || {}),
        },
        groups: {
          ...DEFAULT_SETTINGS.groups,
          ...(rawPrefs.groups || {}),
        },
        transactions: {
          ...DEFAULT_SETTINGS.transactions,
          ...(rawPrefs.transactions || {}),
        },
        reports: {
          ...DEFAULT_SETTINGS.reports,
          ...(rawPrefs.reports || {}),
        },
        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          channels: {
            ...DEFAULT_SETTINGS.notifications.channels,
            inApp: profileRow?.notificationsEnabled ?? DEFAULT_SETTINGS.notifications.channels.inApp,
            email: profileRow?.emailNotifications ?? DEFAULT_SETTINGS.notifications.channels.email,
            whatsapp: profileRow?.whatsappNotifications ?? DEFAULT_SETTINGS.notifications.channels.whatsapp,
            ...(rawPrefs.notifications?.channels || {}),
          },
          categories: {
            ...DEFAULT_SETTINGS.notifications.categories,
            ...(rawPrefs.notifications?.categories || {}),
          },
          ...(rawPrefs.notifications || {}),
        },
        accessibility: {
          ...DEFAULT_SETTINGS.accessibility,
          ...(rawPrefs.accessibility || {}),
        },
        privacy: {
          ...DEFAULT_SETTINGS.privacy,
          ...privacy,
          ...(rawPrefs.privacy || {}),
        },
        dataBackup: {
          ...DEFAULT_SETTINGS.dataBackup,
          ...(rawPrefs.dataBackup || {}),
        },
        connectedServices: {
          ...DEFAULT_SETTINGS.connectedServices,
          ...(rawPrefs.connectedServices || {}),
        },
      };

      return merged;
    });
  } catch (error) {
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Helper to update typed nested preference
 */
async function persistPreferencePatch(
  userId: number,
  patch: Partial<AllSettingsState>,
  auditActionName: string
) {
  return await withDbRetry(async () => {
    const [profile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const existingPrefs = (profile?.preferences as Record<string, any>) || {};
    const updatedPrefs = {
      ...existingPrefs,
      ...patch,
    };

    await db
      .update(profiles)
      .set({
        preferences: updatedPrefs,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    // Audit log
    await recordAuditLog({
      userId,
      action: auditActionName,
      entityType: "settings",
      entityId: userId,
      changes: patch,
    });

    // Broadcast realtime event
    eventBus.broadcast({
      channel: `user:${userId}`,
      type: "activity_logged",
      payload: {
        entityType: "settings",
        data: patch,
        timestamp: new Date().toISOString(),
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  });
}

/**
 * SECTION 2: General Settings
 */
export async function updateGeneralSettings(data: Partial<GeneralPreferences>) {
  try {
    const user = await requireAuth();

    if (data.displayName && data.displayName.trim().length > 0) {
      await db
        .update(users)
        .set({ name: data.displayName.trim() })
        .where(eq(users.id, user.id));
    }

    return await persistPreferencePatch(user.id, { general: data as any }, "update_general_settings");
  } catch (error: any) {
    throw new DatabaseError("Failed to update general settings", { originalError: error });
  }
}

/**
 * SECTION 3: Appearance Preferences
 */
export async function updateAppearancePreferences(data: Partial<AppearancePreferences>) {
  try {
    const user = await requireAuth();

    if (data.theme) {
      await db
        .update(users)
        .set({ theme: data.theme })
        .where(eq(users.id, user.id));
    }

    return await persistPreferencePatch(user.id, { appearance: data as any }, "update_appearance_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update appearance preferences", { originalError: error });
  }
}

/**
 * SECTION 4: Regional Preferences (Strict INR ₹ Standard)
 */
export async function updateRegionalPreferences(data: Partial<RegionalPreferences>) {
  try {
    const user = await requireAuth();

    if (data.currency) {
      await db
        .update(users)
        .set({ defaultCurrency: data.currency })
        .where(eq(users.id, user.id));
    }

    await db
      .update(profiles)
      .set({
        language: data.language || undefined,
        timezone: data.timezone || undefined,
        country: data.country || undefined,
        state: data.state || undefined,
        city: data.city || undefined,
      })
      .where(eq(profiles.userId, user.id));

    return await persistPreferencePatch(user.id, { regional: data as any }, "update_regional_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update regional preferences", { originalError: error });
  }
}

/**
 * SECTION 5: Dashboard Preferences
 */
export async function updateDashboardPreferences(data: Partial<DashboardPreferences>) {
  try {
    const user = await requireAuth();
    return await persistPreferencePatch(user.id, { dashboard: data as any }, "update_dashboard_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update dashboard preferences", { originalError: error });
  }
}

/**
 * SECTION 6: Group Preferences
 */
export async function updateGroupPreferences(data: Partial<GroupPreferences>) {
  try {
    const user = await requireAuth();
    return await persistPreferencePatch(user.id, { groups: data as any }, "update_group_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update group preferences", { originalError: error });
  }
}

/**
 * SECTION 7: Transaction Preferences
 */
export async function updateTransactionPreferences(data: Partial<TransactionPreferences>) {
  try {
    const user = await requireAuth();
    return await persistPreferencePatch(user.id, { transactions: data as any }, "update_transaction_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update transaction preferences", { originalError: error });
  }
}

/**
 * SECTION 8: Report Preferences
 */
export async function updateReportPreferences(data: Partial<ReportPreferences>) {
  try {
    const user = await requireAuth();
    return await persistPreferencePatch(user.id, { reports: data as any }, "update_report_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update report preferences", { originalError: error });
  }
}

/**
 * SECTION 9: Notification Preferences
 */
export async function updateNotificationPreferences(data: Partial<NotificationPreferences>) {
  try {
    const user = await requireAuth();

    if (data.channels) {
      await db
        .update(profiles)
        .set({
          notificationsEnabled: data.channels.inApp ?? true,
          emailNotifications: data.channels.email ?? true,
          whatsappNotifications: data.channels.whatsapp ?? false,
          desktopNotifications: data.channels.desktopPush ?? false,
        })
        .where(eq(profiles.userId, user.id));
    }

    return await persistPreferencePatch(user.id, { notifications: data as any }, "update_notification_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update notification preferences", { originalError: error });
  }
}

/**
 * SECTION 10: Accessibility Preferences
 */
export async function updateAccessibilityPreferences(data: Partial<AccessibilityPreferences>) {
  try {
    const user = await requireAuth();
    return await persistPreferencePatch(user.id, { accessibility: data as any }, "update_accessibility_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update accessibility preferences", { originalError: error });
  }
}

/**
 * SECTION 11: Privacy Preferences
 */
export async function updatePrivacyPreferences(data: Partial<PrivacyPreferences>) {
  try {
    const user = await requireAuth();

    await db
      .update(profiles)
      .set({
        privacySettings: data as any,
      })
      .where(eq(profiles.userId, user.id));

    return await persistPreferencePatch(user.id, { privacy: data as any }, "update_privacy_preferences");
  } catch (error: any) {
    throw new DatabaseError("Failed to update privacy preferences", { originalError: error });
  }
}

/**
 * SECTION 12: Reset All Settings to Factory Defaults
 */
export async function resetSettingsToDefault() {
  try {
    const user = await requireAuth();

    await withDbRetry(async () => {
      await db
        .update(users)
        .set({
          defaultCurrency: "INR",
          theme: "system",
        })
        .where(eq(users.id, user.id));

      await db
        .update(profiles)
        .set({
          preferences: DEFAULT_SETTINGS as any,
          timezone: "Asia/Kolkata",
          language: "en",
          notificationsEnabled: true,
          emailNotifications: true,
          whatsappNotifications: false,
          autoSettlement: false,
          privacySettings: DEFAULT_SETTINGS.privacy as any,
        })
        .where(eq(profiles.userId, user.id));

      await recordAuditLog({
        userId: user.id,
        action: "reset_all_settings_to_default",
        entityType: "settings",
        entityId: user.id,
        changes: { resetTo: "factory_defaults" },
      });

      eventBus.broadcast({
        channel: `user:${user.id}`,
        type: "activity_logged",
        payload: {
          entityType: "settings",
          data: DEFAULT_SETTINGS,
          timestamp: new Date().toISOString(),
        },
      });
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    throw new DatabaseError("Failed to reset settings", { originalError: error });
  }
}

// Backwards compatibility helpers
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const user = await requireAuth();

  if (!data.currentPassword || data.currentPassword.length === 0) {
    throw new ValidationError("Current password is required");
  }

  if (!data.newPassword || data.newPassword.length < 8) {
    throw new ValidationError("New password must be at least 8 characters");
  }

  if (data.newPassword !== data.confirmPassword) {
    throw new ValidationError("Passwords do not match");
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateProfileSettings(data: { name?: string; phone?: string; defaultCurrency?: string }) {
  const user = await requireAuth();
  if (data.name) {
    await db.update(users).set({ name: data.name, defaultCurrency: data.defaultCurrency || "INR" }).where(eq(users.id, user.id));
  }
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateNotificationSettings(data: { notificationsEnabled?: boolean; emailNotifications?: boolean; whatsappNotifications?: boolean }) {
  return updateNotificationPreferences({ channels: { inApp: data.notificationsEnabled ?? true, email: data.emailNotifications ?? true, whatsapp: data.whatsappNotifications ?? false, browser: false, desktopPush: false } });
}

export async function updateAppearanceSettings(data: { theme?: string; language?: string; timezone?: string }) {
  return updateAppearancePreferences({ theme: (data.theme as any) || "system" });
}

export async function updateSettlementSettings(data: { autoSettlement?: boolean }) {
  const user = await requireAuth();
  await db.update(profiles).set({ autoSettlement: data.autoSettlement ?? false }).where(eq(profiles.userId, user.id));
  revalidatePath("/dashboard/settings");
  return { success: true };
}

