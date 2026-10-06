"use server";

import { db } from "@/lib/db";
import { groupMembers, contacts, users, groups, settlements, auditLogs } from "@/lib/db/schema/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, AuthorizationError, ConflictError, DatabaseError } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";

export async function addGroupMember(data: {
  groupId: number | string;
  userId?: number;
  contactId?: number;
  isAdmin?: boolean;
  isGuest?: boolean;
  nickname?: string;
}) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof data.groupId === "number" || /^\d+$/.test(String(data.groupId));
    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          isNumeric ? eq(groups.id, Number(data.groupId)) : eq(groups.publicId, String(data.groupId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    if (!data.userId && !data.contactId) {
      throw new ValidationError("Either userId or contactId must be provided");
    }

    // Verify caller is admin/owner of the group
    if (group.createdBy !== user.id) {
      const [callerMembership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!callerMembership) {
        throw new AuthorizationError("You must be an admin or owner to add members to this group");
      }
    }

    // Check if member already exists
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          data.userId ? eq(groupMembers.userId, data.userId) : eq(groupMembers.contactId, data.contactId!)
        )
      )
      .limit(1);

    if (existingMember) {
      throw new ConflictError("Member is already in this group");
    }

    // Add member
    const [newMember] = await db
      .insert(groupMembers)
      .values({
        groupId: group.id,
        userId: data.userId || null,
        contactId: data.contactId || null,
        isAdmin: data.isAdmin || false,
        isGuest: data.isGuest || false,
        nickname: data.nickname?.trim() || null,
        joinedAt: new Date(),
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "invite",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "add_member",
        memberId: newMember.id,
        targetUserId: data.userId,
        targetContactId: data.contactId,
      },
    });

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    revalidatePath("/dashboard/groups");
    return newMember;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError || error instanceof ConflictError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to add group member", { originalError: error });
  }
}

export async function removeGroupMember(memberId: number, groupIdOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof groupIdOrPublicId === "number" || /^\d+$/.test(String(groupIdOrPublicId));
    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          isNumeric ? eq(groups.id, Number(groupIdOrPublicId)) : eq(groups.publicId, String(groupIdOrPublicId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Find the member record
    const [memberToRemove] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, group.id)))
      .limit(1);

    if (!memberToRemove) {
      throw new NotFoundError("Group member");
    }

    // Cannot remove owner
    if (memberToRemove.userId === group.createdBy) {
      throw new ValidationError("Cannot remove the group owner. Transfer ownership first.");
    }

    // Verify caller is admin or owner
    if (group.createdBy !== user.id) {
      const [callerAdmin] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!callerAdmin) {
        throw new AuthorizationError("You must be a group admin or owner to remove members");
      }
    }

    // Check if member has pending settlements/debts in this group
    const pendingSettlements = await db
      .select({ amount: settlements.amount })
      .from(settlements)
      .where(
        and(
          eq(settlements.groupId, group.id),
          eq(settlements.status, "pending"),
          eq(settlements.isDeleted, false),
          or(
            memberToRemove.userId ? or(eq(settlements.fromUserId, memberToRemove.userId), eq(settlements.toUserId, memberToRemove.userId)) : undefined,
            memberToRemove.contactId ? or(eq(settlements.fromContactId, memberToRemove.contactId), eq(settlements.toContactId, memberToRemove.contactId)) : undefined
          )
        )
      );

    const totalPending = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
    if (totalPending > 0) {
      throw new ValidationError(`Cannot remove member with pending settlements (${formatCurrency(totalPending / 100)}). Settle all balances first.`);
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, memberId));

    await db.insert(auditLogs).values({
      userId: user.id,
      action: "delete",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "remove_member",
        removedMemberId: memberId,
        userId: memberToRemove.userId,
        contactId: memberToRemove.contactId,
      },
    });

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    revalidatePath("/dashboard/groups");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to remove group member", { originalError: error });
  }
}

export async function updateMemberRole(memberId: number, groupIdOrPublicId: number | string, isAdmin: boolean) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof groupIdOrPublicId === "number" || /^\d+$/.test(String(groupIdOrPublicId));
    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          isNumeric ? eq(groups.id, Number(groupIdOrPublicId)) : eq(groups.publicId, String(groupIdOrPublicId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Only owner or admin can update roles
    if (group.createdBy !== user.id) {
      const [callerAdmin] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!callerAdmin) {
        throw new AuthorizationError("You must be an admin or owner to update member roles");
      }
    }

    const [updated] = await db
      .update(groupMembers)
      .set({ isAdmin })
      .where(and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, group.id)))
      .returning();

    if (!updated) {
      throw new NotFoundError("Group member");
    }

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    return { success: true, member: updated };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update member role", { originalError: error });
  }
}

export async function updateMemberNickname(memberId: number, groupIdOrPublicId: number | string, nickname: string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof groupIdOrPublicId === "number" || /^\d+$/.test(String(groupIdOrPublicId));
    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          isNumeric ? eq(groups.id, Number(groupIdOrPublicId)) : eq(groups.publicId, String(groupIdOrPublicId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const [updated] = await db
      .update(groupMembers)
      .set({ nickname: nickname.trim() || null })
      .where(and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, group.id)))
      .returning();

    if (!updated) {
      throw new NotFoundError("Group member");
    }

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    return { success: true, member: updated };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update member nickname", { originalError: error });
  }
}

export async function getGroupMembers(groupIdOrPublicId: number | string) {
  try {
    const user = await requireAuth();

    const isNumeric = typeof groupIdOrPublicId === "number" || /^\d+$/.test(String(groupIdOrPublicId));
    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          isNumeric ? eq(groups.id, Number(groupIdOrPublicId)) : eq(groups.publicId, String(groupIdOrPublicId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    const members = await db
      .select({
        id: groupMembers.id,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
        nickname: groupMembers.nickname,
        joinedAt: groupMembers.joinedAt,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        userName: users.name,
        userAvatar: users.avatar,
        userEmail: users.email,
        contactName: contacts.name,
        contactAvatar: contacts.avatar,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(eq(groupMembers.groupId, group.id));

    return members;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch group members", { originalError: error });
  }
}
