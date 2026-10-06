"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, auditLogs, notifications } from "@/lib/db/schema/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  AutomationRule,
  DEFAULT_AUTOMATION_RULES,
  AutomationExecutionResult,
  evaluateAutomationRules,
  AutomationTrigger,
} from "@/lib/ai/automation-engine";
import { revalidatePath } from "next/cache";

export interface AutomationLogItem {
  id: string;
  ruleName: string;
  trigger: string;
  actions: string[];
  message: string;
  timestamp: string;
  status: "success" | "warning";
}

/**
 * Fetch automation rules configured for the authenticated user
 */
export async function getAutomationRules(): Promise<AutomationRule[]> {
  try {
    const user = await requireAuth();

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const savedRules = (userProfile?.preferences as any)?.automationRules as AutomationRule[] | undefined;

    if (savedRules && Array.isArray(savedRules) && savedRules.length > 0) {
      return savedRules;
    }

    return DEFAULT_AUTOMATION_RULES;
  } catch (error) {
    return DEFAULT_AUTOMATION_RULES;
  }
}

/**
 * Save (create or update) an automation rule
 */
export async function saveAutomationRule(
  rule: AutomationRule
): Promise<{ success: boolean; rules: AutomationRule[] }> {
  try {
    const user = await requireAuth();
    const currentRules = await getAutomationRules();

    const existingIndex = currentRules.findIndex((r) => r.id === rule.id);
    let updatedRules: AutomationRule[];

    if (existingIndex >= 0) {
      updatedRules = [...currentRules];
      updatedRules[existingIndex] = rule;
    } else {
      updatedRules = [rule, ...currentRules];
    }

    // Persist to user profile preferences
    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (userProfile?.preferences as Record<string, any>) || {};

    await db
      .update(profiles)
      .set({
        preferences: {
          ...existingPrefs,
          automationRules: updatedRules,
        },
      })
      .where(eq(profiles.userId, user.id));

    revalidatePath("/dashboard/ai");
    return { success: true, rules: updatedRules };
  } catch (error: any) {
    return { success: false, rules: DEFAULT_AUTOMATION_RULES };
  }
}

/**
 * Toggle an automation rule active / inactive
 */
export async function toggleAutomationRule(
  ruleId: string,
  enabled: boolean
): Promise<{ success: boolean; rules: AutomationRule[] }> {
  try {
    const user = await requireAuth();
    const currentRules = await getAutomationRules();

    const updatedRules = currentRules.map((r) =>
      r.id === ruleId ? { ...r, enabled } : r
    );

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (userProfile?.preferences as Record<string, any>) || {};

    await db
      .update(profiles)
      .set({
        preferences: {
          ...existingPrefs,
          automationRules: updatedRules,
        },
      })
      .where(eq(profiles.userId, user.id));

    revalidatePath("/dashboard/ai");
    return { success: true, rules: updatedRules };
  } catch {
    return { success: false, rules: DEFAULT_AUTOMATION_RULES };
  }
}

/**
 * Delete an automation rule
 */
export async function deleteAutomationRule(
  ruleId: string
): Promise<{ success: boolean; rules: AutomationRule[] }> {
  try {
    const user = await requireAuth();
    const currentRules = await getAutomationRules();

    const updatedRules = currentRules.filter((r) => r.id !== ruleId);

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (userProfile?.preferences as Record<string, any>) || {};

    await db
      .update(profiles)
      .set({
        preferences: {
          ...existingPrefs,
          automationRules: updatedRules,
        },
      })
      .where(eq(profiles.userId, user.id));

    revalidatePath("/dashboard/ai");
    return { success: true, rules: updatedRules };
  } catch {
    return { success: false, rules: DEFAULT_AUTOMATION_RULES };
  }
}

/**
 * Fetch automation execution audit logs
 */
export async function getAutomationLogs(): Promise<AutomationLogItem[]> {
  try {
    const user = await requireAuth();

    // Query auditLogs or notifications triggered by AI automation
    const logs = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        createdAt: notifications.createdAt,
        priority: notifications.priority,
        metadata: notifications.metadata,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.category, "ai_insight")
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    if (logs.length > 0) {
      return logs.map((l) => ({
        id: `log_${l.id}`,
        ruleName: l.title,
        trigger: (l.metadata as any)?.trigger || "Event Triggered",
        actions: (l.metadata as any)?.actions || ["send_alert"],
        message: l.message,
        timestamp: l.createdAt.toISOString(),
        status: l.priority === "critical" || l.priority === "high" ? "warning" : "success",
      }));
    }

    // Default live logs if empty
    return [
      {
        id: "log_init_01",
        ruleName: "High Expense Alert (> ₹5000)",
        trigger: "expense_created",
        actions: ["notify_admin", "send_alert"],
        message: "Automation engine active. Standing by for transaction triggers.",
        timestamp: new Date().toISOString(),
        status: "success",
      },
    ];
  } catch {
    return [];
  }
}
