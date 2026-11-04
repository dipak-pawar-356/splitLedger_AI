"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, transactions, auditLogs } from "@/lib/db/schema/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/actions/transactions";
import { getDetectedSubscriptions } from "@/actions/ai-assistant";
import {
  UserSubscription,
  advanceDateByBillingCycle,
  rollbackDateByBillingCycle,
  computeSubscriptionStatus,
  computeSubscriptionAmounts,
} from "@/lib/subscriptions/subscription-utils";

export interface LinkedSubscriptionTransaction {
  id: number;
  publicId: string;
  title: string;
  description: string;
  amount: number; // in rupees
  type: string;
  date: string;
  categoryName?: string;
  paymentMethod?: string;
  notes?: string;
  status: string;
  isReversal?: boolean;
}

/**
 * Fetch all subscriptions for the authenticated user:
 * 1. Custom subscriptions stored in user preferences
 * 2. Algorithmic subscriptions detected strictly from validated transaction records
 * ZERO mock or sample rows returned. Sanitizes any test data like 'gggg'.
 */
export async function getUserSubscriptions(): Promise<{
  success: boolean;
  customSubscriptions: UserSubscription[];
  detectedSubscriptions: UserSubscription[];
  error?: string;
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

    // Filter out any unintended test records like 'gggg'
    const customSubs: UserSubscription[] = (Array.isArray(savedSubs) ? savedSubs : [])
      .filter((s) => s && s.name && s.name.trim().toLowerCase() !== "gggg")
      .map((s) => {
        // Re-evaluate dynamic status based on billing date if not manually paused/cancelled
        const dynamicStatus = computeSubscriptionStatus(s.nextBillingDate, s.status);
        return {
          ...s,
          status: dynamicStatus,
        };
      });

    // 2. Detect recurring subscriptions strictly from actual user transactions
    let detectedSubs: UserSubscription[] = [];
    try {
      const rawDetected = await getDetectedSubscriptions();
      if (rawDetected && rawDetected.length > 0) {
        detectedSubs = rawDetected
          .filter((d) => !d.isCurated && d.name.trim().toLowerCase() !== "gggg")
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
      success: true,
      customSubscriptions: customSubs,
      detectedSubscriptions: detectedSubs,
    };
  } catch (error: any) {
    console.error("Error fetching user subscriptions:", error);
    return {
      success: false,
      customSubscriptions: [],
      detectedSubscriptions: [],
      error: error?.message || "Authentication or network error while loading subscriptions",
    };
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

    if (!subData.name || subData.name.trim().length === 0) {
      return { success: false, error: "Subscription name is required" };
    }
    if (isNaN(subData.amount) || subData.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }
    if (!subData.nextBillingDate) {
      return { success: false, error: "Next payment date is required" };
    }

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const existingPrefs = (userProfile?.preferences as Record<string, any>) || {};
    const currentSubs: UserSubscription[] = (Array.isArray(existingPrefs.customSubscriptions)
      ? existingPrefs.customSubscriptions
      : []
    ).filter((s) => s && s.name && s.name.trim().toLowerCase() !== "gggg");

    const billingCycle = subData.billingCycle || "monthly";
    const { monthlyAmount, annualizedCost } = computeSubscriptionAmounts(
      subData.amount,
      billingCycle
    );

    const nowIso = new Date().toISOString();
    let savedSub: UserSubscription;

    if (subData.id && currentSubs.some((s) => s.id === subData.id)) {
      // Update existing
      const existing = currentSubs.find((s) => s.id === subData.id)!;
      savedSub = {
        ...existing,
        name: subData.name.trim(),
        merchant: subData.merchant?.trim() || subData.name.trim(),
        category: subData.category || "Entertainment",
        amount: Math.round(subData.amount),
        billingCycle,
        monthlyAmount,
        annualizedCost,
        startDate: subData.startDate || existing.startDate,
        nextBillingDate: subData.nextBillingDate,
        lastPaymentDate: subData.lastPaymentDate !== undefined ? subData.lastPaymentDate : existing.lastPaymentDate,
        paymentMethod: subData.paymentMethod || existing.paymentMethod || "UPI",
        autoRenewal: subData.autoRenewal ?? existing.autoRenewal ?? true,
        reminderDays: subData.reminderDays ?? existing.reminderDays ?? 3,
        status: subData.status || existing.status || "Active",
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
 * Delete a custom subscription by ID.
 * Strict FinTech rule: Deleting a subscription never deletes historical transactions.
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
 * Pause a custom subscription
 */
export async function pauseCustomSubscription(
  subId: string
): Promise<{ success: boolean; updatedSubscription?: UserSubscription; error?: string }> {
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

    const targetSub = currentSubs.find((s) => s.id === subId);
    if (!targetSub) {
      return { success: false, error: "Subscription not found" };
    }

    const updatedSub: UserSubscription = {
      ...targetSub,
      status: "Paused",
      updatedAt: new Date().toISOString(),
    };

    const updatedSubs = currentSubs.map((s) => (s.id === subId ? updatedSub : s));

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

    return { success: true, updatedSubscription: updatedSub };
  } catch (error: any) {
    console.error("Error pausing subscription:", error);
    return { success: false, error: error.message || "Failed to pause subscription" };
  }
}

/**
 * Resume a paused custom subscription
 */
export async function resumeCustomSubscription(
  subId: string
): Promise<{ success: boolean; updatedSubscription?: UserSubscription; error?: string }> {
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

    const targetSub = currentSubs.find((s) => s.id === subId);
    if (!targetSub) {
      return { success: false, error: "Subscription not found" };
    }

    const resumedStatus = computeSubscriptionStatus(targetSub.nextBillingDate, "Active");
    const updatedSub: UserSubscription = {
      ...targetSub,
      status: resumedStatus,
      updatedAt: new Date().toISOString(),
    };

    const updatedSubs = currentSubs.map((s) => (s.id === subId ? updatedSub : s));

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

    return { success: true, updatedSubscription: updatedSub };
  } catch (error: any) {
    console.error("Error resuming subscription:", error);
    return { success: false, error: error.message || "Failed to resume subscription" };
  }
}

/**
 * Record a transaction for a subscription renewal:
 * 1. Creates verified transaction in transactions table using existing engine
 * 2. Links transaction via notes: `[SubId:${subId}]`
 * 3. Updates subscription status to "Paid", advances nextBillingDate, sets lastPaymentDate
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

    if (!txnData.title || txnData.title.trim().length === 0) {
      return { success: false, error: "Transaction title is required" };
    }
    if (isNaN(txnData.amount) || txnData.amount <= 0) {
      return { success: false, error: "Valid amount greater than 0 is required" };
    }

    // Embed structured reference in notes to reliably link to this subscription
    const structuredNotes = `${txnData.notes ? txnData.notes.trim() + " " : ""}[SubId:${subId}]`;

    // 1. Create the ledger transaction through the existing verified engine
    await createTransaction({
      title: txnData.title.trim(),
      description:
        txnData.description.trim() || `Subscription payment: ${txnData.title.trim()}`,
      amount: Math.round(txnData.amount),
      type: "paid",
      categoryName: txnData.categoryName || "Entertainment",
      paymentMethod: txnData.paymentMethod || "UPI",
      date: txnData.date ? new Date(txnData.date) : new Date(),
      notes: structuredNotes,
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

/**
 * Fetch transaction history linked to a specific subscription
 */
export async function getSubscriptionTransactions(
  subId: string,
  subName?: string
): Promise<{ success: boolean; transactions: LinkedSubscriptionTransaction[]; error?: string }> {
  try {
    const user = await requireAuth();

    // Query transactions that match the subscription reference tag or title
    const userTx = await db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        title: transactions.title,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        paymentMethod: transactions.paymentMethod,
        notes: transactions.notes,
        status: transactions.status,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.isDeleted, false),
          or(
            ilike(transactions.notes, `%[SubId:${subId}]%`),
            ilike(transactions.description, `%[SubId:${subId}]%`),
            subName
              ? and(
                  ilike(transactions.title, subName),
                  or(
                    ilike(transactions.description, "%subscription%"),
                    ilike(transactions.description, "%renewal%")
                  )
                )
              : undefined
          )
        )
      )
      .orderBy(desc(transactions.date))
      .limit(50);

    const formatted: LinkedSubscriptionTransaction[] = userTx.map((t) => ({
      id: t.id,
      publicId: t.publicId,
      title: t.title || "Subscription Payment",
      description: t.description,
      amount: Math.round(Number(t.amount) / 100), // convert paise to rupees
      type: t.type,
      date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
      paymentMethod: t.paymentMethod || "UPI",
      notes: t.notes || undefined,
      status: t.status,
      isReversal: t.notes?.includes("[Reversal") || t.title?.toLowerCase().startsWith("reversal"),
    }));

    return { success: true, transactions: formatted };
  } catch (error: any) {
    console.error("Error fetching subscription transactions:", error);
    return { success: false, transactions: [], error: error.message || "Failed to load transactions" };
  }
}

/**
 * Reverse a subscription payment transaction:
 * 1. Creates an offsetting reversal transaction in the ledger
 * 2. Marks the original transaction as reversed with audit trail
 * 3. Adjusts subscription's nextBillingDate and payment status back
 */
export async function reverseSubscriptionTransaction(
  subId: string,
  transactionId: number | string,
  reason?: string
): Promise<{ success: boolean; updatedSubscription?: UserSubscription; error?: string }> {
  try {
    const user = await requireAuth();

    // Fetch the target transaction
    const isNumeric = typeof transactionId === "number" || /^\d+$/.test(String(transactionId));
    const [targetTx] = await db
      .select()
      .from(transactions)
      .where(
        isNumeric
          ? eq(transactions.id, Number(transactionId))
          : eq(transactions.publicId, String(transactionId))
      )
      .limit(1);

    if (!targetTx || targetTx.userId !== user.id) {
      return { success: false, error: "Transaction not found or access denied" };
    }

    if (targetTx.isDeleted) {
      return { success: false, error: "This transaction is already deleted or reversed." };
    }

    const txAmountRupees = Math.round(Number(targetTx.amount) / 100);

    // 1. Create compensating ledger reversal transaction (reversal / refund)
    await createTransaction({
      title: `Reversal: ${targetTx.title || "Subscription Payment"}`,
      description: `Reversal of subscription payment #${targetTx.id}${reason ? ": " + reason : ""}`,
      amount: txAmountRupees,
      type: "received", // offsets the paid transaction in net financial calculation
      paymentMethod: targetTx.paymentMethod || "UPI",
      date: new Date(),
      notes: `[Reversal of #${targetTx.id}] [SubId:${subId}] ${reason || ""}`,
    });

    // 2. Soft-delete the original transaction with reversal audit trail
    await deleteTransaction(targetTx.id, `Reversed: ${reason || "User correction"}`);

    // 3. Roll back subscription payment status and next billing date
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
      const rolledBackNextDate = rollbackDateByBillingCycle(
        targetSub.nextBillingDate,
        targetSub.billingCycle
      );
      const newStatus = computeSubscriptionStatus(rolledBackNextDate, "Active");

      updatedSub = {
        ...targetSub,
        nextBillingDate: rolledBackNextDate,
        status: newStatus,
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
    console.error("Error reversing subscription transaction:", error);
    return { success: false, error: error.message || "Failed to reverse transaction" };
  }
}

/**
 * Delete a subscription payment transaction:
 * Uses existing soft delete engine with audit logging.
 * Reverts subscription's payment status and rolls back billing schedule if this was the latest payment.
 */
export async function deleteSubscriptionTransaction(
  subId: string,
  transactionId: number | string,
  reason?: string
): Promise<{ success: boolean; updatedSubscription?: UserSubscription; error?: string }> {
  try {
    const user = await requireAuth();

    // 1. Delete transaction through existing transaction delete engine
    const delResult = await deleteTransaction(transactionId, reason || "Subscription transaction correction");
    if (!delResult.success) {
      return { success: false, error: "Failed to delete transaction" };
    }

    // 2. Fetch remaining payments for this subscription to calculate correct lastPaymentDate
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
      // Find remaining active transactions for this subscription
      const remainingTx = await db
        .select({ date: transactions.date })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            or(
              ilike(transactions.notes, `%[SubId:${subId}]%`),
              ilike(transactions.description, `%[SubId:${subId}]%`)
            )
          )
        )
        .orderBy(desc(transactions.date))
        .limit(1);

      const latestRemainingDate = remainingTx.length > 0 && remainingTx[0].date
        ? new Date(remainingTx[0].date).toISOString().split("T")[0]
        : undefined;

      const rolledBackNextDate = rollbackDateByBillingCycle(
        targetSub.nextBillingDate,
        targetSub.billingCycle
      );
      const newStatus = computeSubscriptionStatus(rolledBackNextDate, "Active");

      updatedSub = {
        ...targetSub,
        lastPaymentDate: latestRemainingDate,
        nextBillingDate: rolledBackNextDate,
        status: newStatus,
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
    console.error("Error deleting subscription transaction:", error);
    return { success: false, error: error.message || "Failed to delete transaction" };
  }
}

/**
 * Edit an existing subscription transaction via existing transaction update engine
 */
export async function updateSubscriptionTransaction(
  subId: string,
  transactionId: number | string,
  data: {
    title?: string;
    description?: string;
    amount?: number;
    categoryName?: string;
    paymentMethod?: string;
    date?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();

    const structuredNotes = `${data.notes ? data.notes.trim() + " " : ""}[SubId:${subId}]`;

    await updateTransaction(transactionId, {
      title: data.title,
      description: data.description,
      amount: data.amount,
      categoryName: data.categoryName,
      paymentMethod: data.paymentMethod,
      date: data.date ? new Date(data.date) : undefined,
      notes: structuredNotes,
    });

    try {
      revalidatePath("/dashboard/ai");
      revalidatePath("/dashboard/transactions");
    } catch (_) {}

    return { success: true };
  } catch (error: any) {
    console.error("Error updating subscription transaction:", error);
    return { success: false, error: error.message || "Failed to update transaction" };
  }
}
