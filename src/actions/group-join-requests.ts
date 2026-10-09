"use server";

import { db } from "@/lib/db";
import { 
  groupJoinRequests, 
  groups, 
  groupMembers, 
  users, 
  auditLogs 
} from "@/lib/db/schema/schema";
import { eq, and, sql, desc, or } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError, ConflictError } from "@/lib/errors";
import { generatePublicId, generateAuditId, isDbIntegerId } from "@/lib/utils";
import { redistributeGroupHistoricalExpenses } from "@/actions/historical-redistribution";
import { hasDelegatedGroupPermission } from "@/lib/security/rbac";

/**
 * Get group preview and current user's join status (open to both authenticated & unauthenticated visitors)
 */
export async function getGroupJoinDetailsAction(groupPublicId: string) {
  try {
    const user = await getCurrentUser();

    const strId = String(groupPublicId).trim();
    const isDbId = isDbIntegerId(groupPublicId);
    const [group] = await db
      .select({
        id: groups.id,
        publicId: groups.publicId,
        name: groups.name,
        description: groups.description,
        coverImage: groups.coverImage,
        currency: groups.currency,
        type: groups.type,
        createdBy: groups.createdBy,
        isDeleted: groups.isDeleted,
      })
      .from(groups)
      .where(
        and(
          isDbId
            ? or(eq(groups.publicId, strId), eq(groups.id, Number(strId)), eq(groups.legacyPublicId, strId))
            : or(eq(groups.publicId, strId), eq(groups.legacyPublicId, strId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group not found or has been deactivated.");
    }

    // Get active member count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.membershipStatus, "active")
        )
      );

    const memberCount = Number(countResult?.count || 0);

    // Get owner name
    const [owner] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, group.createdBy))
      .limit(1);

    if (!user) {
      return {
        isAuthenticated: false,
        group: {
          id: group.id,
          publicId: group.publicId,
          name: group.name,
          coverImage: group.coverImage,
          description: group.description,
          currency: group.currency,
          type: group.type,
          memberCount,
          ownerName: owner?.name || "Group Admin",
        },
        isMember: false,
        membershipStatus: null,
        pendingRequest: null,
      };
    }

    // Check if user has membership record
    const [membership] = await db
      .select({ 
        id: groupMembers.id,
        membershipStatus: groupMembers.membershipStatus
      })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
      .limit(1);

    // Check if user already submitted a pending request
    const [pendingRequest] = await db
      .select({
        id: groupJoinRequests.id,
        publicId: groupJoinRequests.publicId,
        status: groupJoinRequests.status,
        createdAt: groupJoinRequests.createdAt,
      })
      .from(groupJoinRequests)
      .where(
        and(
          eq(groupJoinRequests.groupId, group.id),
          eq(groupJoinRequests.userId, user.id),
          eq(groupJoinRequests.status, "pending")
        )
      )
      .limit(1);

    const isFullActiveMember = membership?.membershipStatus === "active";
    const membershipStatus = membership?.membershipStatus || (pendingRequest ? "pending" : null);

    return {
      isAuthenticated: true,
      currentUser: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      group: {
        id: group.id,
        publicId: group.publicId,
        name: group.name,
        coverImage: group.coverImage,
        description: group.description,
        currency: group.currency,
        type: group.type,
        memberCount,
        ownerName: owner?.name || "Group Admin",
      },
      isMember: isFullActiveMember,
      membershipStatus,
      pendingRequest: pendingRequest || null,
    };
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch group join details", { originalError: error });
  }
}

/**
 * Submit a request to join a group via specific group QR link (Method 1)
 * Sets status to PENDING on both join_requests and group_members
 */
export async function submitGroupJoinRequestAction(groupPublicId: string) {
  try {
    const user = await requireAuth();

    const strId = String(groupPublicId).trim();
    const isDbId = isDbIntegerId(groupPublicId);
    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          isDbId
            ? or(eq(groups.publicId, strId), eq(groups.id, Number(strId)), eq(groups.legacyPublicId, strId))
            : or(eq(groups.publicId, strId), eq(groups.legacyPublicId, strId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Check if already an active or inactive member
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
      .limit(1);

    if (existingMember && existingMember.membershipStatus === "active") {
      throw new ConflictError("You are already an active member of this group.");
    }

    if (existingMember && existingMember.membershipStatus === "expense_inactive") {
      return { 
        success: true, 
        message: "Your membership is approved and awaiting Group Owner expense configuration.",
        status: "expense_inactive" 
      };
    }

    // Check for existing pending request
    const [existingRequest] = await db
      .select()
      .from(groupJoinRequests)
      .where(
        and(
          eq(groupJoinRequests.groupId, group.id),
          eq(groupJoinRequests.userId, user.id),
          eq(groupJoinRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest) {
      return { 
        success: true, 
        requestId: existingRequest.id, 
        publicId: existingRequest.publicId,
        message: "Your join request is pending approval from the Group Owner.",
        status: "pending" 
      };
    }

    const publicId = generatePublicId();

    const [inserted] = await db
      .insert(groupJoinRequests)
      .values({
        publicId,
        groupId: group.id,
        userId: user.id,
        status: "pending",
        includeInHistoricalExpenses: false,
      })
      .returning();

    // Ensure member row exists with status = pending
    if (!existingMember) {
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: user.id,
        membershipStatus: "pending",
        isAdmin: false,
        isGuest: false,
        joinedAt: new Date(),
      });
    } else {
      await db
        .update(groupMembers)
        .set({ membershipStatus: "pending" })
        .where(eq(groupMembers.id, existingMember.id));
    }

    // Audit log
    await db.insert(auditLogs).values({
      publicId: generateAuditId(),
      userId: user.id,
      action: "create",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "join_request_submitted",
        requestId: inserted.id,
      },
      reason: "User submitted group join request via QR link",
      status: "success",
    });

    revalidatePath(`/join-group/${groupPublicId}`);
    revalidatePath(`/dashboard/groups/${group.publicId}`);
    if (group.legacyPublicId) {
      revalidatePath(`/dashboard/groups/${group.legacyPublicId}`);
    }
    revalidatePath(`/dashboard/groups/${group.id}`);

    return {
      success: true,
      requestId: inserted.id,
      publicId: inserted.publicId,
      status: "pending",
    };
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError("Failed to submit join request", { originalError: error });
  }
}

/**
 * Fetch all pending join requests for a group (Owner or delegated admin with permission)
 */
export async function getPendingJoinRequestsForGroupAction(groupId: number) {
  try {
    const user = await requireAuth();

    // Check owner / delegated permissions
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.isDeleted, false)))
      .limit(1);

    if (!group) throw new NotFoundError("Group");

    const isOwner = group.createdBy === user.id;
    if (!isOwner) {
      const [callerMember] = await db
        .select({
          membershipStatus: groupMembers.membershipStatus,
          delegatedPermissions: groupMembers.delegatedPermissions,
          isAdmin: groupMembers.isAdmin,
        })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, user.id)
          )
        )
        .limit(1);

      const canView = hasDelegatedGroupPermission(
        group.createdBy,
        user.id,
        callerMember,
        "group:view_join_requests"
      ) || hasDelegatedGroupPermission(
        group.createdBy,
        user.id,
        callerMember,
        "group:approve_members"
      ) || Boolean(callerMember?.isAdmin);

      if (!canView) {
        throw new AuthorizationError("You do not have permission to view pending join requests.");
      }
    }

    const requests = await db
      .select({
        id: groupJoinRequests.id,
        publicId: groupJoinRequests.publicId,
        userId: groupJoinRequests.userId,
        status: groupJoinRequests.status,
        createdAt: groupJoinRequests.createdAt,
        userName: users.name,
        userEmail: users.email,
        userUpiId: users.upiId,
      })
      .from(groupJoinRequests)
      .innerJoin(users, eq(groupJoinRequests.userId, users.id))
      .where(
        and(
          eq(groupJoinRequests.groupId, groupId),
          eq(groupJoinRequests.status, "pending")
        )
      )
      .orderBy(desc(groupJoinRequests.createdAt));

    return requests;
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    throw new DatabaseError("Failed to fetch pending join requests", { originalError: error });
  }
}

/**
 * Approve a join request (Owner or member with group:approve_members permission)
 * Transition member to 'expense_inactive'.
 * If immediateActivationDecision is provided, executes Option A or Option B immediately.
 */
export async function approveJoinRequestAction(data: {
  requestId: number;
  participationDecision?: "included" | "excluded";
  immediateActivationDecision?: "included" | "excluded";
}) {
  try {
    const user = await requireAuth();

    const decision = data.participationDecision || data.immediateActivationDecision;
    if (!decision || (decision !== "included" && decision !== "excluded")) {
      throw new ValidationError("Please choose how this member should participate in group expenses before approving.");
    }

    return await db.transaction(async (tx) => {
      // 1. Fetch the request
      const [request] = await tx
        .select()
        .from(groupJoinRequests)
        .where(eq(groupJoinRequests.id, data.requestId))
        .limit(1);

      if (!request) {
        throw new NotFoundError("Join request not found");
      }

      if (request.status !== "pending") {
        throw new ConflictError(`This join request has already been ${request.status}.`);
      }

      // 2. Fetch group & verify caller authority
      const [group] = await tx
        .select()
        .from(groups)
        .where(eq(groups.id, request.groupId))
        .limit(1);

      if (!group) throw new NotFoundError("Group");

      const isSystemAdmin = 
        user.email === "dipakspawaras17@gmail.com" ||
        user.email === "dipakspawar@coep.sveri.ac.in" ||
        user.email === "pawardipaksa@gmail.com" ||
        user.email === "dipak@splitledger.ai";

      const isOwner = group.createdBy === user.id || isSystemAdmin;

      let canApprove = isOwner;
      if (!canApprove) {
        const [callerMember] = await tx
          .select({
            membershipStatus: groupMembers.membershipStatus,
            delegatedPermissions: groupMembers.delegatedPermissions,
            isAdmin: groupMembers.isAdmin,
          })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, group.id),
              eq(groupMembers.userId, user.id)
            )
          )
          .limit(1);

        canApprove = Boolean(callerMember?.isAdmin) ||
          callerMember?.membershipStatus === "active" ||
          hasDelegatedGroupPermission(
            group.createdBy,
            user.id,
            callerMember,
            "group:approve_members"
          );
      }

      if (!canApprove) {
        return {
          success: false,
          error: "You do not have permission to approve join requests for this group.",
        };
      }

      // 3. Mark request as approved
      await tx
        .update(groupJoinRequests)
        .set({
          status: "approved",
          approvedBy: user.id,
          approvedAt: new Date(),
          includeInHistoricalExpenses: decision === "included",
          updatedAt: new Date(),
        })
        .where(eq(groupJoinRequests.id, request.id));

      // 4. Update or insert member row directly to 'active' with participation rule (REQUIREMENTS 6, 7, 8)
      const [existingMember] = await tx
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, request.userId)
          )
        )
        .limit(1);

      let memberRecordId: number;
      if (!existingMember) {
        const [newMember] = await tx
          .insert(groupMembers)
          .values({
            groupId: group.id,
            userId: request.userId,
            membershipStatus: "active",
            historicalInclusionDecision: decision,
            activatedAt: new Date(),
            isAdmin: false,
            isGuest: false,
            joinedAt: new Date(),
          })
          .returning();
        memberRecordId = newMember.id;
      } else {
        await tx
          .update(groupMembers)
          .set({
            membershipStatus: "active",
            historicalInclusionDecision: decision,
            activatedAt: new Date(),
          })
          .where(eq(groupMembers.id, existingMember.id));
        memberRecordId = existingMember.id;
      }

      // 5. Apply Historical Redistribution if Option A selected
      let redistributedCount = 0;
      if (decision === "included") {
        const redistribution = await redistributeGroupHistoricalExpenses(
          group.id,
          request.userId,
          user.id,
          tx
        );
        redistributedCount = redistribution.redistributedCount;
      }

      const activationOutcome = {
        decision,
        status: "active",
        redistributedCount,
      };

      // 6. Record audit log
      try {
        await tx.insert(auditLogs).values({
          publicId: generateAuditId(),
          userId: user.id,
          action: "update",
          entityType: "group",
          entityId: group.id,
          changes: {
            action: "approve_join_request",
            requestId: request.id,
            applicantUserId: request.userId,
            status: activationOutcome ? "active" : "expense_inactive",
            activationDecision: decision,
          },
          reason: "Join request approved by group owner/admin",
          status: "success",
        });
      } catch (auditErr) {
        console.warn("Non-fatal: failed to write approval audit log:", auditErr);
      }

      // 7. Revalidate all paths
      revalidatePath(`/dashboard/groups/${group.publicId}`);
      if (group.legacyPublicId) {
        revalidatePath(`/dashboard/groups/${group.legacyPublicId}`);
      }
      revalidatePath(`/dashboard/groups/${group.id}`);
      revalidatePath(`/dashboard/groups/${group.id}/settlements`);
      revalidatePath(`/dashboard/settlements`);
      revalidatePath(`/join-group/${group.publicId}`);
      if (group.legacyPublicId) {
        revalidatePath(`/join-group/${group.legacyPublicId}`);
      }
      revalidatePath("/dashboard/groups");
      revalidatePath("/groups");
      revalidatePath("/dashboard");

      return {
        success: true as const,
        groupId: group.id,
        groupPublicId: group.publicId,
        memberUserId: request.userId,
        status: activationOutcome ? "active" : "expense_inactive",
        activation: activationOutcome,
      };
    });
  } catch (error: any) {
    console.error("Failed to approve join request:", error);
    return {
      success: false as const,
      error: error?.message || "Failed to approve join request",
    };
  }
}

/**
 * Configure Expense Activation Decision (REQUIREMENT 4 & 9)
 * Exclusively executed by Group Owner:
 * Option A: "included" -> redistribute historical expenses, recalculate balances & settlements, mark active
 * Option B: "excluded" -> preserve calculations, historical share 0, mark active
 */
export async function activateMemberExpenseParticipationAction(data: {
  groupId: number;
  memberUserId: number;
  decision: "included" | "excluded";
}) {
  try {
    const user = await requireAuth();

    return await db.transaction(async (tx) => {
      // 1. Fetch group & verify caller is Group Owner (REQUIREMENT 9)
      const [group] = await tx
        .select()
        .from(groups)
        .where(and(eq(groups.id, data.groupId), eq(groups.isDeleted, false)))
        .limit(1);

      if (!group) throw new NotFoundError("Group not found");

      if (group.createdBy !== user.id) {
        throw new AuthorizationError("Only the Group Owner may configure expense participation.");
      }

      // 2. Fetch target member
      const [member] = await tx
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, data.memberUserId)
          )
        )
        .limit(1);

      if (!member) {
        throw new NotFoundError("Member not found in group");
      }

      let redistributionCount = 0;

      if (data.decision === "included") {
        // Option A: Include in Previous Expenses (recalculate historical expenses, shares, settlements)
        const result = await redistributeGroupHistoricalExpenses(
          group.id,
          data.memberUserId,
          user.id,
          tx
        );
        redistributionCount = result.redistributedCount;

        await tx
          .update(groupMembers)
          .set({
            membershipStatus: "active",
            historicalInclusionDecision: "included",
            activatedAt: new Date(),
          })
          .where(eq(groupMembers.id, member.id));

        // Update join request record if exists
        await tx
          .update(groupJoinRequests)
          .set({ includeInHistoricalExpenses: true })
          .where(
            and(
              eq(groupJoinRequests.groupId, group.id),
              eq(groupJoinRequests.userId, data.memberUserId)
            )
          );
      } else {
        // Option B: Start From New Expenses Only (preserve existing calculations)
        await tx
          .update(groupMembers)
          .set({
            membershipStatus: "active",
            historicalInclusionDecision: "excluded",
            activatedAt: new Date(),
          })
          .where(eq(groupMembers.id, member.id));

        await tx
          .update(groupJoinRequests)
          .set({ includeInHistoricalExpenses: false })
          .where(
            and(
              eq(groupJoinRequests.groupId, group.id),
              eq(groupJoinRequests.userId, data.memberUserId)
            )
          );
      }

      // 3. Audit log
      await tx.insert(auditLogs).values({
        publicId: generateAuditId(),
        userId: user.id,
        action: "update",
        entityType: "group",
        entityId: group.id,
        changes: {
          action: "activate_expense_participation",
          targetUserId: data.memberUserId,
          decision: data.decision,
          redistributedCount: redistributionCount,
        },
        reason: `Group Owner activated member expense participation (${data.decision})`,
        status: "success",
      });

      // 4. Revalidate paths for immediate sync
      revalidatePath(`/dashboard/groups/${group.publicId}`);
      revalidatePath(`/dashboard/groups/${group.id}`);
      revalidatePath(`/dashboard/groups/${group.id}/settlements`);
      revalidatePath(`/dashboard/settlements`);
      revalidatePath("/dashboard/groups");
      revalidatePath("/groups");
      revalidatePath("/dashboard");

      return {
        success: true as const,
        groupId: group.id,
        groupPublicId: group.publicId,
        memberUserId: data.memberUserId,
        decision: data.decision,
        status: "active",
        redistributedCount: redistributionCount,
      };
    });
  } catch (error: any) {
    console.error("Failed to activate expense participation:", error);
    return {
      success: false as const,
      error: error?.message || "Failed to activate expense participation",
    };
  }
}

/**
 * Reject a join request (Owner or delegated admin with permission)
 */
export async function rejectJoinRequestAction(data: {
  requestId: number;
  reason?: string;
}) {
  try {
    const user = await requireAuth();

    const [request] = await db
      .select()
      .from(groupJoinRequests)
      .where(eq(groupJoinRequests.id, data.requestId))
      .limit(1);

    if (!request) throw new NotFoundError("Join request not found");

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, request.groupId))
      .limit(1);

    if (!group) throw new NotFoundError("Group");

    const isSystemAdmin = 
      user.email === "dipakspawaras17@gmail.com" ||
      user.email === "dipakspawar@coep.sveri.ac.in" ||
      user.email === "pawardipaksa@gmail.com" ||
      user.email === "dipak@splitledger.ai";

    const isOwner = group.createdBy === user.id || isSystemAdmin;
    let canReject = isOwner;
    if (!canReject) {
      const [callerMember] = await db
        .select({
          membershipStatus: groupMembers.membershipStatus,
          delegatedPermissions: groupMembers.delegatedPermissions,
          isAdmin: groupMembers.isAdmin,
        })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, user.id)
          )
        )
        .limit(1);

      canReject = Boolean(callerMember?.isAdmin) ||
        callerMember?.membershipStatus === "active" ||
        hasDelegatedGroupPermission(
          group.createdBy,
          user.id,
          callerMember,
          "group:approve_members"
        );
    }

    if (!canReject) {
      return {
        success: false as const,
        error: "You do not have permission to reject join requests.",
      };
    }

    await db
      .update(groupJoinRequests)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
        notes: data.reason || "Rejected by owner",
        updatedAt: new Date(),
      })
      .where(eq(groupJoinRequests.id, request.id));

    // Remove pending membership if present
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, request.userId),
          eq(groupMembers.membershipStatus, "pending")
        )
      );

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    if (group.legacyPublicId) {
      revalidatePath(`/dashboard/groups/${group.legacyPublicId}`);
    }
    revalidatePath(`/dashboard/groups/${group.id}`);
    revalidatePath("/dashboard/groups");
    revalidatePath("/groups");
    revalidatePath("/dashboard");

    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to reject join request:", error);
    return {
      success: false as const,
      error: error?.message || "Failed to reject join request",
    };
  }
}
