"use server";

import { db } from "@/lib/db";
import { invitations, groups, users, contacts, groupMembers, settlements, transactions, expenseSplits, auditLogs } from "@/lib/db/schema/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError, ConflictError, AuthorizationError } from "@/lib/errors";
import { generateSecureToken, generateInvitationUrl, generateInvitationId, generateWhatsAppLink } from "@/lib/utils";
import { sendEmailNotification, getInvitationEmailTemplate, getInvitationWhatsAppMessage } from "@/lib/notifications";

export async function getOrCreateGroupInviteLink(groupIdOrPublicId: string | number) {
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

    // Check if user is a member of this group
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
      .limit(1);

    if (!membership && group.createdBy !== user.id) {
      throw new AuthorizationError("You must be a member of this group to generate an invitation link");
    }

    // Look for an existing valid pending group link (not tied to a specific guest contact)
    const now = new Date();
    const [existing] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.groupId, group.id),
          eq(invitations.status, "pending"),
          gt(invitations.expiresAt, now)
        )
      )
      .orderBy(desc(invitations.createdAt))
      .limit(1);

    let token: string;
    let expiresAt: Date;

    if (existing) {
      token = existing.token;
      expiresAt = existing.expiresAt;
    } else {
      token = generateSecureToken();
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for general group link

      await db.insert(invitations).values({
        publicId: generateInvitationId(),
        groupId: group.id,
        invitedBy: user.id,
        email: "invite@splitledger.app",
        name: "Group Member",
        token,
        status: "pending",
        expiresAt,
      });
    }

    const invitationUrl = generateInvitationUrl(token);
    const whatsappMessage = getInvitationWhatsAppMessage(
      group.name,
      user.name || "A friend",
      invitationUrl
    );
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    return {
      token,
      invitationUrl,
      whatsappLink,
      whatsappMessage,
      groupName: group.name,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to generate group invite link", { originalError: error });
  }
}

export async function createInvitation(data: {
  groupId: number | string;
  email: string;
  phone?: string;
  name?: string;
}) {
  try {
    const user = await requireAuth();

    if (!data.email || data.email.trim().length === 0) {
      throw new ValidationError("Email is required");
    }

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

    // Check if user is admin/owner of the group
    if (group.createdBy !== user.id) {
      const [adminMember] = await db
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

      if (!adminMember) {
        throw new AuthorizationError("Only group admins or owners can send email invitations");
      }
    }

    const cleanEmail = data.email.trim().toLowerCase();

    // Check if invitation already exists for this email and group
    const [existingInvitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.groupId, group.id),
          eq(invitations.email, cleanEmail),
          eq(invitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvitation) {
      const invitationUrl = generateInvitationUrl(existingInvitation.token);
      return {
        invitation: existingInvitation,
        invitationUrl,
        whatsappLink: data.phone ? generateWhatsAppLink(data.phone, getInvitationWhatsAppMessage(group.name, user.name || "Someone", invitationUrl)) : null,
      };
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const [invitation] = await db
      .insert(invitations)
      .values({
        publicId: generateInvitationId(),
        groupId: group.id,
        invitedBy: user.id,
        email: cleanEmail,
        phone: data.phone?.trim() || null,
        name: data.name?.trim() || null,
        token,
        status: "pending",
        expiresAt,
      })
      .returning();

    const invitationUrl = generateInvitationUrl(token);

    // Send email notification
    try {
      const { subject, html } = getInvitationEmailTemplate(
        group.name,
        user.name || "Someone",
        invitationUrl,
        expiresAt
      );
      await sendEmailNotification(cleanEmail, subject, html);
    } catch (err) {
      console.error("Non-fatal: Failed to send invitation email:", err);
    }

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    
    return {
      invitation,
      invitationUrl,
      whatsappLink: data.phone ? generateWhatsAppLink(data.phone, getInvitationWhatsAppMessage(group.name, user.name || "Someone", invitationUrl)) : null,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError || error instanceof ConflictError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to create invitation", { originalError: error });
  }
}

export async function acceptInvitation(token: string) {
  try {
    const user = await requireAuth();

    // Find invitation by token
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, "pending")))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError("Invitation");
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      await db
        .update(invitations)
        .set({ status: "expired" })
        .where(eq(invitations.id, invitation.id));
      throw new ValidationError("Invitation has expired. Please request a new link.");
    }

    // Get group
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, invitation.groupId), eq(groups.isDeleted, false)))
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Check if user is already a member of the group
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, invitation.groupId),
          eq(groupMembers.userId, user.id)
        )
      )
      .limit(1);

    if (existingMember) {
      await db
        .update(invitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          mergedUserId: user.id,
        })
        .where(eq(invitations.id, invitation.id));

      return { groupMember: existingMember, invitation, group, alreadyMember: true };
    }

    // If there was a guest contact linked to this invitation, merge it
    if (invitation.guestContactId) {
      await mergeGuestContact(invitation.guestContactId, user.id);
    } else {
      // Otherwise add user as standard member
      await db.insert(groupMembers).values({
        groupId: invitation.groupId,
        userId: user.id,
        isAdmin: false,
        isGuest: false,
        joinedAt: new Date(),
      });
    }

    // Update invitation status
    await db
      .update(invitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        mergedUserId: user.id,
      })
      .where(eq(invitations.id, invitation.id));

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard");

    return { success: true, group };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError("Failed to accept invitation", { originalError: error });
  }
}

export async function declineInvitation(token: string) {
  try {
    const user = await requireAuth();

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, "pending")))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError("Invitation");
    }

    await db
      .update(invitations)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to decline invitation", { originalError: error });
  }
}

export async function cancelInvitation(invitationId: number) {
  try {
    const user = await requireAuth();

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError("Invitation");
    }

    if (invitation.invitedBy !== user.id) {
      throw new AuthorizationError("Only the inviter can cancel this invitation");
    }

    await db
      .update(invitations)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: user.id,
      })
      .where(eq(invitations.id, invitationId));

    revalidatePath(`/dashboard/groups/${invitation.groupId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to cancel invitation", { originalError: error });
  }
}

export async function resendInvitation(invitationId: number) {
  try {
    const user = await requireAuth();

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError("Invitation");
    }

    if (invitation.invitedBy !== user.id) {
      throw new AuthorizationError("Only the inviter can resend this invitation");
    }

    const newToken = generateSecureToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const [updatedInvitation] = await db
      .update(invitations)
      .set({
        token: newToken,
        status: "pending",
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId))
      .returning();

    const invitationUrl = generateInvitationUrl(newToken);

    revalidatePath(`/dashboard/groups/${invitation.groupId}`);
    return {
      invitation: updatedInvitation,
      invitationUrl,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to resend invitation", { originalError: error });
  }
}

export async function getInvitationByToken(token: string) {
  try {
    const [invitation] = await db
      .select({
        id: invitations.id,
        groupId: invitations.groupId,
        email: invitations.email,
        name: invitations.name,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        guestContactId: invitations.guestContactId,
        groupName: groups.name,
        groupDescription: groups.description,
        groupType: groups.type,
        groupPublicId: groups.publicId,
        invitedByName: users.name,
        invitedByAvatar: users.avatar,
      })
      .from(invitations)
      .innerJoin(groups, eq(invitations.groupId, groups.id))
      .innerJoin(users, eq(invitations.invitedBy, users.id))
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError("Invitation");
    }

    return invitation;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch invitation", { originalError: error });
  }
}

async function mergeGuestContact(contactId: number, userId: number) {
  try {
    // 1. Update group members
    await db
      .update(groupMembers)
      .set({
        userId,
        contactId: null,
        isGuest: false,
      })
      .where(eq(groupMembers.contactId, contactId));

    // 2. Update settlements
    await db
      .update(settlements)
      .set({
        fromUserId: userId,
        fromContactId: null,
      })
      .where(eq(settlements.fromContactId, contactId));

    await db
      .update(settlements)
      .set({
        toUserId: userId,
        toContactId: null,
      })
      .where(eq(settlements.toContactId, contactId));

    // 3. Update expense splits
    await db
      .update(expenseSplits)
      .set({
        userId,
        contactId: null,
      })
      .where(eq(expenseSplits.contactId, contactId));

    // 4. Update transactions where guest was payer
    await db
      .update(transactions)
      .set({
        paidBy: userId,
        paidByContact: null,
      })
      .where(eq(transactions.paidByContact, contactId));

    // 5. Archive the contact
    await db
      .update(contacts)
      .set({ isArchived: true })
      .where(eq(contacts.id, contactId));
  } catch (error) {
    console.error("Failed to merge guest contact:", error);
  }
}

export async function revokeGroupInviteLink(groupIdOrPublicId: string | number) {
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

    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
      .limit(1);

    if (!membership && group.createdBy !== user.id) {
      throw new AuthorizationError("You must be a group member to revoke invitation links");
    }

    await db
      .update(invitations)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invitations.groupId, group.id),
          eq(invitations.status, "pending")
        )
      );

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    throw new DatabaseError("Failed to revoke group invite link", { originalError: error });
  }
}

export async function generateNewGroupInviteLink(groupIdOrPublicId: string | number) {
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

    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
      .limit(1);

    if (!membership && group.createdBy !== user.id) {
      throw new AuthorizationError("You must be a group member to generate an invitation link");
    }

    await db
      .update(invitations)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invitations.groupId, group.id),
          eq(invitations.status, "pending"),
          eq(invitations.email, "invite@splitledger.app")
        )
      );

    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db
      .insert(invitations)
      .values({
        publicId: generateInvitationId(),
        groupId: group.id,
        invitedBy: user.id,
        email: "invite@splitledger.app",
        name: "Group Member",
        token,
        status: "pending",
        expiresAt,
      });

    const invitationUrl = generateInvitationUrl(token);
    const whatsappMessage = getInvitationWhatsAppMessage(
      group.name,
      user.name || "A friend",
      invitationUrl
    );
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);

    return {
      token,
      invitationUrl,
      whatsappLink,
      whatsappMessage,
      groupName: group.name,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
    throw new DatabaseError("Failed to generate new group invite link", { originalError: error });
  }
}

export async function getGroupInvitationsHistory(groupIdOrPublicId: string | number) {
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

    const now = new Date();

    const allInvites = await db
      .select({
        id: invitations.id,
        publicId: invitations.publicId,
        email: invitations.email,
        phone: invitations.phone,
        name: invitations.name,
        token: invitations.token,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        acceptedAt: invitations.acceptedAt,
        rejectedAt: invitations.rejectedAt,
        cancelledAt: invitations.cancelledAt,
        inviterName: users.name,
      })
      .from(invitations)
      .leftJoin(users, eq(invitations.invitedBy, users.id))
      .where(eq(invitations.groupId, group.id))
      .orderBy(desc(invitations.createdAt));

    const joinedMembers = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
        nickname: groupMembers.nickname,
        joinedAt: groupMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
        contactName: contacts.name,
        contactPhone: contacts.phone,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(eq(groupMembers.groupId, group.id))
      .orderBy(desc(groupMembers.joinedAt));

    const pending = allInvites.filter((i) => i.status === "pending" && i.expiresAt > now);
    const accepted = allInvites.filter((i) => i.status === "accepted");
    const rejected = allInvites.filter((i) => i.status === "rejected");
    const expired = allInvites.filter((i) => i.status === "expired" || (i.status === "pending" && i.expiresAt <= now));
    const cancelled = allInvites.filter((i) => i.status === "cancelled");

    return {
      group: {
        id: group.id,
        publicId: group.publicId,
        name: group.name,
      },
      pending,
      accepted,
      rejected,
      expired,
      cancelled,
      joinedMembers: joinedMembers.map((m) => ({
        id: m.id,
        name: m.userName || m.contactName || m.nickname || "Member",
        email: m.userEmail || null,
        phone: m.contactPhone || null,
        avatar: m.userAvatar || null,
        isAdmin: m.isAdmin,
        isGuest: m.isGuest,
        joinedAt: m.joinedAt,
      })),
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch group invitations history", { originalError: error });
  }
}
