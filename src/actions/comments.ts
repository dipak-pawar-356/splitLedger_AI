"use server";

import { db } from "@/lib/db";
import { comments, users, transactions, settlements, groups, groupMembers } from "@/lib/db/schema/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";

async function verifyCommentTargetAccess(
  userId: number,
  target: { transactionId?: number | null; settlementId?: number | null; groupId?: number | null }
): Promise<boolean> {
  if (target.transactionId) {
    const [tx] = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        createdBy: transactions.createdBy,
        paidBy: transactions.paidBy,
        groupId: transactions.groupId,
      })
      .from(transactions)
      .where(and(eq(transactions.id, target.transactionId), eq(transactions.isDeleted, false)))
      .limit(1);

    if (!tx) return false;
    if (tx.userId === userId || tx.createdBy === userId || tx.paidBy === userId) return true;
    if (tx.groupId) {
      const [membership] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(
          and(
            eq(groups.id, tx.groupId),
            or(
              eq(groups.createdBy, userId),
              sql`${groups.id} IN (SELECT group_id FROM group_members WHERE user_id = ${userId})`
            )
          )
        )
        .limit(1);
      return !!membership;
    }
    return false;
  }

  if (target.settlementId) {
    const [st] = await db
      .select({
        id: settlements.id,
        fromUserId: settlements.fromUserId,
        toUserId: settlements.toUserId,
        groupId: settlements.groupId,
      })
      .from(settlements)
      .where(and(eq(settlements.id, target.settlementId), eq(settlements.isDeleted, false)))
      .limit(1);

    if (!st) return false;
    if (st.fromUserId === userId || st.toUserId === userId) return true;
    if (st.groupId) {
      const [membership] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(
          and(
            eq(groups.id, st.groupId),
            or(
              eq(groups.createdBy, userId),
              sql`${groups.id} IN (SELECT group_id FROM group_members WHERE user_id = ${userId})`
            )
          )
        )
        .limit(1);
      return !!membership;
    }
    return false;
  }

  if (target.groupId) {
    const [membership] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(
        and(
          eq(groups.id, target.groupId),
          or(
            eq(groups.createdBy, userId),
            sql`${groups.id} IN (SELECT group_id FROM group_members WHERE user_id = ${userId})`
          )
        )
      )
      .limit(1);
    return !!membership;
  }

  return false;
}

export async function createComment(data: {
  transactionId?: number;
  settlementId?: number;
  groupId?: number;
  parentId?: number;
  content: string;
  mentions?: string;
  attachments?: any;
  reactions?: any;
}) {
  try {
    const user = await requireAuth();
    assertRateLimit(`comment:create:${user.id}`, RATE_LIMITS.actions.write);

    if (!data.content || data.content.trim().length === 0) {
      throw new ValidationError("Comment content is required");
    }

    if (!data.transactionId && !data.settlementId && !data.groupId) {
      throw new ValidationError("Comment must be associated with a transaction, settlement, or group");
    }

    const hasAccess = await verifyCommentTargetAccess(user.id, data);
    if (!hasAccess) {
      throw new AuthorizationError("You do not have permission to comment on this item.");
    }

    const cleanContent = sanitizeText(data.content.trim());
    const cleanMentions = data.mentions ? sanitizeText(data.mentions.trim()) : null;

    const [comment] = await db
      .insert(comments)
      .values({
        userId: user.id,
        transactionId: data.transactionId || null,
        settlementId: data.settlementId || null,
        groupId: data.groupId || null,
        parentId: data.parentId || null,
        content: cleanContent,
        mentions: cleanMentions,
        attachments: data.attachments || null,
        reactions: data.reactions || null,
      })
      .returning();

    // Revalidate paths
    if (data.transactionId) {
      revalidatePath(`/dashboard/transactions/${data.transactionId}`);
    }
    if (data.settlementId) {
      revalidatePath(`/dashboard/settlements/${data.settlementId}`);
    }
    if (data.groupId) {
      revalidatePath(`/dashboard/groups/${data.groupId}`);
    }

    return comment;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create comment", { originalError: error });
  }
}

export async function updateComment(commentId: number, data: {
  content?: string;
  mentions?: string;
  attachments?: any;
  reactions?: any;
}) {
  try {
    const user = await requireAuth();
    assertRateLimit(`comment:update:${user.id}`, RATE_LIMITS.actions.write);

    // Get existing comment
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.userId, user.id)))
      .limit(1);

    if (!existingComment) {
      throw new NotFoundError("Comment");
    }

    // Check if user is the comment author
    if (existingComment.userId !== user.id) {
      throw new AuthorizationError("You can only edit your own comments");
    }

    const cleanContent = data.content !== undefined ? sanitizeText(data.content.trim()) : undefined;
    const cleanMentions = data.mentions !== undefined ? sanitizeText(data.mentions.trim()) : undefined;

    const [updatedComment] = await db
      .update(comments)
      .set({
        ...(cleanContent !== undefined && { content: cleanContent }),
        ...(cleanMentions !== undefined && { mentions: cleanMentions }),
        ...(data.attachments !== undefined && { attachments: data.attachments }),
        ...(data.reactions !== undefined && { reactions: data.reactions }),
        updatedAt: new Date(),
      })
      .where(and(eq(comments.id, commentId), eq(comments.userId, user.id)))
      .returning();

    // Revalidate paths
    if (existingComment.transactionId) {
      revalidatePath(`/dashboard/transactions/${existingComment.transactionId}`);
    }
    if (existingComment.settlementId) {
      revalidatePath(`/dashboard/settlements/${existingComment.settlementId}`);
    }
    if (existingComment.groupId) {
      revalidatePath(`/dashboard/groups/${existingComment.groupId}`);
    }

    return updatedComment;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update comment", { originalError: error });
  }
}

export async function deleteComment(commentId: number) {
  try {
    const user = await requireAuth();
    assertRateLimit(`comment:delete:${user.id}`, RATE_LIMITS.actions.delete);

    // Get existing comment
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.userId, user.id)))
      .limit(1);

    if (!existingComment) {
      throw new NotFoundError("Comment");
    }

    // Check if user is the comment author
    if (existingComment.userId !== user.id) {
      throw new AuthorizationError("You can only delete your own comments");
    }

    await db.delete(comments).where(and(eq(comments.id, commentId), eq(comments.userId, user.id)));

    // Revalidate paths
    if (existingComment.transactionId) {
      revalidatePath(`/dashboard/transactions/${existingComment.transactionId}`);
    }
    if (existingComment.settlementId) {
      revalidatePath(`/dashboard/settlements/${existingComment.settlementId}`);
    }
    if (existingComment.groupId) {
      revalidatePath(`/dashboard/groups/${existingComment.groupId}`);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to delete comment", { originalError: error });
  }
}

export async function getComments(data: {
  transactionId?: number;
  settlementId?: number;
  groupId?: number;
}) {
  try {
    const user = await requireAuth();

    if (!data.transactionId && !data.settlementId && !data.groupId) {
      throw new ValidationError("Must specify a transaction, settlement, or group to fetch comments");
    }

    const hasAccess = await verifyCommentTargetAccess(user.id, data);
    if (!hasAccess) {
      throw new AuthorizationError("You do not have permission to view these comments.");
    }

    const whereClause = data.transactionId
      ? eq(comments.transactionId, data.transactionId)
      : data.settlementId
      ? eq(comments.settlementId, data.settlementId)
      : data.groupId
      ? eq(comments.groupId, data.groupId)
      : undefined;

    const commentsList = await db
      .select({
        id: comments.id,
        content: comments.content,
        mentions: comments.mentions,
        attachments: comments.attachments,
        reactions: comments.reactions,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        parentId: comments.parentId,
        userId: comments.userId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(whereClause)
      .orderBy(desc(comments.createdAt));

    return commentsList;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch comments", { originalError: error });
  }
}

export async function addReaction(commentId: number, reaction: string) {
  try {
    const user = await requireAuth();
    assertRateLimit(`comment:react:${user.id}`, RATE_LIMITS.actions.default);

    const safeReaction = sanitizeText(reaction).slice(0, 32);
    if (!safeReaction) {
      throw new ValidationError("Invalid reaction");
    }

    // Get existing comment
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) {
      throw new NotFoundError("Comment");
    }

    const hasAccess = await verifyCommentTargetAccess(user.id, existingComment);
    if (!hasAccess) {
      throw new AuthorizationError("You do not have permission to react to this comment.");
    }

    // Parse existing reactions
    let reactions: Record<string, number[]> = (existingComment.reactions as Record<string, number[]>) || {};
    if (typeof reactions === "string") {
      try {
        reactions = JSON.parse(reactions);
      } catch {
        reactions = {};
      }
    }

    // Add or remove reaction
    if (reactions[reaction] && Array.isArray(reactions[reaction]) && reactions[reaction].includes(user.id)) {
      // Remove reaction
      reactions[reaction] = reactions[reaction].filter((id: number) => id !== user.id);
      if (reactions[reaction].length === 0) {
        delete reactions[reaction];
      }
    } else {
      // Add reaction
      if (!reactions[reaction] || !Array.isArray(reactions[reaction])) {
        reactions[reaction] = [];
      }
      reactions[reaction].push(user.id);
    }

    const [updatedComment] = await db
      .update(comments)
      .set({
        reactions: reactions,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning();

    // Revalidate paths
    if (existingComment.transactionId) {
      revalidatePath(`/dashboard/transactions/${existingComment.transactionId}`);
    }
    if (existingComment.settlementId) {
      revalidatePath(`/dashboard/settlements/${existingComment.settlementId}`);
    }
    if (existingComment.groupId) {
      revalidatePath(`/dashboard/groups/${existingComment.groupId}`);
    }

    return updatedComment;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to add reaction", { originalError: error });
  }
}
