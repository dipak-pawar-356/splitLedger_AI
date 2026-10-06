"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, groups, settlements, auditLogs, profiles, transactions } from "@/lib/db/schema/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { createTransaction } from "@/actions/transactions";
import { createGroup } from "@/actions/groups";
import { createBudget } from "@/actions/budgets";
import { ParsedVoiceCommand } from "@/lib/ai/voice-parser";
import { formatCurrency, generatePublicId } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export interface VoiceCommandExecutionResult {
  success: boolean;
  action: string;
  message: string;
  entityType?: "transaction" | "group" | "budget" | "query";
  entityUrl?: string;
  details?: any;
}

export interface VoiceRecordingRecord {
  id: string;
  durationSeconds: number;
  language: string;
  createdAt: string;
  sizeBytes: number;
  linkedCommand?: string;
  transcript: string;
  userId: number;
  audioDataUri?: string; // Persistent base64 data URI so it remains playable forever
  checksum: string;
  status: "completed" | "archived";
}

/**
 * Execute recognized voice or text command into live database with audit logging
 */
export async function executeVoiceCommand(
  cmd: ParsedVoiceCommand
): Promise<VoiceCommandExecutionResult> {
  try {
    const user = await requireAuth();

    // 1. ADD EXPENSE
    if (cmd.action === "add_expense" && cmd.parameters.amount) {
      let categoryId: number | null = null;
      if (cmd.parameters.category) {
        const [matchedCat] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.name, cmd.parameters.category))
          .limit(1);
        if (matchedCat) categoryId = matchedCat.id;
      }

      const txResult = await createTransaction({
        title: cmd.parameters.title || `${cmd.parameters.category || "General"} Expense`,
        description: `Voice/Text Command: ${cmd.rawTranscript}`,
        type: "paid",
        amount: cmd.parameters.amount,
        categoryId,
        currency: "INR",
        paymentMethod: "UPI",
        notes: `Automatically recorded via AI Multilingual Command Console`,
      });

      // Write to immutable audit log
      try {
        await db.insert(auditLogs).values({
          publicId: generatePublicId("aud"),
          userId: user.id,
          action: "voice_expense_logged",
          entityType: "transaction",
          entityId: txResult.id || 0,
          changes: {
            amount: cmd.parameters.amount,
            category: cmd.parameters.category,
            confidence: cmd.confidence,
            confidenceBreakdown: cmd.confidenceBreakdown,
          },
          status: "success",
          device: "Voice & Text Console",
          reason: cmd.feedbackMessage,
        });
      } catch {}

      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/ai");

      return {
        success: true,
        action: "add_expense",
        message: `Successfully logged ₹${cmd.parameters.amount} for "${cmd.parameters.category || "General"}" to your ledger!`,
        entityType: "transaction",
        entityUrl: `/dashboard/transactions/${txResult.publicId}`,
        details: txResult,
      };
    }

    // 2. RECORD INCOME
    if (cmd.action === "record_income" && cmd.parameters.amount) {
      const txResult = await createTransaction({
        title: cmd.parameters.title || "Income Credit",
        description: `Voice/Text Command: ${cmd.rawTranscript}`,
        type: "received",
        amount: cmd.parameters.amount,
        currency: "INR",
        paymentMethod: "Bank Transfer",
        notes: `Automatically recorded via AI Multilingual Command Console`,
      });

      try {
        await db.insert(auditLogs).values({
          publicId: generatePublicId("aud"),
          userId: user.id,
          action: "voice_income_logged",
          entityType: "transaction",
          entityId: txResult.id || 0,
          changes: {
            amount: cmd.parameters.amount,
            confidence: cmd.confidence,
          },
          status: "success",
          device: "Voice & Text Console",
          reason: cmd.feedbackMessage,
        });
      } catch {}

      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/ai");

      return {
        success: true,
        action: "record_income",
        message: `Successfully recorded income inflow of ₹${cmd.parameters.amount} to your account!`,
        entityType: "transaction",
        entityUrl: `/dashboard/transactions/${txResult.publicId}`,
        details: txResult,
      };
    }

    // 3. CREATE TRIP
    if (cmd.action === "create_trip") {
      const tripName = cmd.parameters.tripName || cmd.parameters.groupName || "Vacation Trip";
      const newGroup = await createGroup({
        name: tripName,
        type: "trip",
        currency: "INR",
        notes: `Vacation trip group created via AI Voice & Text Console`,
      });

      if (cmd.parameters.budgetAmount) {
        try {
          await createBudget({
            name: `${tripName} Budget`,
            category: "Travel & Trips",
            allocatedAmount: cmd.parameters.budgetAmount,
            period: "one_time",
            currency: "INR",
            groupId: newGroup.id,
          });
        } catch {}
      }

      try {
        await db.insert(auditLogs).values({
          publicId: generatePublicId("aud"),
          userId: user.id,
          action: "voice_trip_created",
          entityType: "group",
          entityId: newGroup.id || 0,
          changes: {
            tripName,
            budget: cmd.parameters.budgetAmount,
          },
          status: "success",
          device: "Voice & Text Console",
        });
      } catch {}

      revalidatePath("/dashboard/groups");
      revalidatePath("/dashboard/trips");
      revalidatePath("/dashboard/ai");

      return {
        success: true,
        action: "create_trip",
        message: `Vacation Trip group "${tripName}" has been created!${cmd.parameters.budgetAmount ? ` Budget target set to ₹${cmd.parameters.budgetAmount}.` : ""}`,
        entityType: "group",
        entityUrl: `/dashboard/groups/${newGroup.publicId}`,
        details: newGroup,
      };
    }

    // 4. CREATE GROUP
    if (cmd.action === "create_group") {
      const groupName = cmd.parameters.groupName || "New Split Group";
      const newGroup = await createGroup({
        name: groupName,
        type: "friends",
        currency: "INR",
        notes: `Created via AI Voice & Text Console`,
      });

      revalidatePath("/dashboard/groups");
      revalidatePath("/dashboard/ai");

      return {
        success: true,
        action: "create_group",
        message: `Split Group "${groupName}" created successfully!`,
        entityType: "group",
        entityUrl: `/dashboard/groups/${newGroup.publicId}`,
        details: newGroup,
      };
    }

    // 5. SET BUDGET
    if (cmd.action === "set_budget" && cmd.parameters.budgetAmount) {
      const budgetCategory = cmd.parameters.category || "General Spending";
      const newBudget = await createBudget({
        name: `${budgetCategory} Budget`,
        category: budgetCategory,
        allocatedAmount: cmd.parameters.budgetAmount,
        period: "monthly",
        currency: "INR",
      });

      revalidatePath("/dashboard/budgets");
      revalidatePath("/dashboard/ai");

      return {
        success: true,
        action: "set_budget",
        message: `Monthly budget of ₹${cmd.parameters.budgetAmount} for "${budgetCategory}" has been activated!`,
        entityType: "budget",
        entityUrl: `/dashboard/budgets`,
        details: newBudget,
      };
    }

    // 6. SHOW BALANCE
    if (cmd.action === "show_balance") {
      const [userSettlements] = await Promise.all([
        db
          .select({
            amount: settlements.amount,
            fromUserId: settlements.fromUserId,
            toUserId: settlements.toUserId,
            status: settlements.status,
          })
          .from(settlements)
          .where(
            and(
              eq(settlements.isDeleted, false),
              eq(settlements.status, "pending"),
              or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id))
            )
          ),
      ]);

      const receivables = userSettlements
        .filter((s) => s.toUserId === user.id)
        .reduce((sum, s) => sum + s.amount / 100, 0);

      const payables = userSettlements
        .filter((s) => s.fromUserId === user.id)
        .reduce((sum, s) => sum + s.amount / 100, 0);

      const net = receivables - payables;

      return {
        success: true,
        action: "show_balance",
        message: `Your current net balance is ${net >= 0 ? "+" : ""}${formatCurrency(net, "INR")} (Receivables: ${formatCurrency(receivables, "INR")}, Payables: ${formatCurrency(payables, "INR")}).`,
        entityType: "query",
        entityUrl: "/dashboard/settlements",
        details: { receivables, payables, net },
      };
    }

    // 7. WHO OWES ME
    if (cmd.action === "who_owes_me") {
      const pendingOwed = await db
        .select({
          amount: settlements.amount,
          groupName: groups.name,
        })
        .from(settlements)
        .leftJoin(groups, eq(settlements.groupId, groups.id))
        .where(
          and(
            eq(settlements.isDeleted, false),
            eq(settlements.status, "pending"),
            eq(settlements.toUserId, user.id)
          )
        );

      const totalOwed = pendingOwed.reduce((sum, s) => sum + s.amount / 100, 0);

      return {
        success: true,
        action: "who_owes_me",
        message: totalOwed > 0
          ? `You have a total of ${formatCurrency(totalOwed, "INR")} pending to be collected across ${pendingOwed.length} group settlements.`
          : `Great news! You have zero outstanding receivables across all groups.`,
        entityType: "query",
        entityUrl: "/dashboard/settlements",
        details: { totalOwed, count: pendingOwed.length },
      };
    }

    // 8. GENERATE REPORT
    if (cmd.action === "generate_report") {
      return {
        success: true,
        action: "generate_report",
        message: `Navigating to reports generator to export your ledger summary.`,
        entityType: "query",
        entityUrl: "/dashboard/reports",
      };
    }

    // 9. DELETE LAST EXPENSE
    if (cmd.action === "delete_last_expense") {
      const [latestTx] = await db
        .select({
          id: transactions.id,
          title: transactions.title,
          amount: transactions.amount,
          publicId: transactions.publicId,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.isDeleted, false)))
        .orderBy(sql`${transactions.createdAt} DESC`)
        .limit(1);

      if (!latestTx) {
        return {
          success: false,
          action: "delete_last_expense",
          message: "No active transactions found to delete.",
        };
      }

      await db
        .update(transactions)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(transactions.id, latestTx.id));

      try {
        await db.insert(auditLogs).values({
          publicId: generatePublicId("aud"),
          userId: user.id,
          action: "voice_expense_deleted",
          entityType: "transaction",
          entityId: latestTx.id,
          changes: { deletedTransaction: latestTx },
          status: "success",
          device: "Voice & Text Console",
          reason: "User command: Delete last expense",
        });
      } catch {}

      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/ai");
      revalidatePath("/dashboard");

      return {
        success: true,
        action: "delete_last_expense",
        message: `Successfully deleted recent expense "${latestTx.title}" (${formatCurrency(latestTx.amount / 100, "INR")}) from your ledger.`,
        entityType: "transaction",
        entityUrl: "/dashboard/transactions",
        details: latestTx,
      };
    }

    // 10. UNDO PREVIOUS ACTION
    if (cmd.action === "undo_previous") {
      const [latestAudit] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, user.id))
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(1);

      if (latestAudit && latestAudit.action === "voice_expense_logged" && latestAudit.entityId) {
        await db
          .update(transactions)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(eq(transactions.id, latestAudit.entityId));

        revalidatePath("/dashboard/transactions");
        revalidatePath("/dashboard/ai");

        return {
          success: true,
          action: "undo_previous",
          message: `Successfully reverted previously recorded expense #${latestAudit.entityId}.`,
          entityType: "transaction",
          entityUrl: "/dashboard/transactions",
        };
      } else if (latestAudit && latestAudit.action === "voice_expense_deleted" && latestAudit.entityId) {
        await db
          .update(transactions)
          .set({ isDeleted: false, updatedAt: new Date() })
          .where(eq(transactions.id, latestAudit.entityId));

        revalidatePath("/dashboard/transactions");
        revalidatePath("/dashboard/ai");

        return {
          success: true,
          action: "undo_previous",
          message: `Successfully restored deleted expense #${latestAudit.entityId}.`,
          entityType: "transaction",
          entityUrl: "/dashboard/transactions",
        };
      }

      return {
        success: true,
        action: "undo_previous",
        message: "No reversible recent actions found in your audit history.",
      };
    }

    // 11. TODAY'S EXPENSES QUERY
    if (cmd.action === "today_expenses") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayTxList = await db
        .select({
          amount: transactions.amount,
          type: transactions.type,
          title: transactions.title,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.createdAt} >= ${startOfDay}`
          )
        );

      const todaySpentPaise = todayTxList
        .filter((t) => t.type === "paid")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalRupees = todaySpentPaise / 100;

      return {
        success: true,
        action: "today_expenses",
        message: `Today's total spending: ${formatCurrency(totalRupees, "INR")} across ${todayTxList.length} recorded items.`,
        entityType: "query",
        entityUrl: "/dashboard/transactions",
        details: { totalRupees, count: todayTxList.length },
      };
    }

    // 12. SEARCH EXPENSES
    if (cmd.action === "search_expenses") {
      const term = cmd.parameters.searchTerm || "";
      return {
        success: true,
        action: "search_expenses",
        message: `Searching your transactions for "${term}".`,
        entityType: "query",
        entityUrl: `/dashboard/transactions?search=${encodeURIComponent(term)}`,
      };
    }

    // 13. OPEN REPORTS
    if (cmd.action === "open_reports") {
      return {
        success: true,
        action: "open_reports",
        message: "Opening Reports & Analytics.",
        entityType: "query",
        entityUrl: "/dashboard/reports",
      };
    }

    // 14. SHOW BUDGETS
    if (cmd.action === "show_budgets") {
      return {
        success: true,
        action: "show_budgets",
        message: "Opening Budgets overview.",
        entityType: "query",
        entityUrl: "/dashboard/budgets",
      };
    }

    // 15. OPEN NOTES
    if (cmd.action === "open_notes") {
      return {
        success: true,
        action: "open_notes",
        message: "Opening Notes & Financial Journal.",
        entityType: "query",
        entityUrl: "/dashboard/notes",
      };
    }

    return {
      success: false,
      action: cmd.action,
      message: cmd.feedbackMessage || "Could not execute command.",
    };
  } catch (error: any) {
    console.error("Voice Command Execution Error:", error);
    return {
      success: false,
      action: cmd.action,
      message: error?.message || "Failed to execute command in database.",
    };
  }
}

/**
 * Save voice recording metadata and audio data in user's profile preferences
 * Ensures the recording remains playable forever
 */
export async function saveVoiceRecording(recording: Omit<VoiceRecordingRecord, "userId">): Promise<{ success: boolean; id: string }> {
  try {
    const user = await requireAuth();

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const currentPrefs = (userProfile?.preferences as any) || {};
    const existingRecordings: VoiceRecordingRecord[] = currentPrefs.voiceRecordings || [];

    const newRecord: VoiceRecordingRecord = {
      ...recording,
      userId: user.id,
    };

    // Keep up to 20 recent recordings to avoid payload bloat
    const updatedRecordings = [newRecord, ...existingRecordings].slice(0, 20);

    await db
      .update(profiles)
      .set({
        preferences: {
          ...currentPrefs,
          voiceRecordings: updatedRecordings,
        },
      })
      .where(eq(profiles.userId, user.id));

    return { success: true, id: newRecord.id };
  } catch (err: any) {
    console.error("Error saving voice recording:", err);
    return { success: false, id: recording.id };
  }
}

/**
 * Fetch saved voice recordings for active user
 */
export async function getVoiceRecordings(): Promise<VoiceRecordingRecord[]> {
  try {
    const user = await requireAuth();

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const currentPrefs = (userProfile?.preferences as any) || {};
    return currentPrefs.voiceRecordings || [];
  } catch (err) {
    console.error("Error fetching voice recordings:", err);
    return [];
  }
}

/**
 * Delete a voice recording from user's storage
 */
export async function deleteVoiceRecording(recordingId: string): Promise<{ success: boolean }> {
  try {
    const user = await requireAuth();

    const [userProfile] = await db
      .select({ preferences: profiles.preferences })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const currentPrefs = (userProfile?.preferences as any) || {};
    const existingRecordings: VoiceRecordingRecord[] = currentPrefs.voiceRecordings || [];
    const filtered = existingRecordings.filter((r) => r.id !== recordingId);

    await db
      .update(profiles)
      .set({
        preferences: {
          ...currentPrefs,
          voiceRecordings: filtered,
        },
      })
      .where(eq(profiles.userId, user.id));

    return { success: true };
  } catch (err) {
    console.error("Error deleting voice recording:", err);
    return { success: false };
  }
}
