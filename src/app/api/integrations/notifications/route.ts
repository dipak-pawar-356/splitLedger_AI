import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireAuth();

  const { type, title, message, metadata } = await req.json();

  if (!type || !title || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Create notification in database
    // await db.insert(notifications).values({
    //   userId: user.id,
    //   type,
    //   title,
    //   message,
    //   metadata: metadata || {},
    //   status: "pending",
    // });

    // Send notification via configured channels (email, WhatsApp, etc.)
    await sendNotification(user.id.toString(), type, title, message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

async function sendNotification(userId: string, type: string, title: string, message: string) {
  // Implementation for sending notifications via various channels
  // This would integrate with email service, WhatsApp API, push notifications, etc.
  console.log(`Sending ${type} notification to user ${userId}: ${title}`);
}

export async function GET(req: NextRequest) {
  const user = await requireAuth();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  try {
    // Fetch notifications from database
    // const notifications = await db
    //   .select()
    //   .from(notifications)
    //   .where(
    //     unreadOnly
    //       ? and(eq(notifications.userId, user.id), isNull(notifications.readAt))
    //       : eq(notifications.userId, user.id)
    //   )
    //   .orderBy(desc(notifications.createdAt))
    //   .limit(50);

    return NextResponse.json({ notifications: [] });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
