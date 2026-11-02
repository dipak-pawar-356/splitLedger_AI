import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { maskErrorForClient } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`notifications:post:${user.id}`, RATE_LIMITS.actions.write);

    const body = await req.json();
    const { type, title, message } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanTitle = sanitizeText(String(title)).slice(0, 150);
    const cleanMessage = sanitizeText(String(message)).slice(0, 1000);

    // Send notification via configured channels safely
    await sendNotification(user.id.toString(), type, cleanTitle, cleanMessage);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating notification:", error);
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}

async function sendNotification(userId: string, type: string, title: string, message: string) {
  // Safe notification delivery logging
  if (process.env.NODE_ENV !== "production") {
    console.log(`Sending ${type} notification to user ${userId}: ${title}`);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    assertRateLimit(`notifications:get:${user.id}`, RATE_LIMITS.api.default);

    return NextResponse.json({ notifications: [] });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    const masked = maskErrorForClient(error);
    return NextResponse.json(masked, { status: masked.statusCode || 500 });
  }
}
