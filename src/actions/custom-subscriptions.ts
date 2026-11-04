"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createTransaction } from "@/actions/transactions";
import { getDetectedSubscriptions } from "@/actions/ai-assistant";
import {
  UserSubscription,
  advanceDateByBillingCycle,
  computeSubscriptionAmounts,
} from "@/lib/subscriptions/subscription-utils";

/**
 * Fetch all subscriptions for the authenticated user:
 * 1. Custom subscriptions stored in user preferences
 * 2. Algorithmic subscriptions detected strictly from validated transaction records
 * ZERO mock or sample rows returned.
 */
export async function getUserSubscriptions(): Promise<{
  customSubscriptions: UserSubscription[];
  detectedSubscriptions: UserSubscription[];
}> {
  try {
    const user = await requireAuth();

    // 1. Fetch user-defined subscriptions from profile preferences
    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const savedSubs = (userProfile?.preferences as any)?.customSubscriptions as
      | UserSubscription[]
      | undefined;

    const customSubs: UserSubscription[] = Array.isArray(savedSubs) ? savedSubs : [];

    // 2. Detect recurring subscriptions strictly from actual user transactions
    let detectedSubs: UserSubscription[] = [];
    try {
      const rawDetected = await getDetectedSubscriptions();
      if (rawDetected && rawDetected.length > 0) {
        detectedSubs = rawDetected
          .filter((d) => !d.isCurated) // Strictly exclude any curated demo data
          .map((d) => ({
            id: d.id,
            name: d.name,
            merchant: d.merchant,
            category: d.category,
            amount: d.latestAmount,
            billingCycle: d.billingCycle,
            monthlyAmount: d.monthlyAmount,
            annualizedCost: d.annualizedCost,
            nextBillingDate: d.nextEstimatedBillingDate,
            lastPaymentDate: d.lastPaymentDate,
            paymentMethod: d.paymentMethod,
            autoRenewal: true,
            reminderDays: 3,
            status: (d.status === "Due Soon" ? "Due Today" : d.status) as any,
            isCustom: false,
            confidence: d.confidence,
            savingRecommendation: d.savingRecommendation,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
      }
    } catch (e) {
      console.warn("Could not compute detected subscriptions from ledger:", e);
    }

    return {
      customSubscriptions: customSubs,
      detectedSubscriptions: detectedSubs,
    };
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    return { customSubscriptions: [], detectedSubscriptions: [] };
  }
}

/**
 * Create or update a custom subscription in profiles.preferences.customSubscriptions
 */
export async function saveCustomSubscription(
  subData: Partial<UserSubscription> & { name: string; amount: number; nextBillingDate: string }
): Promise<{ success: boolean; subscription?: UserSubscription; error?: string }> {
  try {
    const user = await requireAuth();

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (userProfile?.preferences as Record<string, any>) || {};
    const currentSubs: UserSubscription[] = Array.isArray(existingPrefs.customSubscriptions)
      ? existingPrefs.customSubscriptions
      : [];

    const billingCycle = subData.billingCycle || "monthly";
    const { monthlyAmount, annualizedCost } = computeSubscriptionAmounts(
      subData.amount,
      billingCycle
    );

    const nowIso = new Date().toISOString();
    let savedSub: UserSubscription;

    if (subData.id && currentSubs.some((s) => s.id === subData.id)) {
      // Update existing
      savedSub = {
        ...currentSubs.find((s) => s.id === subData.id)!,
        name: subData.name.trim(),
        merchant: subData.merchant?.trim() || subData.name.trim(),
        category: subData.category || "Entertainment",
        amount: Math.round(subData.amount),
        billingCycle,
        monthlyAmount,
        annualizedCost,
        startDate: subData.startDate,
        nextBillingDate: subData.nextBillingDate,
        lastPaymentDate: subData.lastPaymentDate,
        paymentMethod: subData.paymentMethod || "UPI",
        autoRenewal: subData.autoRenewal ?? true,
        reminderDays: subData.reminderDays ?? 3,
        status: subData.status || "Active",
        description: subData.description?.trim(),
        isCustom: true,
        updatedAt: nowIso,
      };

      const updatedSubs = currentSubs.map((s) => (s.id === subData.id ? savedSub : s));

      await db
        .update(profiles)
        .set({
          preferences: {
            ...existingPrefs,
            customSubscriptions: updatedSubs,
          },
        })
        .where(eq(profiles.userId, user.id));
    } else {
      // Create new
      savedSub = {
        id: `custom-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: subData.name.trim(),
        merchant: subData.merchant?.trim() || subData.name.trim(),
        category: subData.category || "Entertainment",
        amount: Math.round(subData.amount),
        billingCycle,
        monthlyAmount,
        annualizedCost,
        startDate: subData.startDate || nowIso.split("T")[0],
        nextBillingDate: subData.nextBillingDate,
        lastPaymentDate: subData.lastPaymentDate,
        paymentMethod: subData.paymentMethod || "UPI",
        autoRenewal: subData.autoRenewal ?? true,
        reminderDays: subData.reminderDays ?? 3,
        status: subData.status || "Active",
        description: subData.description?.trim(),
        isCustom: true,
        confidence: 100,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updatedSubs = [savedSub, ...currentSubs];

      await db
        .update(profiles)
        .set({
          preferences: {
            ...existingPrefs,
            customSubscriptions: updatedSubs,
          },
        })
        .where(eq(profiles.userId, user.id));
    }

    try {
      revalidatePath("/dashboard/ai");
    } catch (_) {}

    return { success: true, subscription: savedSub };
  } catch (error: any) {
    console.error("Error saving subscription:", error);
    return { success: false, error: error.message || "Failed to save subscription" };
  }
}

/**
 * Delete a custom subscription by ID
 */
export async function deleteCustomSubscription(
  subId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (userProfile?.preferences as Record<string, any>) || {};
    const currentSubs: UserSubscription[] = Array.isArray(existingPrefs.customSubscriptions)
      ? existingPrefs.customSubscriptions
      : [];

    const updatedSubs = currentSubs.filter((s) => s.id !== subId);

    await db
      .update(profiles)
      .set({
        preferences: {
          ...existingPrefs,
          customSubscriptions: updatedSubs,
        },
      })
      .where(eq(profiles.userId, user.id));

    try {
      revalidatePath("/dashboard/ai");
    } catch (_) {}

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting subscription:", error);
    return { success: false, error: error.message || "Failed to delete subscription" };
  }
}

/**
 * Record a transaction for a subscription renewal:
 * 1. Creates verified transaction in transactions table
 * 2. Updates subscription status to "Paid", advances nextBillingDate, sets lastPaymentDate
 */
export async function recordSubscriptionPayment(
  subId: string,
  txnData: {
    title: string;
    description: string;
    amount: number;
    categoryName?: string;
    paymentMethod?: string;
    date?: string;
    notes?: string;
  }
): Promise<{ success: boolean; updatedSubscription?: UserSubscription; error?: string }> {
  try {
    const user = await requireAuth();

    // 1. Create the ledger transaction
    await createTransaction({
      title: txnData.title,
      description: txnData.description || `Subscription renewal: ${txnData.title}`,
      amount: txnData.amount,
      type: "paid",
      categoryName: txnData.categoryName || "Entertainment",
      paymentMethod: txnData.paymentMethod || "UPI",
      date: txnData.date ? new Date(txnData.date) : new Date(),
      notes: txnData.notes,
    });

    // 2. Fetch existing profile preferences to update the subscription
    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (userProfile?.preferences as Record<string, any>) || {};
    const currentSubs: UserSubscription[] = Array.isArray(existingPrefs.customSubscriptions)
      ? existingPrefs.customSubscriptions
      : [];

    const targetSub = currentSubs.find((s) => s.id === subId);
    let updatedSub: UserSubscription | undefined;

    if (targetSub) {
      const todayStr = txnData.date || new Date().toISOString().split("T")[0];
      const nextDate = advanceDateByBillingCycle(
        targetSub.nextBillingDate || todayStr,
        targetSub.billingCycle
      );

      updatedSub = {
        ...targetSub,
        lastPaymentDate: todayStr,
        nextBillingDate: nextDate,
        status: "Paid",
        updatedAt: new Date().toISOString(),
      };

      const updatedSubs = currentSubs.map((s) => (s.id === subId ? updatedSub! : s));

      await db
        .update(profiles)
        .set({
          preferences: {
            ...existingPrefs,
            customSubscriptions: updatedSubs,
          },
        })
        .where(eq(profiles.userId, user.id));
    }

    try {
      revalidatePath("/dashboard/ai");
      revalidatePath("/dashboard/transactions");
    } catch (_) {}

    return { success: true, updatedSubscription: updatedSub };
  } catch (error: any) {
    console.error("Error recording subscription payment:", error);
    return { success: false, error: error.message || "Failed to record payment" };
  }
}
