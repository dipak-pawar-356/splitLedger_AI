import { NextResponse } from "next/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { users, profiles, contacts, groupMembers, invitations } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET is not set");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ""} ${last_name || ""}`.trim() || email?.split("@")[0];

    try {
      // Check if there are any pending invitations for this email
      const pendingInvitations = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, email || ""),
            eq(invitations.status, "pending")
          )
        );

      // Create user
      const [newUser] = await db.insert(users).values({
        clerkUserId: id,
        email: email || "",
        name,
        avatar: image_url,
        defaultCurrency: "INR",
        theme: "system",
        emailVerified: false,
      }).returning();

      // Create profile
      await db.insert(profiles).values({
        userId: newUser.id,
        phone: "",
        timezone: "UTC",
        language: "en",
        notificationsEnabled: true,
        emailNotifications: true,
        whatsappNotifications: false,
        autoSettlement: false,
      });

      // Auto-accept pending invitations and merge guest contacts
      for (const invitation of pendingInvitations) {
        // Add user to group
        await db.insert(groupMembers).values({
          groupId: invitation.groupId,
          userId: newUser.id,
          isAdmin: false,
          isGuest: false,
          invitationId: invitation.id,
        });

        // Update invitation
        await db
          .update(invitations)
          .set({
            status: "accepted",
            acceptedAt: new Date(),
            mergedUserId: newUser.id,
          })
          .where(eq(invitations.id, invitation.id));

        // Merge guest contact if exists
        if (invitation.guestContactId) {
          await mergeGuestContact(invitation.guestContactId, newUser.id);
        }
      }

      // Check for any guest contacts with matching email
      const matchingGuestContacts = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.email, email || ""),
            eq(contacts.userId, newUser.id)
          )
        );

      // Merge any matching guest contacts
      for (const contact of matchingGuestContacts) {
        await mergeGuestContact(contact.id, newUser.id);
      }

    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Error creating user", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ""} ${last_name || ""}`.trim() || email?.split("@")[0];

    try {
      await db
        .update(users)
        .set({
          email: email || "",
          name,
          avatar: image_url,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, id));
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response("Error updating user", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (!id) {
      return new Response("No user ID provided", { status: 400 });
    }

    try {
      await db.delete(users).where(eq(users.clerkUserId, id));
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error deleting user", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}

async function mergeGuestContact(contactId: number, userId: number) {
  try {
    const { settlements, transactions, expenseSplits } = await import("@/lib/db/schema/schema");

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
        userId: userId,
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
