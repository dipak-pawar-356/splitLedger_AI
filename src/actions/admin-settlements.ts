"use server";

import { db, withDbRetry } from "@/lib/db";
import {
  groups,
  groupMembers,
  settlements,
  users,
  contacts,
  settlementVerifications,
  settlementHistory,
  settlementReminderSettings,
  settlementEmailLogs,
  adminActions,
  auditLogs,
  notifications,
} from "@/lib/db/schema/schema";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  DatabaseError,
} from "@/lib/errors";
import { generatePublicId, formatCurrency, formatDate, getBaseAppUrl } from "@/lib/utils";
import { sendEmailNotification } from "@/lib/notifications";
import { getGroupFinancialDetails } from "@/actions/group-financials";

/**
 * Verify caller is Group Owner or Group Admin
 */
async function requireGroupAdminOrOwner(groupIdOrPublicId: number | string) {
  const user = await requireAuth();

  const isNumeric =
    typeof groupIdOrPublicId === "number" || /^\d+$/.test(String(groupIdOrPublicId));

  const [group] = await db
    .select()
    .from(groups)
    .where(
      and(
        isNumeric
          ? eq(groups.id, Number(groupIdOrPublicId))
          : eq(groups.publicId, String(groupIdOrPublicId)),
        eq(groups.isDeleted, false)
      )
    )
    .limit(1);

  if (!group) {
    throw new NotFoundError("Group");
  }

  const isOwner = group.createdBy === user.id;

  const [callerMembership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  const isAdmin = isOwner || !!callerMembership?.isAdmin;

  if (!isAdmin) {
    throw new AuthorizationError(
      "Only the Group Owner or Group Admins have permission to perform this action."
    );
  }

  return { user, group, isOwner, isAdmin };
}

/**
 * SECTION 1: Admin Settlement Approval
 * Verifies an offline settlement payment, stores audit/verification records,
 * immediately updates balances and history.
 */
export async function verifySettlement(data: {
  groupId: number | string;
  settlementId?: number;
  fromUserId?: number;
  fromContactId?: number;
  toUserId?: number;
  toContactId?: number;
  amount: number; // in rupees
  paymentDate?: Date | string;
  paymentMethod: string;
  transactionReference?: string;
  reason: string;
  notes?: string;
}) {
  try {
    const { user, group } = await requireGroupAdminOrOwner(data.groupId);

    if (data.amount <= 0) {
      throw new ValidationError("Settlement amount must be greater than 0");
    }

    if (!data.paymentMethod || data.paymentMethod.trim() === "") {
      throw new ValidationError("Payment method is required");
    }

    if (!data.reason || data.reason.trim() === "") {
      throw new ValidationError("Reason for verification is required");
    }

    if (!data.fromUserId && !data.fromContactId) {
      throw new ValidationError("Sender (debtor) must be specified");
    }

    if (!data.toUserId && !data.toContactId) {
      throw new ValidationError("Receiver (creditor) must be specified");
    }

    const amountInPaise = Math.round(data.amount * 100);

    // Fetch sender and receiver display names
    let fromName = "Member";
    let toName = "Member";

    if (data.fromUserId) {
      const [u] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.fromUserId))
        .limit(1);
      if (u?.name) fromName = u.name;
    } else if (data.fromContactId) {
      const [c] = await db
        .select({ name: contacts.name })
        .from(contacts)
        .where(eq(contacts.id, data.fromContactId))
        .limit(1);
      if (c?.name) fromName = c.name;
    }

    if (data.toUserId) {
      const [u] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.toUserId))
        .limit(1);
      if (u?.name) toName = u.name;
    } else if (data.toContactId) {
      const [c] = await db
        .select({ name: contacts.name })
        .from(contacts)
        .where(eq(contacts.id, data.toContactId))
        .limit(1);
      if (c?.name) toName = c.name;
    }

    // 1. Find or create settlement record
    let targetSettlementId = data.settlementId;
    let targetPublicId = generatePublicId();

    if (targetSettlementId) {
      const [updatedSettlement] = await db
        .update(settlements)
        .set({
          status: "completed",
          paidAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          paymentMethod: data.paymentMethod,
          notes: data.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(settlements.id, targetSettlementId))
        .returning();

      if (updatedSettlement) {
        targetPublicId = updatedSettlement.publicId;
      }
    } else {
      const [existingPending] = await db
        .select()
        .from(settlements)
        .where(
          and(
            eq(settlements.groupId, group.id),
            eq(settlements.status, "pending"),
            eq(settlements.isDeleted, false),
            data.fromUserId
              ? eq(settlements.fromUserId, data.fromUserId)
              : eq(settlements.fromContactId, data.fromContactId!),
            data.toUserId
              ? eq(settlements.toUserId, data.toUserId)
              : eq(settlements.toContactId, data.toContactId!)
          )
        )
        .limit(1);

      if (existingPending) {
        targetSettlementId = existingPending.id;
        targetPublicId = existingPending.publicId;
        await db
          .update(settlements)
          .set({
            status: "completed",
            amount: amountInPaise,
            paidAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
            paymentMethod: data.paymentMethod,
            notes: data.notes || null,
            updatedAt: new Date(),
          })
          .where(eq(settlements.id, existingPending.id));
      } else {
        const [newSettlement] = await db
          .insert(settlements)
          .values({
            publicId: targetPublicId,
            groupId: group.id,
            fromUserId: data.fromUserId || null,
            fromContactId: data.fromContactId || null,
            toUserId: data.toUserId || null,
            toContactId: data.toContactId || null,
            amount: amountInPaise,
            currency: "INR",
            status: "completed",
            paidAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
            paymentMethod: data.paymentMethod,
            notes: data.notes || null,
          })
          .returning();

        targetSettlementId = newSettlement.id;
        targetPublicId = newSettlement.publicId;
      }
    }

    const previousBalanceInPaise = -amountInPaise;
    const newBalanceInPaise = 0;
    const adminDisplayName = user.name || "Admin";

    // 2. Create Settlement Verification Record
    const [verification] = await db
      .insert(settlementVerifications)
      .values({
        publicId: generatePublicId(),
        settlementId: targetSettlementId || null,
        groupId: group.id,
        senderUserId: data.fromUserId || null,
        senderContactId: data.fromContactId || null,
        receiverUserId: data.toUserId || null,
        receiverContactId: data.toContactId || null,
        amount: amountInPaise,
        currency: "INR",
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference?.trim() || null,
        reason: data.reason.trim(),
        notes: data.notes?.trim() || null,
        verifiedBy: user.id,
        verifiedByName: adminDisplayName,
        verifiedAt: new Date(),
      })
      .returning();

    // 3. Create Settlement History Record
    const [historyItem] = await db
      .insert(settlementHistory)
      .values({
        publicId: generatePublicId(),
        settlementId: targetSettlementId || null,
        verificationId: verification.id,
        groupId: group.id,
        fromUserId: data.fromUserId || null,
        fromContactId: data.fromContactId || null,
        fromName,
        toUserId: data.toUserId || null,
        toContactId: data.toContactId || null,
        toName,
        amount: amountInPaise,
        currency: "INR",
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference?.trim() || null,
        reason: data.reason.trim(),
        notes: data.notes?.trim() || null,
        approvedBy: user.id,
        approvedByName: adminDisplayName,
        approvedDate: new Date(),
        previousBalance: previousBalanceInPaise,
        newBalance: newBalanceInPaise,
      })
      .returning();

    // 4. Create Admin Action Audit Log
    await db.insert(adminActions).values({
      publicId: generatePublicId(),
      groupId: group.id,
      adminId: user.id,
      adminName: adminDisplayName,
      actionType: "settlement_approved",
      targetEntity: "settlement",
      targetEntityId: targetSettlementId || null,
      details: {
        verificationId: verification.id,
        fromName,
        toName,
        amountRupees: data.amount,
        paymentMethod: data.paymentMethod,
        reason: data.reason,
        transactionReference: data.transactionReference,
      },
    });

    // 5. Create System Audit Log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "settle",
      entityType: "settlement",
      entityId: targetSettlementId || group.id,
      entityPublicId: targetPublicId,
      status: "success",
      reason: data.reason,
      changes: {
        verifiedOffline: true,
        verificationId: verification.id,
        amountPaise: amountInPaise,
        fromName,
        toName,
        paymentMethod: data.paymentMethod,
      },
    });

    // 6. Dispatch in-app notifications to debtor and creditor
    if (data.fromUserId && data.fromUserId !== user.id) {
      await db.insert(notifications).values({
        userId: data.fromUserId,
        type: "settlement",
        category: "settlement",
        title: "Payment Verified ✅",
        message: `Your offline payment of ₹${data.amount.toFixed(2)} to ${toName} in "${group.name}" was verified by ${adminDisplayName}.`,
        groupId: group.id,
        metadata: {
          verificationId: verification.id,
          amount: data.amount,
          verifiedBy: adminDisplayName,
        },
      });
    }

    if (data.toUserId && data.toUserId !== user.id) {
      await db.insert(notifications).values({
        userId: data.toUserId,
        type: "settlement",
        category: "settlement",
        title: "Settlement Confirmed ✅",
        message: `Offline settlement of ₹${data.amount.toFixed(2)} from ${fromName} in "${group.name}" was confirmed by ${adminDisplayName}.`,
        groupId: group.id,
        metadata: {
          verificationId: verification.id,
          amount: data.amount,
          verifiedBy: adminDisplayName,
        },
      });
    }

    // 7. Revalidate Next.js cache
    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard/settlements");
    revalidatePath("/dashboard");

    return {
      success: true,
      verification,
      historyItem,
      message: `Payment of ₹${data.amount.toFixed(2)} from ${fromName} to ${toName} verified successfully.`,
    };
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof AuthorizationError
    ) {
      throw error;
    }
    throw new DatabaseError("Failed to verify settlement", { originalError: error });
  }
}

/**
 * Fetch verified settlement history for group
 */
export async function getSettlementHistory(
  groupIdOrPublicId: number | string,
  options?: { search?: string; limit?: number; offset?: number }
) {
  try {
    const { group } = await requireGroupAdminOrOwner(groupIdOrPublicId);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const history = await db
      .select()
      .from(settlementHistory)
      .where(eq(settlementHistory.groupId, group.id))
      .orderBy(desc(settlementHistory.approvedDate))
      .limit(limit)
      .offset(offset);

    return history.map((item) => ({
      ...item,
      amountRupees: item.amount / 100,
      previousBalanceRupees: item.previousBalance / 100,
      newBalanceRupees: item.newBalance / 100,
    }));
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch settlement history", { originalError: error });
  }
}

/**
 * SECTION 2: Automatic Settlement Reminder Settings
 */
export async function getSettlementReminderSettings(groupIdOrPublicId: number | string) {
  try {
    const { group } = await requireGroupAdminOrOwner(groupIdOrPublicId);

    const [settings] = await db
      .select()
      .from(settlementReminderSettings)
      .where(eq(settlementReminderSettings.groupId, group.id))
      .limit(1);

    if (!settings) {
      return {
        id: 0,
        publicId: "",
        groupId: group.id,
        isEnabled: false,
        frequency: "daily",
        customIntervalDays: 1,
        reminderTime: "09:00",
        timezone: "Asia/Kolkata",
        startDate: null,
        endDate: null,
        maxReminderCount: 5,
        isPaused: false,
        lastRunAt: null,
        nextScheduledAt: null,
      };
    }

    return settings;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch reminder settings", { originalError: error });
  }
}

export async function updateSettlementReminderSettings(
  groupIdOrPublicId: number | string,
  data: {
    isEnabled: boolean;
    frequency?: "daily" | "every_2_days" | "every_3_days" | "weekly" | "custom";
    customIntervalDays?: number;
    reminderTime?: string;
    timezone?: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    maxReminderCount?: number;
  }
) {
  try {
    const { user, group } = await requireGroupAdminOrOwner(groupIdOrPublicId);

    const [existing] = await db
      .select()
      .from(settlementReminderSettings)
      .where(eq(settlementReminderSettings.groupId, group.id))
      .limit(1);

    let result;

    if (existing) {
      const [updated] = await db
        .update(settlementReminderSettings)
        .set({
          isEnabled: data.isEnabled,
          frequency: data.frequency || existing.frequency,
          customIntervalDays: data.customIntervalDays || existing.customIntervalDays,
          reminderTime: data.reminderTime || existing.reminderTime,
          timezone: data.timezone || existing.timezone,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          maxReminderCount: data.maxReminderCount || existing.maxReminderCount,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(settlementReminderSettings.id, existing.id))
        .returning();

      result = updated;
    } else {
      const [created] = await db
        .insert(settlementReminderSettings)
        .values({
          publicId: generatePublicId(),
          groupId: group.id,
          isEnabled: data.isEnabled,
          frequency: data.frequency || "daily",
          customIntervalDays: data.customIntervalDays || 1,
          reminderTime: data.reminderTime || "09:00",
          timezone: data.timezone || "Asia/Kolkata",
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          maxReminderCount: data.maxReminderCount || 5,
          isPaused: false,
          createdBy: user.id,
        })
        .returning();

      result = created;
    }

    await db.insert(adminActions).values({
      publicId: generatePublicId(),
      groupId: group.id,
      adminId: user.id,
      adminName: user.name || "Admin",
      actionType: "reminder_settings_updated",
      targetEntity: "reminder_settings",
      targetEntityId: result.id,
      details: data,
    });

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    return { success: true, settings: result };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update reminder settings", { originalError: error });
  }
}

export async function toggleReminderPause(
  groupIdOrPublicId: number | string,
  isPaused?: boolean
) {
  try {
    const { user, group } = await requireGroupAdminOrOwner(groupIdOrPublicId);

    const [existing] = await db
      .select()
      .from(settlementReminderSettings)
      .where(eq(settlementReminderSettings.groupId, group.id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Reminder settings for this group");
    }

    const targetPaused = typeof isPaused === "boolean" ? isPaused : !existing.isPaused;

    const [updated] = await db
      .update(settlementReminderSettings)
      .set({
        isPaused: targetPaused,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(settlementReminderSettings.id, existing.id))
      .returning();

    await db.insert(adminActions).values({
      publicId: generatePublicId(),
      groupId: group.id,
      adminId: user.id,
      adminName: user.name || "Admin",
      actionType: targetPaused ? "reminder_paused" : "reminder_resumed",
      targetEntity: "reminder_settings",
      targetEntityId: existing.id,
      details: { isPaused: targetPaused },
    });

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    return { success: true, isPaused: updated.isPaused };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to toggle reminder pause", { originalError: error });
  }
}

/**
 * Dynamic HTML Email Generators (EMAIL 1 & EMAIL 2)
 */
export async function generateDebtorReminderEmail(data: {
  recipientName: string;
  groupName: string;
  totalGroupExpense: number;
  contribution: number;
  pendingPayment: number;
  owesToList: Array<{ name: string; amount: number }>;
  groupPublicId: string;
  supportEmail?: string;
  ownerName?: string;
  reminderCount: number;
}) {
  const subject = `Settlement Reminder – ${data.groupName} | Payment Pending | ${formatCurrency(data.pendingPayment)} Due`;

  const paymentsHtml = data.owesToList
    .map(
      (o) => `
      <div style="background:#ffffff;border-radius:12px;padding:14px 18px;margin:10px 0;border:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:12px;color:#64748b;display:block;">You need to pay</span>
          <strong style="font-size:16px;color:#0f172a;">${o.name}</strong>
        </div>
        <div style="text-align:right;">
          <span style="font-size:18px;font-weight:800;color:#dc2626;">${formatCurrency(o.amount)}</span>
        </div>
      </div>
    `
    )
    .join("");

  const deepLink = `${getBaseAppUrl()}/dashboard/groups/${data.groupPublicId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px;background-color:#0f172a;color:#334155;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.15);">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#ffffff;padding:32px 28px;text-align:center;border-bottom:3px solid #0F9D58;">
          <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">SplitLedger AI</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Automated Group Settlement Notice</p>
        </div>

        <div style="padding:28px 24px;">
          <p style="font-size:16px;color:#0f172a;margin-top:0;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size:14px;line-height:1.6;color:#475569;">
            This is a friendly reminder regarding your participation in the group <strong>${data.groupName}</strong>.
          </p>

          <div style="background:#f8fafc;border-radius:16px;padding:18px;margin:20px 0;border:1px solid #e2e8f0;">
            <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:700;">Current Group Summary</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:6px 0;color:#64748b;">Total Group Expense:</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;">${formatCurrency(data.totalGroupExpense)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">Your Contribution:</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;">${formatCurrency(data.contribution)}</td>
              </tr>
              <tr style="border-top:1px dashed #cbd5e1;">
                <td style="padding:8px 0 4px;color:#dc2626;font-weight:700;">Pending Payment:</td>
                <td style="padding:8px 0 4px;text-align:right;font-weight:800;color:#dc2626;font-size:16px;">${formatCurrency(data.pendingPayment)}</td>
              </tr>
            </table>
          </div>

          <div style="margin:24px 0;">
            <h4 style="margin:0 0 8px;font-size:13px;color:#475569;font-weight:700;text-transform:uppercase;">Outstanding Dues</h4>
            ${paymentsHtml}
          </div>

          <p style="font-size:14px;color:#475569;line-height:1.6;">
            Please complete this payment to settle your outstanding balance.
          </p>

          <div style="background:#f1f5f9;border-radius:10px;padding:12px 16px;font-size:12px;color:#64748b;margin:16px 0;">
            <p style="margin:2px 0;"><strong>Payment Status:</strong> <span style="color:#d97706;font-weight:700;">Pending Verification</span></p>
            <p style="margin:2px 0;"><strong>Payment Due Since:</strong> ${formatDate(new Date())}</p>
            <p style="margin:2px 0;"><strong>Reminder Count:</strong> #${data.reminderCount}</p>
          </div>

          <div style="text-align:center;margin:28px 0 16px;">
            <a href="${deepLink}" style="display:inline-block;background:#0F9D58;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;border-radius:12px;box-shadow:0 4px 14px rgba(15,157,88,0.4);">
              Open Group Ledger
            </a>
          </div>

          <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin-top:24px;border-top:1px solid #f1f5f9;padding-top:16px;">
            If you have already completed this payment offline (Cash, UPI, PhonePe, Google Pay), please notify the receiver or Group Admin so they can mark it verified inside SplitLedger AI.<br/>
            Otherwise kindly contact the receiver after payment.
          </p>
        </div>

        <div style="background:#f8fafc;padding:18px 24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          <p style="margin:0;">SplitLedger AI • Advanced Group Settlement System</p>
          <p style="margin:4px 0 0;">Group Owner: ${data.ownerName || "Group Admin"} • Support: ${data.supportEmail || "support@splitledger.ai"}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export async function generateCreditorUpdateEmail(data: {
  recipientName: string;
  groupName: string;
  totalReceivable?: number;
  amountReceivable?: number;
  receivesFromList: Array<{ name: string; amount: number }>;
  groupPublicId: string;
  supportEmail?: string;
  ownerName?: string;
  reminderCount?: number;
}) {
  const receivable = data.totalReceivable ?? data.amountReceivable ?? 0;
  const subject = `Settlement Update – ${data.groupName} | Expected Incoming Payment | ${formatCurrency(receivable)} Receivable`;

  const paymentsHtml = data.receivesFromList
    .map(
      (r) => `
      <div style="background:#ffffff;border-radius:12px;padding:14px 18px;margin:10px 0;border:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:12px;color:#64748b;display:block;">Pending from</span>
          <strong style="font-size:16px;color:#0f172a;">${r.name}</strong>
        </div>
        <div style="text-align:right;">
          <span style="font-size:18px;font-weight:800;color:#0F9D58;">${formatCurrency(r.amount)}</span>
        </div>
      </div>
    `
    )
    .join("");

  const deepLink = `${getBaseAppUrl()}/dashboard/groups/${data.groupPublicId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px;background-color:#0f172a;color:#334155;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.15);">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#ffffff;padding:32px 28px;text-align:center;border-bottom:3px solid #0F9D58;">
          <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">SplitLedger AI</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Incoming Settlement Summary</p>
        </div>

        <div style="padding:28px 24px;">
          <p style="font-size:16px;color:#0f172a;margin-top:0;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size:14px;line-height:1.6;color:#475569;">
            According to the current settlement summary of <strong>${data.groupName}</strong>, you are expected to receive a total of:
          </p>

          <div style="background:#f0fdf4;border-radius:16px;padding:20px;margin:20px 0;border:1px solid #bbf7d0;text-align:center;">
            <span style="font-size:13px;color:#166534;font-weight:700;text-transform:uppercase;">Total Expected Incoming</span>
            <div style="font-size:32px;font-weight:900;color:#15803d;margin-top:4px;">
              ${formatCurrency(receivable)}
            </div>
          </div>

          <div style="margin:24px 0;">
            <h4 style="margin:0 0 8px;font-size:13px;color:#475569;font-weight:700;text-transform:uppercase;">Pending Receivables</h4>
            ${paymentsHtml}
          </div>

          <p style="font-size:14px;color:#475569;line-height:1.6;">
            If payment has already been received offline (Cash, UPI, Google Pay, PhonePe), the Group Admin can verify it inside SplitLedger AI to update the group balances.
          </p>
          <p style="font-size:14px;color:#475569;line-height:1.6;">
            If payment is still pending, you may contact the respective member.
          </p>

          <div style="text-align:center;margin:28px 0 16px;">
            <a href="${deepLink}" style="display:inline-block;background:#0F9D58;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;border-radius:12px;box-shadow:0 4px 14px rgba(15,157,88,0.4);">
              View Group Ledger
            </a>
          </div>
        </div>

        <div style="background:#f8fafc;padding:18px 24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          <p style="margin:0;">SplitLedger AI • Advanced Group Settlement System</p>
          <p style="margin:4px 0 0;">Group Owner: ${data.ownerName || "Group Admin"} • Support: ${data.supportEmail || "support@splitledger.ai"}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Send or Preview Settlement Reminders Now
 */
export async function sendSettlementRemindersNow(
  groupIdOrPublicId: number | string,
  previewOnly: boolean = false
) {
  try {
    const { user, group } = await requireGroupAdminOrOwner(groupIdOrPublicId);

    // 1. Recalculate real-time group balances from the single calculation engine
    const financialData = await getGroupFinancialDetails(group.id);
    const { overview, members, settlements: settlementData } = financialData;

    // 2. Identify Debtors (Need to pay > 0.01)
    const debtors = members.filter((m) => m.needToPay > 0.01);

    // 3. Identify Creditors (Will receive > 0.01)
    const creditors = members.filter((m) => m.willReceive > 0.01);

    const debtorPreviews: any[] = [];
    const creditorPreviews: any[] = [];

    const pastLogs = await db
      .select({
        recipientUserId: settlementEmailLogs.recipientUserId,
        reminderCount: settlementEmailLogs.reminderCount,
      })
      .from(settlementEmailLogs)
      .where(eq(settlementEmailLogs.groupId, group.id));

    const reminderCountMap = new Map<number, number>();
    pastLogs.forEach((l) => {
      if (l.recipientUserId) {
        const curr = reminderCountMap.get(l.recipientUserId) || 0;
        if (l.reminderCount > curr) reminderCountMap.set(l.recipientUserId, l.reminderCount);
      }
    });

    let sentCount = 0;
    let failedCount = 0;
    const executionLogs: any[] = [];

    // Generate Debtor Emails
    for (const debtor of debtors) {
      if (!debtor.email) continue;

      const currentCount = (reminderCountMap.get(debtor.userId || 0) || 0) + 1;

      const owesTo = debtor.owesTo.length > 0
        ? debtor.owesTo
        : settlementData.suggestions
            .filter((s) => s.fromUserId === debtor.userId || (debtor.contactId && s.fromContactId === debtor.contactId))
            .map((s) => ({ name: s.toName, amount: s.amount }));

      const { subject, html } = await generateDebtorReminderEmail({
        recipientName: debtor.name,
        groupName: group.name,
        totalGroupExpense: overview.totalExpenses,
        contribution: debtor.totalPaid,
        pendingPayment: debtor.needToPay,
        owesToList: owesTo.length > 0 ? owesTo : [{ name: "Group Creditors", amount: debtor.needToPay }],
        groupPublicId: group.publicId,
        ownerName: members.find((m) => m.role === "owner")?.name || "Admin",
        reminderCount: currentCount,
      });

      debtorPreviews.push({
        recipientName: debtor.name,
        recipientEmail: debtor.email,
        type: "debtor",
        subject,
        html,
        amount: debtor.needToPay,
        reminderCount: currentCount,
      });

      if (!previewOnly) {
        try {
          const sent = await sendEmailNotification(debtor.email, subject, html);
          const status = sent ? "delivered" : "failed";
          const failureReason = sent ? null : "Resend email provider dispatch returned false or not configured";

          const [log] = await db
            .insert(settlementEmailLogs)
            .values({
              publicId: generatePublicId(),
              groupId: group.id,
              recipientUserId: debtor.userId || null,
              recipientContactId: debtor.contactId || null,
              recipientName: debtor.name,
              recipientEmail: debtor.email,
              recipientType: "debtor",
              subject,
              amountDue: Math.round(debtor.needToPay * 100),
              currency: "INR",
              reminderCount: currentCount,
              status,
              failureReason,
            })
            .returning();

          executionLogs.push(log);
          if (sent) sentCount++;
          else failedCount++;
        } catch (err: any) {
          failedCount++;
          const [log] = await db
            .insert(settlementEmailLogs)
            .values({
              publicId: generatePublicId(),
              groupId: group.id,
              recipientUserId: debtor.userId || null,
              recipientContactId: debtor.contactId || null,
              recipientName: debtor.name,
              recipientEmail: debtor.email,
              recipientType: "debtor",
              subject,
              amountDue: Math.round(debtor.needToPay * 100),
              currency: "INR",
              reminderCount: currentCount,
              status: "failed",
              failureReason: err?.message || "Unknown delivery failure",
            })
            .returning();
          executionLogs.push(log);
        }
      }
    }

    // Generate Creditor Emails
    for (const creditor of creditors) {
      if (!creditor.email) continue;

      const currentCount = (reminderCountMap.get(creditor.userId || 0) || 0) + 1;

      const receivesFrom = creditor.receivesFrom.length > 0
        ? creditor.receivesFrom
        : settlementData.suggestions
            .filter((s) => s.toUserId === creditor.userId || (creditor.contactId && s.toContactId === creditor.contactId))
            .map((s) => ({ name: s.fromName, amount: s.amount }));

      const { subject, html } = await generateCreditorUpdateEmail({
        recipientName: creditor.name,
        groupName: group.name,
        totalReceivable: creditor.willReceive,
        receivesFromList: receivesFrom.length > 0 ? receivesFrom : [{ name: "Group Members", amount: creditor.willReceive }],
        groupPublicId: group.publicId,
        ownerName: members.find((m) => m.role === "owner")?.name || "Admin",
        reminderCount: currentCount,
      });

      creditorPreviews.push({
        recipientName: creditor.name,
        recipientEmail: creditor.email,
        type: "creditor",
        subject,
        html,
        amount: creditor.willReceive,
        reminderCount: currentCount,
      });

      if (!previewOnly) {
        try {
          const sent = await sendEmailNotification(creditor.email, subject, html);
          const status = sent ? "delivered" : "failed";
          const failureReason = sent ? null : "Resend email provider dispatch returned false or not configured";

          const [log] = await db
            .insert(settlementEmailLogs)
            .values({
              publicId: generatePublicId(),
              groupId: group.id,
              recipientUserId: creditor.userId || null,
              recipientContactId: creditor.contactId || null,
              recipientName: creditor.name,
              recipientEmail: creditor.email,
              recipientType: "creditor",
              subject,
              amountDue: Math.round(creditor.willReceive * 100),
              currency: "INR",
              reminderCount: currentCount,
              status,
              failureReason,
            })
            .returning();

          executionLogs.push(log);
          if (sent) sentCount++;
          else failedCount++;
        } catch (err: any) {
          failedCount++;
          const [log] = await db
            .insert(settlementEmailLogs)
            .values({
              publicId: generatePublicId(),
              groupId: group.id,
              recipientUserId: creditor.userId || null,
              recipientContactId: creditor.contactId || null,
              recipientName: creditor.name,
              recipientEmail: creditor.email,
              recipientType: "creditor",
              subject,
              amountDue: Math.round(creditor.willReceive * 100),
              currency: "INR",
              reminderCount: currentCount,
              status: "failed",
              failureReason: err?.message || "Unknown delivery failure",
            })
            .returning();
          executionLogs.push(log);
        }
      }
    }

    if (!previewOnly) {
      await db
        .update(settlementReminderSettings)
        .set({
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(settlementReminderSettings.groupId, group.id));

      await db.insert(adminActions).values({
        publicId: generatePublicId(),
        groupId: group.id,
        adminId: user.id,
        adminName: user.name || "Admin",
        actionType: "reminder_triggered_manually",
        targetEntity: "reminder_logs",
        details: { sentCount, failedCount, totalRecipients: debtors.length + creditors.length },
      });

      revalidatePath(`/dashboard/groups/${group.publicId}`);
    }

    return {
      success: true,
      previewOnly,
      debtorPreviews,
      creditorPreviews,
      sentCount,
      failedCount,
      totalRecipients: debtors.length + creditors.length,
      logs: executionLogs,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to process settlement reminders", { originalError: error });
  }
}

/**
 * Get settlement email logs for group admin dashboard
 */
export async function getSettlementEmailLogs(groupIdOrPublicId: number | string) {
  try {
    const { group } = await requireGroupAdminOrOwner(groupIdOrPublicId);

    const logs = await db
      .select()
      .from(settlementEmailLogs)
      .where(eq(settlementEmailLogs.groupId, group.id))
      .orderBy(desc(settlementEmailLogs.sentAt))
      .limit(100);

    return logs.map((l) => ({
      ...l,
      amountDueRupees: l.amountDue / 100,
    }));
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch email logs", { originalError: error });
  }
}

/**
 * Retry sending a failed email from the log
 */
export async function retryFailedEmailLog(logId: number) {
  try {
    const user = await requireAuth();

    const [log] = await db
      .select()
      .from(settlementEmailLogs)
      .where(eq(settlementEmailLogs.id, logId))
      .limit(1);

    if (!log) {
      throw new NotFoundError("Email log record");
    }

    const { group } = await requireGroupAdminOrOwner(log.groupId);

    const financialData = await getGroupFinancialDetails(group.id);
    const member = financialData.members.find(
      (m) =>
        (log.recipientUserId && m.userId === log.recipientUserId) ||
        (log.recipientContactId && m.contactId === log.recipientContactId)
    );

    if (!member) {
      throw new ValidationError("Member no longer in group");
    }

    let emailPayload;
    if (log.recipientType === "debtor") {
      emailPayload = await generateDebtorReminderEmail({
        recipientName: member.name,
        groupName: group.name,
        totalGroupExpense: financialData.overview.totalExpenses,
        contribution: member.totalPaid,
        pendingPayment: member.needToPay,
        owesToList: member.owesTo,
        groupPublicId: group.publicId,
        reminderCount: log.reminderCount + 1,
      });
    } else {
      emailPayload = await generateCreditorUpdateEmail({
        recipientName: member.name,
        groupName: group.name,
        totalReceivable: member.willReceive,
        receivesFromList: member.receivesFrom,
        groupPublicId: group.publicId,
        reminderCount: log.reminderCount + 1,
      });
    }

    const sent = await sendEmailNotification(
      log.recipientEmail,
      emailPayload.subject,
      emailPayload.html
    );

    const [updated] = await db
      .update(settlementEmailLogs)
      .set({
        status: sent ? "delivered" : "failed",
        failureReason: sent ? null : "Resend API delivery retry failed",
        sentAt: new Date(),
        reminderCount: log.reminderCount + 1,
      })
      .where(eq(settlementEmailLogs.id, log.id))
      .returning();

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    return { success: sent, log: updated };
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof AuthorizationError ||
      error instanceof ValidationError
    ) {
      throw error;
    }
    throw new DatabaseError("Failed to retry email delivery", { originalError: error });
  }
}
