"use server";

import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from "@/lib/errors";

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

    if (!data.content || data.content.trim().length === 0) {
      throw new ValidationError("Comment content is required");
    }

    if (!data.transactionId && !data.settlementId && !data.groupId) {
      throw new ValidationError("Comment must be associated with a transaction, settlement, or group");
    }

    const [comment] = await db
      .insert(comments)
      .values({
        userId: user.id,
        transactionId: data.transactionId || null,
        settlementId: data.settlementId || null,
        groupId: data.groupId || null,
        parentId: data.parentId || null,
        content: data.content,
        mentions: data.mentions || null,
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
    if (error instanceof ValidationError) {
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

    // Get existing comment
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) {
      throw new NotFoundError("Comment");
    }

    // Check if user is the comment author
    if (existingComment.userId !== user.id) {
      throw new AuthorizationError("You can only edit your own comments");
    }

    const [updatedComment] = await db
      .update(comments)
      .set({
        ...(data.content && { content: data.content }),
        ...(data.mentions !== undefined && { mentions: data.mentions }),
        ...(data.attachments !== undefined && { attachments: data.attachments }),
        ...(data.reactions !== undefined && { reactions: data.reactions }),
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
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update comment", { originalError: error });
  }
}

export async function deleteComment(commentId: number) {
  try {
    const user = await requireAuth();

    // Get existing comment
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) {
      throw new NotFoundError("Comment");
    }

    // Check if user is the comment author
    if (existingComment.userId !== user.id) {
      throw new AuthorizationError("You can only delete your own comments");
    }

    await db.delete(comments).where(eq(comments.id, commentId));

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
    throw new DatabaseError("Failed to fetch comments", { originalError: error });
  }
}

export async function addReaction(commentId: number, reaction: string) {
  try {
    const user = await requireAuth();

    // Get existing comment
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) {
      throw new NotFoundError("Comment");
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
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to add reaction", { originalError: error });
  }
}
