"use server";

import { db, withDbRetry } from "@/lib/db";
import {
  reminders,
  contacts,
  groups,
  groupMembers,
  users,
  notifications,
  auditLogs,
} from "@/lib/db/schema/schema";
import { eq, and, desc, or, ilike, inArray, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, AuthorizationError, ForbiddenError, DatabaseError } from "@/lib/errors";
import { sendEmailNotification, sendEmailWithStatus, getRichSettlementReminderHtml, type EmailSendResult } from "@/lib/notifications";
import { generateWhatsAppLink, formatCurrency, getBaseAppUrl } from "@/lib/utils";

export interface CreateReminderInput {
  title?: string;
  recipientType?: "contact" | "group" | "member" | "self";
  recipientId?: number | string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  method?: "whatsapp" | "email" | "in_app" | "copy";
  message: string;
  dueDate?: Date | string | null;
  reminderDate?: Date | string | null;
  amount?: number;
  currency?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  repeatType?: "once" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
  repeatInterval?: number;
  repeatEnd?: Date | string | null;
  notificationType?: "whatsapp" | "email" | "in_app" | "all";
  transactionId?: number | string;
  contactId?: number | string;
  groupId?: number | string;
  totalGroupExpense?: number;
  fairShare?: number;
  paidAmount?: number;
  netPosition?: number;
}

export interface UpdateReminderInput {
  id: number;
  title?: string;
  message?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  method?: "whatsapp" | "email" | "in_app" | "copy";
  dueDate?: Date | string | null;
  reminderDate?: Date | string | null;
  amount?: number;
  currency?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  repeatType?: "once" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
  repeatInterval?: number;
  repeatEnd?: Date | string | null;
  notificationType?: "whatsapp" | "email" | "in_app" | "all";
  status?: "pending" | "sent" | "completed" | "cancelled";
}

export interface GetRemindersFilters {
  groupId?: number | string;
  contactId?: number | string;
  status?: string;
  isCompleted?: boolean;
  isArchived?: boolean;
  priority?: string;
  search?: string;
  includeDeleted?: boolean;
}

/**
 * Creates a production-ready reminder with validation, permission checks,
 * database persistence, notification dispatch, and audit logging.
 */
export async function createReminder(data: CreateReminderInput) {
  try {
    const user = await requireAuth();

    // 1. Validate required fields
    if (!data.message || data.message.trim().length === 0) {
      throw new ValidationError("Reminder message is required");
    }

    if (data.amount !== undefined && data.amount !== null) {
      if (isNaN(data.amount) || data.amount < 0) {
        throw new ValidationError("Amount must be a positive number");
      }
    }

    if (data.repeatInterval !== undefined && data.repeatInterval !== null) {
      if (isNaN(data.repeatInterval) || data.repeatInterval < 1) {
        throw new ValidationError("Repeat interval must be at least 1");
      }
    }

    // 2. Resolve Group ID if group recipient or groupId is supplied
    let targetGroupId: number | null = null;
    let targetGroup: typeof groups.$inferSelect | null = null;
    const rawGroupId = data.groupId || (data.recipientType === "group" ? data.recipientId : null);

    if (rawGroupId) {
      const isNumericGroup = typeof rawGroupId === "number" || /^\d+$/.test(String(rawGroupId));
      const [group] = await withDbRetry(async () =>
        db
          .select()
          .from(groups)
          .where(
            isNumericGroup
              ? eq(groups.id, Number(rawGroupId))
              : eq(groups.publicId, String(rawGroupId))
          )
          .limit(1)
      );

      if (!group) {
        throw new NotFoundError("Group");
      }

      // Check group membership
      const [membership] = await withDbRetry(async () =>
        db
          .select()
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, group.id),
              eq(groupMembers.userId, user.id)
            )
          )
          .limit(1)
      );

      if (!membership && group.createdBy !== user.id) {
        throw new AuthorizationError("You must be a member of this group to create group reminders");
      }

      targetGroup = group;
      targetGroupId = group.id;
    }

    // 3. Resolve Contact ID if contact recipient or contactId is supplied
    let targetContactId: number | null = null;
    const rawContactId = data.contactId || (data.recipientType === "contact" ? data.recipientId : null);

    if (rawContactId) {
      const isNumericContact = typeof rawContactId === "number" || /^\d+$/.test(String(rawContactId));
      const [contact] = await withDbRetry(async () =>
        db
          .select()
          .from(contacts)
          .where(
            and(
              isNumericContact
                ? eq(contacts.id, Number(rawContactId))
                : eq(contacts.publicId, String(rawContactId)),
              eq(contacts.userId, user.id)
            )
          )
          .limit(1)
      );

      if (contact) {
        targetContactId = contact.id;
      }
    }

    // 4. Resolve Transaction ID if provided
    let targetTxId: number | null = null;
    if (data.transactionId) {
      const isNumericTx = typeof data.transactionId === "number" || /^\d+$/.test(String(data.transactionId));
      if (isNumericTx) {
        targetTxId = Number(data.transactionId);
      }
    }

    const publicId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const recipientType = data.recipientType || (targetGroupId ? "group" : targetContactId ? "contact" : "self");
    const numericRecipientId =
      targetGroupId ||
      targetContactId ||
      (typeof data.recipientId === "number" || /^\d+$/.test(String(data.recipientId))
        ? Number(data.recipientId)
        : user.id);

    const parseDate = (d?: Date | string | null): Date | null => {
      if (!d) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // 5. Insert reminder into database using withDbRetry
    const [newReminder] = await withDbRetry(async () =>
      db
        .insert(reminders)
        .values({
          publicId,
          userId: user.id,
          groupId: targetGroupId,
          transactionId: targetTxId,
          contactId: targetContactId,
          title: data.title?.trim() || null,
          recipientType: recipientType === "member" ? "contact" : recipientType,
          recipientId: numericRecipientId,
          recipientName: data.recipientName?.trim() || null,
          recipientPhone: data.recipientPhone?.trim() || null,
          recipientEmail: data.recipientEmail?.trim() || null,
          method: data.method || "whatsapp",
          message: data.message.trim(),
          dueDate: parseDate(data.dueDate),
          reminderDate: parseDate(data.reminderDate) || parseDate(data.dueDate),
          amount: data.amount ? Math.round(data.amount * 100) : null,
          currency: data.currency || "INR",
          priority: data.priority || "medium",
          repeatType: data.repeatType || "once",
          repeatInterval: data.repeatInterval || 1,
          repeatEnd: parseDate(data.repeatEnd),
          notificationType: data.notificationType || data.method || "whatsapp",
          status: "sent",
          isCompleted: false,
          isPinned: false,
          isArchived: false,
          isDeleted: false,
          createdBy: user.id,
          sentAt: new Date(),
        })
        .returning()
    );

    // 6. Create in-app Notification record
    try {
      await withDbRetry(async () =>
        db.insert(notifications).values({
          userId: user.id,
          publicId: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          category: "reminder",
          type: "reminder_created",
          title: data.title || "Payment Reminder Scheduled",
          message: data.message.length > 120 ? `${data.message.substring(0, 117)}...` : data.message,
          priority: data.priority || "medium",
          status: "unread",
          groupId: targetGroupId,
          transactionId: targetTxId,
          senderId: user.id,
          metadata: {
            reminderId: newReminder.id,
            reminderPublicId: newReminder.publicId,
            amount: data.amount,
            method: data.method,
          },
        })
      );
    } catch (notifErr) {
      console.warn("Non-fatal: Failed to create reminder notification:", notifErr);
    }

    // 7. Record Audit Log
    try {
      await withDbRetry(async () =>
        db.insert(auditLogs).values({
          userId: user.id,
          publicId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          action: "create",
          entityType: "reminder",
          entityId: newReminder.id,
          entityPublicId: newReminder.publicId,
          changes: {
            title: newReminder.title,
            amount: newReminder.amount,
            method: newReminder.method,
            priority: newReminder.priority,
            recipientType: newReminder.recipientType,
          },
        })
      );
    } catch (auditErr) {
      console.warn("Non-fatal: Failed to create reminder audit log:", auditErr);
    }

    // 8. If Email method requested, dispatch email asynchronously
    let emailResult: EmailSendResult | null = null;
    if (data.method === "email" && data.recipientEmail) {
      try {
        const rawEmails = data.recipientEmail
          .split(/[,;]/)
          .map((e) => e.trim())
          .filter((e) => Boolean(e) && e.includes("@"));

        const appUrl = targetGroup?.publicId
          ? `${getBaseAppUrl()}/dashboard/groups/${targetGroup.publicId}`
          : getBaseAppUrl();

        const { subject, html } = getRichSettlementReminderHtml({
          groupName: targetGroup?.name || undefined,
          recipientName: data.recipientName || "Member",
          senderName: user.name || "A friend",
          amount: data.amount,
          currency: data.currency || "INR",
          message: data.message,
          appUrl,
          totalGroupExpense: data.totalGroupExpense,
          fairShare: data.fairShare,
          paidAmount: data.paidAmount,
          netPosition: data.netPosition,
        });

        if (rawEmails.length <= 1) {
          const target = rawEmails[0] || data.recipientEmail.trim();
          emailResult = await sendEmailWithStatus(target, subject, html);
        } else {
          let lastRes: EmailSendResult = { success: true };
          for (const target of rawEmails) {
            const res = await sendEmailWithStatus(target, subject, html);
            if (!res.success) {
              lastRes = res;
            }
          }
          emailResult = lastRes;
        }

        if (!emailResult.success) {
          console.warn("Reminder email dispatch returned failure:", emailResult.error);
        }
      } catch (err: any) {
        console.error("Non-fatal: Failed to send reminder email:", err);
        emailResult = { success: false, error: err?.message || "Failed to dispatch email" };
      }
    }

    // 9. Generate WhatsApp Link
    let whatsappLink: string | null = null;
    if (data.recipientPhone) {
      whatsappLink = generateWhatsAppLink(data.recipientPhone, data.message);
    } else {
      whatsappLink = `https://wa.me/?text=${encodeURIComponent(data.message)}`;
    }

    // 10. Revalidate affected cache paths
    revalidatePath("/dashboard");
    if (targetGroupId) {
      revalidatePath(`/dashboard/groups`);
    }

    return {
      success: true,
      reminder: newReminder,
      whatsappLink,
      emailSent: emailResult ? emailResult.success : undefined,
      emailError: emailResult?.error,
      isSandboxRestriction: emailResult?.isSandboxRestriction,
      emailProvider: emailResult?.provider,
    };
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof ForbiddenError
    ) {
      throw error;
    }
    console.error("[createReminder CRITICAL ERROR]:", error);
    const detailMsg = error instanceof Error ? error.message : "Internal database error";
    throw new DatabaseError(`Failed to create reminder: ${detailMsg}`, { originalError: error });
  }
}

/**
 * Retrieves all reminders for current user with filtering, search, and sorting.
 */
export async function getReminders(filters: GetRemindersFilters = {}) {
  try {
    const user = await requireAuth();

    return await withDbRetry(async () => {
      const conditions = [
        eq(reminders.userId, user.id),
        filters.includeDeleted ? undefined : eq(reminders.isDeleted, false),
      ].filter(Boolean) as any[];

      if (filters.groupId) {
        const isNum = typeof filters.groupId === "number" || /^\d+$/.test(String(filters.groupId));
        if (isNum) {
          conditions.push(eq(reminders.groupId, Number(filters.groupId)));
        }
      }

      if (filters.contactId) {
        const isNum = typeof filters.contactId === "number" || /^\d+$/.test(String(filters.contactId));
        if (isNum) {
          conditions.push(eq(reminders.contactId, Number(filters.contactId)));
        }
      }

      if (filters.status) {
        conditions.push(eq(reminders.status, filters.status));
      }

      if (filters.priority) {
        conditions.push(eq(reminders.priority, filters.priority));
      }

      if (filters.isCompleted !== undefined) {
        conditions.push(eq(reminders.isCompleted, filters.isCompleted));
      }

      if (filters.isArchived !== undefined) {
        conditions.push(eq(reminders.isArchived, filters.isArchived));
      }

      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(reminders.message, term),
            ilike(reminders.title, term),
            ilike(reminders.recipientName, term)
          )
        );
      }

      const list = await db
        .select()
        .from(reminders)
        .where(and(...conditions))
        .orderBy(desc(reminders.isPinned), desc(reminders.createdAt));

      return list;
    });
  } catch (error) {
    console.error("[getReminders Error]:", error);
    throw new DatabaseError("Failed to fetch reminders", { originalError: error });
  }
}

/**
 * Updates an existing reminder.
 */
export async function updateReminder(data: UpdateReminderInput) {
  try {
    const user = await requireAuth();

    const [existing] = await withDbRetry(async () =>
      db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, data.id), eq(reminders.userId, user.id)))
        .limit(1)
    );

    if (!existing) {
      throw new NotFoundError("Reminder");
    }

    const parseDate = (d?: Date | string | null): Date | null => {
      if (!d) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const updateFields: Partial<typeof reminders.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    if (data.title !== undefined) updateFields.title = data.title.trim() || null;
    if (data.message !== undefined) {
      if (!data.message.trim()) throw new ValidationError("Message cannot be empty");
      updateFields.message = data.message.trim();
    }
    if (data.recipientName !== undefined) updateFields.recipientName = data.recipientName.trim() || null;
    if (data.recipientPhone !== undefined) updateFields.recipientPhone = data.recipientPhone.trim() || null;
    if (data.recipientEmail !== undefined) updateFields.recipientEmail = data.recipientEmail.trim() || null;
    if (data.method !== undefined) updateFields.method = data.method;
    if (data.dueDate !== undefined) updateFields.dueDate = parseDate(data.dueDate);
    if (data.reminderDate !== undefined) updateFields.reminderDate = parseDate(data.reminderDate);
    if (data.amount !== undefined) updateFields.amount = data.amount ? Math.round(data.amount * 100) : null;
    if (data.currency !== undefined) updateFields.currency = data.currency;
    if (data.priority !== undefined) updateFields.priority = data.priority;
    if (data.repeatType !== undefined) updateFields.repeatType = data.repeatType;
    if (data.repeatInterval !== undefined) updateFields.repeatInterval = data.repeatInterval;
    if (data.repeatEnd !== undefined) updateFields.repeatEnd = parseDate(data.repeatEnd);
    if (data.notificationType !== undefined) updateFields.notificationType = data.notificationType;
    if (data.status !== undefined) updateFields.status = data.status;

    const [updated] = await withDbRetry(async () =>
      db
        .update(reminders)
        .set(updateFields)
        .where(eq(reminders.id, data.id))
        .returning()
    );

    revalidatePath("/dashboard");
    return { success: true, reminder: updated };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    console.error("[updateReminder Error]:", error);
    throw new DatabaseError("Failed to update reminder", { originalError: error });
  }
}

/**
 * Toggles completion status of a reminder.
 */
export async function toggleCompleteReminder(id: number) {
  try {
    const user = await requireAuth();

    const [existing] = await withDbRetry(async () =>
      db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
        .limit(1)
    );

    if (!existing) {
      throw new NotFoundError("Reminder");
    }

    const nextCompleted = !existing.isCompleted;

    const [updated] = await withDbRetry(async () =>
      db
        .update(reminders)
        .set({
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? new Date() : null,
          status: nextCompleted ? "completed" : "pending",
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(reminders.id, id))
        .returning()
    );

    revalidatePath("/dashboard");
    return { success: true, reminder: updated };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error("[toggleCompleteReminder Error]:", error);
    throw new DatabaseError("Failed to toggle reminder completion", { originalError: error });
  }
}

/**
 * Toggles pinned status of a reminder.
 */
export async function togglePinReminder(id: number) {
  try {
    const user = await requireAuth();

    const [existing] = await withDbRetry(async () =>
      db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
        .limit(1)
    );

    if (!existing) {
      throw new NotFoundError("Reminder");
    }

    const [updated] = await withDbRetry(async () =>
      db
        .update(reminders)
        .set({
          isPinned: !existing.isPinned,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(reminders.id, id))
        .returning()
    );

    revalidatePath("/dashboard");
    return { success: true, reminder: updated };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error("[togglePinReminder Error]:", error);
    throw new DatabaseError("Failed to toggle reminder pin", { originalError: error });
  }
}

/**
 * Toggles archived status of a reminder.
 */
export async function toggleArchiveReminder(id: number) {
  try {
    const user = await requireAuth();

    const [existing] = await withDbRetry(async () =>
      db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
        .limit(1)
    );

    if (!existing) {
      throw new NotFoundError("Reminder");
    }

    const [updated] = await withDbRetry(async () =>
      db
        .update(reminders)
        .set({
          isArchived: !existing.isArchived,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(reminders.id, id))
        .returning()
    );

    revalidatePath("/dashboard");
    return { success: true, reminder: updated };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error("[toggleArchiveReminder Error]:", error);
    throw new DatabaseError("Failed to toggle reminder archive", { originalError: error });
  }
}

/**
 * Soft deletes a reminder.
 */
export async function deleteReminder(id: number) {
  try {
    const user = await requireAuth();

    const [existing] = await withDbRetry(async () =>
      db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
        .limit(1)
    );

    if (!existing) {
      throw new NotFoundError("Reminder");
    }

    await withDbRetry(async () =>
      db
        .update(reminders)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, id))
    );

    // Audit log
    try {
      await withDbRetry(async () =>
        db.insert(auditLogs).values({
          userId: user.id,
          publicId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          action: "delete",
          entityType: "reminder",
          entityId: id,
          entityPublicId: existing.publicId,
        })
      );
    } catch (_) {}

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error("[deleteReminder Error]:", error);
    throw new DatabaseError("Failed to delete reminder", { originalError: error });
  }
}

/**
 * Restores a soft-deleted reminder.
 */
export async function restoreReminder(id: number) {
  try {
    const user = await requireAuth();

    await withDbRetry(async () =>
      db
        .update(reminders)
        .set({
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
    );

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[restoreReminder Error]:", error);
    throw new DatabaseError("Failed to restore reminder", { originalError: error });
  }
}

/**
 * Duplicates a reminder.
 */
export async function duplicateReminder(id: number) {
  try {
    const user = await requireAuth();

    const [original] = await withDbRetry(async () =>
      db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
        .limit(1)
    );

    if (!original) throw new NotFoundError("Reminder");

    return await createReminder({
      title: original.title ? `${original.title} (Copy)` : undefined,
      recipientType: (original.recipientType as any) || "self",
      recipientId: original.recipientId,
      recipientName: original.recipientName || undefined,
      recipientPhone: original.recipientPhone || undefined,
      recipientEmail: original.recipientEmail || undefined,
      method: (original.method as any) || "whatsapp",
      message: original.message,
      dueDate: original.dueDate,
      reminderDate: original.reminderDate,
      amount: original.amount ? original.amount / 100 : undefined,
      currency: original.currency,
      priority: (original.priority as any) || "medium",
      repeatType: (original.repeatType as any) || "once",
      repeatInterval: original.repeatInterval || 1,
      repeatEnd: original.repeatEnd,
      notificationType: (original.notificationType as any) || "whatsapp",
      groupId: original.groupId || undefined,
      contactId: original.contactId || undefined,
      transactionId: original.transactionId || undefined,
    });
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error("[duplicateReminder Error]:", error);
    throw new DatabaseError("Failed to duplicate reminder", { originalError: error });
  }
}

/**
 * Bulk completion.
 */
export async function bulkCompleteReminders(ids: number[]) {
  try {
    const user = await requireAuth();
    if (!ids.length) return { success: true, count: 0 };

    await withDbRetry(async () =>
      db
        .update(reminders)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          status: "completed",
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(and(inArray(reminders.id, ids), eq(reminders.userId, user.id)))
    );

    revalidatePath("/dashboard");
    return { success: true, count: ids.length };
  } catch (error) {
    console.error("[bulkCompleteReminders Error]:", error);
    throw new DatabaseError("Failed to bulk complete reminders", { originalError: error });
  }
}

/**
 * Bulk deletion.
 */
export async function bulkDeleteReminders(ids: number[]) {
  try {
    const user = await requireAuth();
    if (!ids.length) return { success: true, count: 0 };

    await withDbRetry(async () =>
      db
        .update(reminders)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user.id,
          updatedAt: new Date(),
        })
        .where(and(inArray(reminders.id, ids), eq(reminders.userId, user.id)))
    );

    revalidatePath("/dashboard");
    return { success: true, count: ids.length };
  } catch (error) {
    console.error("[bulkDeleteReminders Error]:", error);
    throw new DatabaseError("Failed to bulk delete reminders", { originalError: error });
  }
}
