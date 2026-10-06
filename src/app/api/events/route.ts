import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { eventBus, RealtimeEvent } from "@/lib/realtime/event-bus";
import { db } from "@/lib/db";
import { groupMembers } from "@/lib/db/schema/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch user groups to subscribe to group events
    const userGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, user.id));

    const encoder = new TextEncoder();
    const unsubscribes: Array<() => void> = [];

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const initData = JSON.stringify({ type: "connected", userId: user.id, timestamp: new Date().toISOString() });
        controller.enqueue(encoder.encode(`event: connected\ndata: ${initData}\n\n`));

        // Listener for events
        const handleEvent = (event: RealtimeEvent) => {
          try {
            const data = JSON.stringify(event);
            controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`));
          } catch (e) {
            console.error("Failed to enqueue event:", e);
          }
        };

        // Subscribe to user channel
        const userUnsub = eventBus.subscribe(`user:${user.id}`, handleEvent);
        unsubscribes.push(userUnsub);

        // Subscribe to each group channel
        userGroups.forEach((g) => {
          const groupUnsub = eventBus.subscribe(`group:${g.groupId}`, handleEvent);
          unsubscribes.push(groupUnsub);
        });

        // 15-second Heartbeat interval
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch (e) {
            clearInterval(heartbeatInterval);
          }
        }, 15000);

        // Cleanup on client abort
        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeatInterval);
          unsubscribes.forEach((unsub) => unsub());
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        });
      },
      cancel() {
        unsubscribes.forEach((unsub) => unsub());
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("SSE Connection error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
