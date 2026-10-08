"use server";

import { db } from "@/lib/db";
import { users, contacts, groupMembers, invitations, groups, auditLogs, groupJoinRequests } from "@/lib/db/schema/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError, DatabaseError, ConflictError, AuthorizationError } from "@/lib/errors";
import { generateSecureToken, generateInvitationUrl, generateContactId, generateInvitationId, generateInvitationToken, generateWhatsAppLink, generatePublicId, isDbIntegerId } from "@/lib/utils";
import { sendEmailNotification, getInvitationEmailTemplate, getInvitationWhatsAppMessage } from "@/lib/notifications";

function buildGroupCondition(idOrPublicId: string | number) {
  const strId = String(idOrPublicId).trim();
  const isDbId = isDbIntegerId(idOrPublicId);
  return isDbId
    ? or(eq(groups.publicId, strId), eq(groups.id, Number(strId)), eq(groups.legacyPublicId, strId))
    : or(eq(groups.publicId, strId), eq(groups.legacyPublicId, strId));
}

export interface SearchResult {
  type: "user" | "contact" | "none";
  id?: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  existingGroups?: Array<{ id: number; name: string }>;
}

export async function searchMembers(query: string): Promise<SearchResult[]> {
  try {
    const user = await requireAuth();

    if (!query || query.trim().length < 2) {
      return [];
    }

    const cleanQuery = query.trim();

    // Search for registered users by email, name or phone
    const foundUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(users)
      .where(
        or(
          ilike(users.email, `%${cleanQuery}%`),
          ilike(users.name, `%${cleanQuery}%`)
        )
      )
      .limit(8);

    // Search for contacts belonging to this user
    const foundContacts = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        phone: contacts.phone,
        avatar: contacts.avatar,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, user.id),
          eq(contacts.isDeleted, false),
          or(
            contacts.email ? ilike(contacts.email, `%${cleanQuery}%`) : undefined,
            contacts.phone ? ilike(contacts.phone, `%${cleanQuery}%`) : undefined,
            ilike(contacts.name, `%${cleanQuery}%`)
          )
        )
      )
      .limit(8);

    const results: SearchResult[] = [];

    for (const foundUser of foundUsers) {
      const userGroups = await db
        .select({
          id: groupMembers.groupId,
          name: groups.name,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(
          and(
            eq(groupMembers.userId, foundUser.id),
            eq(groups.isDeleted, false)
          )
        )
        .limit(3);

      results.push({
        type: "user",
        id: foundUser.id,
        name: foundUser.name || "SplitLedger User",
        email: foundUser.email || undefined,
        avatar: foundUser.avatar || undefined,
        existingGroups: userGroups.map((g) => ({ id: g.id, name: g.name })),
      });
    }

    for (const foundContact of foundContacts) {
      // Don't duplicate if contact has same email as a found user
      if (foundContact.email && results.some((r) => r.email === foundContact.email)) {
        continue;
      }

      results.push({
        type: "contact",
        id: foundContact.id,
        name: foundContact.name,
        email: foundContact.email || undefined,
        phone: foundContact.phone || undefined,
        avatar: foundContact.avatar || undefined,
      });
    }

    return results;
  } catch (error) {
    throw new DatabaseError("Failed to search members", { originalError: error });
  }
}

export async function addExistingUserToGroup(groupIdOrPublicId: number | string, userId: number) {
  try {
    const currentUser = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(groupIdOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Verify admin/owner status
    if (group.createdBy !== currentUser.id) {
      const [adminMember] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, currentUser.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!adminMember) {
        throw new AuthorizationError("Only group admins or owners can add members");
      }
    }

    // Check if target user is already in group
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, userId)
        )
      )
      .limit(1);

    if (existingMember) {
      throw new ConflictError("User is already a member of this group");
    }

    // Add user with pending status awaiting Group Owner approval (Requirement 1)
    const [newMember] = await db
      .insert(groupMembers)
      .values({
        groupId: group.id,
        userId,
        membershipStatus: "pending",
        isAdmin: false,
        isGuest: false,
        joinedAt: new Date(),
      })
      .returning();

    // Create a pending join request for owner approval
    await db.insert(groupJoinRequests).values({
      publicId: generatePublicId(),
      groupId: group.id,
      userId,
      status: "pending",
      includeInHistoricalExpenses: false,
    });

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "invite",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "add_existing_user",
        targetUserId: userId,
      },
    });

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    revalidatePath("/dashboard/groups");
    return newMember;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError("Failed to add user to group", { originalError: error });
  }
}

export async function createGuestMember(data: {
  groupId: number | string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  nickname?: string;
  notes?: string;
  relationship?: string;
}) {
  try {
    const currentUser = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(data.groupId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    // Verify admin or owner permissions
    if (group.createdBy !== currentUser.id) {
      const [adminMember] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, currentUser.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!adminMember) {
        throw new AuthorizationError("Only group admins or owners can add guest members");
      }
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Guest member name is required");
    }

    const cleanEmail = data.email?.trim() || null;
    const cleanPhone = data.phone?.trim() || null;

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new ValidationError("Invalid email format");
      }
    }

    // Find existing contact or create new contact for the guest
    let guestContact: typeof contacts.$inferSelect | null = null;
    if (cleanEmail || cleanPhone) {
      const [foundContact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, currentUser.id),
            eq(contacts.isDeleted, false),
            or(
              cleanEmail ? eq(contacts.email, cleanEmail) : undefined,
              cleanPhone ? eq(contacts.phone, cleanPhone) : undefined
            )
          )
        )
        .limit(1);

      if (foundContact) {
        guestContact = foundContact;
      }
    }

    if (!guestContact) {
      const [newContact] = await db
        .insert(contacts)
        .values({
          publicId: generateContactId(),
          userId: currentUser.id,
          name: data.name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          avatar: data.avatar || null,
          currency: "INR",
          notes: data.notes?.trim() || null,
        })
        .returning();
      guestContact = newContact;
    }

    // Check if guest contact is already in group
    const [existingMembership] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.contactId, guestContact.id)
        )
      )
      .limit(1);

    let groupMemberRecord = existingMembership;
    if (!existingMembership) {
      const [newMember] = await db
        .insert(groupMembers)
        .values({
          groupId: group.id,
          contactId: guestContact.id,
          isAdmin: false,
          isGuest: true,
          nickname: data.nickname?.trim() || data.name.trim(),
          joinedAt: new Date(),
        })
        .returning();
      groupMemberRecord = newMember;
    }

    // Create invitation record with unique 15-20 digit numeric token and publicId
    const token = generateInvitationToken([group.publicId, String(group.id)]);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invitation] = await db
      .insert(invitations)
      .values({
        publicId: generateInvitationId([group.publicId, String(group.id), token]),
        groupId: group.id,
        invitedBy: currentUser.id,
        email: cleanEmail || "guest@splitledger.app",
        phone: cleanPhone,
        name: data.name.trim(),
        token,
        status: "pending",
        expiresAt,
        guestContactId: guestContact.id,
      })
      .returning();

    const invitationUrl = generateInvitationUrl(token);

    // Send email notification if valid email provided
    if (cleanEmail && cleanEmail !== "guest@splitledger.app") {
      try {
        const { subject, html } = getInvitationEmailTemplate(
          group.name,
          currentUser.name || "Someone",
          invitationUrl,
          expiresAt
        );
        await sendEmailNotification(cleanEmail, subject, html);
      } catch (err) {
        console.error("Non-fatal: Failed to send invitation email:", err);
      }
    }

    const whatsappMessage = getInvitationWhatsAppMessage(
      group.name,
      currentUser.name || "A friend",
      invitationUrl
    );
    const whatsappLink = cleanPhone ? generateWhatsAppLink(cleanPhone, whatsappMessage) : null;

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "invite",
      entityType: "group",
      entityId: group.id,
      changes: {
        action: "create_guest_member",
        guestName: data.name,
        contactId: guestContact.id,
        invitationToken: token,
      },
    });

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    revalidatePath("/dashboard/groups");

    return {
      guestContact,
      groupMember: groupMemberRecord,
      invitation,
      invitationUrl,
      whatsappLink,
      whatsappMessage,
    };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to create guest member", { originalError: error });
  }
}

export async function addContactToGroup(groupIdOrPublicId: number | string, contactId: number) {
  try {
    const currentUser = await requireAuth();

    const [group] = await db
      .select()
      .from(groups)
      .where(
        and(
          buildGroupCondition(groupIdOrPublicId),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!group) {
      throw new NotFoundError("Group");
    }

    if (group.createdBy !== currentUser.id) {
      const [adminMember] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, currentUser.id),
            eq(groupMembers.isAdmin, true)
          )
        )
        .limit(1);

      if (!adminMember) {
        throw new AuthorizationError("Only admins can add members to the group");
      }
    }

    // Verify contact belongs to current user
    const [contact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.id, contactId),
          eq(contacts.userId, currentUser.id),
          eq(contacts.isDeleted, false)
        )
      )
      .limit(1);

    if (!contact) {
      throw new NotFoundError("Contact");
    }

    // Check if contact is already in group
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.contactId, contactId)
        )
      )
      .limit(1);

    if (existingMember) {
      throw new ConflictError("Contact is already a member of this group");
    }

    // Add contact as guest member
    const [newMember] = await db
      .insert(groupMembers)
      .values({
        groupId: group.id,
        contactId,
        isAdmin: false,
        isGuest: true,
        nickname: contact.name,
        joinedAt: new Date(),
      })
      .returning();

    revalidatePath(`/dashboard/groups/${group.publicId}`);
    revalidatePath(`/dashboard/groups/${group.id}`);
    return newMember;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError("Failed to add contact to group", { originalError: error });
  }
}
