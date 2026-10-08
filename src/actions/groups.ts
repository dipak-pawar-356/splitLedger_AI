"use server";

import { db } from "@/lib/db";
import { groups, groupMembers, transactions, settlements, expenseSplits, users, contacts, auditLogs } from "@/lib/db/schema/schema";
import { eq, and, sql, desc, or, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { generateGroupId, formatCurrency, isDbIntegerId } from "@/lib/utils";

function buildGroupIdentifierCondition(idOrPublicId: string | number) {
  const strId = String(idOrPublicId).trim();
  const isDbId = isDbIntegerId(idOrPublicId);
  return isDbId
    ? or(eq(groups.publicId, strId), eq(groups.id, Number(strId)), eq(groups.legacyPublicId, strId))
    : or(eq(groups.publicId, strId), eq(groups.legacyPublicId, strId));
}

export type GroupCategory = "trip" | "friends" | "family" | "couples" | "office" | "event" | "shared_bills";
export type GroupSplitMethod = "equal" | "exact" | "percentage" | "shares";

export interface CreateGroupInput {
  name: string;
  description?: string;
  type?: GroupCategory;
  currency?: string;
  splitMethod?: GroupSplitMethod;
  coverImage?: string;
  notes?: string;
}

export async function createGroup(data: CreateGroupInput) {
  try {
    const user = await requireAuth();

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Group name is required");
    }

    const trimmedName = data.name.trim();

    // Check for duplicate group name (case-insensitive) for the same owner, excluding deleted groups
    const existingGroups = await db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(
        and(
          eq(groups.createdBy, user.id),
          eq(groups.isDeleted, false)
        )
      );

    const duplicateGroup = existingGroups.find(
      (g) => g.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateGroup) {
      throw new ValidationError(`Group "${trimmedName}" already exists in your account. Please choose another name.`);
    }

    const publicId = generateGroupId();

    const [group] = await db
      .insert(groups)
      .values({
        publicId,
        createdBy: user.id,
        name: trimmedName,
        description: data.description?.trim() || null,
        type: data.type || "friends",
        currency: data.currency || "INR",
        splitMethod: data.splitMethod || "equal",
        coverImage: data.coverImage?.trim() || null,
        isActive: true,
      })
      .returning();

    // Add creator as admin/owner member
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: user.id,
      isAdmin: true,
      isGuest: false,
      joinedAt: new Date(),
    });

    // Record audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "create",
      entityType: "group",
      entityId: group.id,
      changes: {
        name: group.name,
        type: group.type,
        currency: "INR",
        publicId: group.publicId,
      },
    });

    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard");
    return group;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create group", { originalError: error });
  }
}

export async function updateGroup(
  publicIdOrId: string | number,
  data: {
    name?: string;
    description?: string;
    type?: GroupCategory;
    currency?: string;
    splitMethod?: GroupSplitMethod;
    coverImage?: string;
  }
) {
  try {
    const user = await requireAuth();

    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupIdentifierCondition(publicIdOrId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingGroup) {
      throw new NotFoundError("Group");
    }

    // Check if user is owner or admin
    if (existingGroup.createdBy !== user.id) {
      const [adminMember] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, existingGroup.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!adminMember) {
        throw new AuthorizationError("Only group admins or owners can update group settings");
      }
    }

    // If updating name, check for duplicate name for same owner
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName.length === 0) {
        throw new ValidationError("Group name cannot be empty");
      }

      const duplicateCheck = await db
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .where(
          and(
            eq(groups.createdBy, existingGroup.createdBy),
            eq(groups.isDeleted, false)
          )
        );

      const isDuplicate = duplicateCheck.some(
        (g) => g.id !== existingGroup.id && g.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (isDuplicate) {
        throw new ValidationError(`Another group named "${trimmedName}" already exists in your account.`);
      }
    }

    const [updatedGroup] = await db
      .update(groups)
      .set({
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.type && { type: data.type }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.splitMethod && { splitMethod: data.splitMethod }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage?.trim() || null }),
        updatedAt: new Date(),
      })
      .where(eq(groups.id, existingGroup.id))
      .returning();

    // Record audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      entityType: "group",
      entityId: existingGroup.id,
      changes: {
        name: updatedGroup.name,
        description: updatedGroup.description,
        type: updatedGroup.type,
      },
    });

    revalidatePath("/dashboard/groups");
    revalidatePath(`/dashboard/groups/${existingGroup.publicId}`);
    revalidatePath(`/dashboard/groups/${existingGroup.id}`);
    return updatedGroup;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to update group", { originalError: error });
  }
}

export async function archiveGroup(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupIdentifierCondition(publicIdOrId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingGroup) {
      throw new NotFoundError("Group");
    }

    // Verify owner or admin
    if (existingGroup.createdBy !== user.id) {
      const [adminMember] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, existingGroup.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!adminMember) {
        throw new AuthorizationError("Only group admins or owners can archive this group");
      }
    }

    const [archived] = await db
      .update(groups)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, existingGroup.id))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      entityType: "group",
      entityId: existingGroup.id,
      changes: { isActive: false, archived: true },
    });

    revalidatePath("/dashboard/groups");
    revalidatePath(`/dashboard/groups/${existingGroup.publicId}`);
    return archived;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to archive group", { originalError: error });
  }
}

export async function restoreGroup(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupIdentifierCondition(publicIdOrId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingGroup) {
      throw new NotFoundError("Group");
    }

    if (existingGroup.createdBy !== user.id) {
      const [adminMember] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, existingGroup.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!adminMember) {
        throw new AuthorizationError("Only group admins or owners can restore this group");
      }
    }

    const [restored] = await db
      .update(groups)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, existingGroup.id))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      entityType: "group",
      entityId: existingGroup.id,
      changes: { isActive: true, restored: true },
    });

    revalidatePath("/dashboard/groups");
    revalidatePath(`/dashboard/groups/${existingGroup.publicId}`);
    return restored;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to restore group", { originalError: error });
  }
}

export async function deleteGroup(publicIdOrId: string | number, confirmationName?: string) {
  try {
    const user = await requireAuth();

    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupIdentifierCondition(publicIdOrId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingGroup) {
      throw new NotFoundError("Group");
    }

    // Only owner can delete group
    if (existingGroup.createdBy !== user.id) {
      throw new AuthorizationError("Only the group owner can delete this group");
    }

    if (confirmationName !== undefined && confirmationName.trim() !== existingGroup.name.trim()) {
      throw new ValidationError("Confirmation group name does not match.");
    }

    // Soft delete the group
    await db
      .update(groups)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, existingGroup.id));

    // Also soft delete transactions belonging to group
    await db
      .update(transactions)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(transactions.groupId, existingGroup.id));

    // Also soft delete settlements belonging to group
    await db
      .update(settlements)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(settlements.groupId, existingGroup.id));

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "delete",
      entityType: "group",
      entityId: existingGroup.id,
      changes: {
        deleted: true,
        deletedAt: new Date(),
        groupName: existingGroup.name,
      },
    });

    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to delete group", { originalError: error });
  }
}

export async function leaveGroup(publicIdOrId: string | number) {
  try {
    const user = await requireAuth();

    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupIdentifierCondition(publicIdOrId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingGroup) {
      throw new NotFoundError("Group");
    }

    if (existingGroup.createdBy === user.id) {
      throw new ValidationError("You are the owner of this group. You must transfer ownership to another member before leaving, or delete the group.");
    }

    // Check if user has unsettled balance in the group
    const pendingDebts = await db
      .select({ amount: settlements.amount })
      .from(settlements)
      .where(
        and(
          eq(settlements.groupId, existingGroup.id),
          or(eq(settlements.fromUserId, user.id), eq(settlements.toUserId, user.id)),
          eq(settlements.status, "pending"),
          eq(settlements.isDeleted, false)
        )
      );

    const totalUnsettled = pendingDebts.reduce((sum, d) => sum + d.amount, 0);
    if (totalUnsettled > 0) {
      throw new ValidationError(`You cannot leave the group with unsettled debts or pending settlements (${formatCurrency(totalUnsettled / 100)}). Please settle first.`);
    }

    // Remove member
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, existingGroup.id),
          eq(groupMembers.userId, user.id)
        )
      );

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      entityType: "group",
      entityId: existingGroup.id,
      changes: {
        action: "leave_group",
        userId: user.id,
        userName: user.name,
      },
    });

    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to leave group", { originalError: error });
  }
}

export async function transferGroupOwnership(publicIdOrId: string | number, newOwnerUserId: number) {
  try {
    const user = await requireAuth();

    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupIdentifierCondition(publicIdOrId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingGroup) {
      throw new NotFoundError("Group");
    }

    if (existingGroup.createdBy !== user.id) {
      throw new AuthorizationError("Only the current group owner can transfer ownership");
    }

    if (newOwnerUserId === user.id) {
      throw new ValidationError("You are already the owner of this group");
    }

    // Verify target user is a member of the group
    const [targetMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, existingGroup.id),
          eq(groupMembers.userId, newOwnerUserId)
        )
      )
      .limit(1);

    if (!targetMember) {
      throw new ValidationError("Target user must be a member of the group to receive ownership");
    }

    // Update group createdBy
    await db
      .update(groups)
      .set({
        createdBy: newOwnerUserId,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, existingGroup.id));

    // Ensure new owner has admin status
    await db
      .update(groupMembers)
      .set({ isAdmin: true })
      .where(
        and(
          eq(groupMembers.groupId, existingGroup.id),
          eq(groupMembers.userId, newOwnerUserId)
        )
      );

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "update",
      entityType: "group",
      entityId: existingGroup.id,
      changes: {
        action: "transfer_ownership",
        previousOwnerId: user.id,
        newOwnerId: newOwnerUserId,
      },
    });

    revalidatePath("/dashboard/groups");
    revalidatePath(`/dashboard/groups/${existingGroup.publicId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to transfer ownership", { originalError: error });
  }
}

export async function getGroup(idOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupIdentifierCondition(idOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Verify user is creator or member
    if (group.createdBy !== user.id) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new AuthorizationError("You do not have access to this group");
      }
    }

    return group;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch group", { originalError: error });
  }
}

export async function getGroups(options?: { status?: "active" | "archived" | "all" }) {
  try {
    const user = await requireAuth();
    const status = options?.status || "all";

    const conditions = [
      sql`${groups.id} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`,
      eq(groups.isDeleted, false),
    ];

    if (status === "active") {
      conditions.push(eq(groups.isActive, true));
    } else if (status === "archived") {
      conditions.push(eq(groups.isActive, false));
    }

    const groupsList = await db
      .select()
      .from(groups)
      .where(and(...conditions))
      .orderBy(desc(groups.createdAt));

    return groupsList;
  } catch (error) {
    throw new DatabaseError("Failed to fetch groups", { originalError: error });
  }
}
