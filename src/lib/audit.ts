import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema/schema";
import { generatePublicId } from "@/lib/utils";
import { eventBus } from "@/lib/realtime/event-bus";

export interface RecordAuditLogInput {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId: number;
  entityPublicId?: string;
  changes?: Record<string, any> | null;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  device?: string | null;
  groupId?: number | null;
}

/**
 * SECTION 4: Immutable Audit Logging Service
 */
export async function recordAuditLog(data: RecordAuditLogInput): Promise<string | null> {
  try {
    const publicId = generatePublicId("aud");

    const [newLog] = await db
      .insert(auditLogs)
      .values({
        publicId,
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityPublicId: data.entityPublicId || null,
        changes: data.changes || null,
        beforeData: data.beforeData || null,
        afterData: data.afterData || null,
        reason: data.reason || null,
        status: "success",
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        browser: data.browser || null,
        device: data.device || null,
      })
      .returning();

    // Broadcast real-time activity event
    if (data.groupId) {
      eventBus.broadcast({
        channel: `group:${data.groupId}`,
        type: "activity_logged",
        payload: {
          auditId: publicId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
        },
      });
    }

    if (data.userId) {
      eventBus.broadcast({
        channel: `user:${data.userId}`,
        type: "activity_logged",
        payload: {
          auditId: publicId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
        },
      });
    }

    return publicId;
  } catch (error) {
    console.error("Failed to record immutable audit log:", error);
    return null;
  }
}
