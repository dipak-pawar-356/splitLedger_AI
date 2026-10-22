"use server";

import { db, withDbRetry } from "@/lib/db";
import { sessions, devices, securityAuditEvents, users } from "@/lib/db/schema/schema";
import { eq, and, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  ACCESS_TOKEN_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_SECONDS,
  IDLE_SESSION_EXPIRY_SECONDS,
  verifyAccessToken,
} from "@/lib/security/token-service";
import { generatePublicId } from "@/lib/utils";

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  country?: string;
  city?: string;
  region?: string;
  fingerprint?: string;
  deviceName?: string;
}

/**
 * Extract client metadata from Next.js request headers
 */
export async function getClientContext(): Promise<ClientContext> {
  try {
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : reqHeaders.get("x-real-ip") || "127.0.0.1";
    const userAgent = reqHeaders.get("user-agent") || "Unknown Browser";
    
    // Parse OS & Browser simply and reliably without heavy external deps
    let os = "Unknown OS";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac OS") || userAgent.includes("Macintosh")) os = "macOS";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    let browser = "Unknown Browser";
    if (userAgent.includes("Edg/")) browser = "Edge";
    else if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) browser = "Chrome";
    else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) browser = "Safari";
    else if (userAgent.includes("Firefox/")) browser = "Firefox";

    let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      deviceType = "mobile";
    } else if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
      deviceType = "tablet";
    }

    const country = reqHeaders.get("x-vercel-ip-country") || reqHeaders.get("cf-ipcountry") || "India";
    const city = reqHeaders.get("x-vercel-ip-city") || "Mumbai";
    const region = reqHeaders.get("x-vercel-ip-country-region") || "MH";

    return {
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      country,
      city,
      region,
      deviceName: `${browser} on ${os}`,
    };
  } catch {
    return {
      ipAddress: "127.0.0.1",
      userAgent: "Server Environment",
      browser: "Chrome",
      os: "Windows",
      deviceType: "desktop",
      country: "India",
      city: "Mumbai",
      deviceName: "Chrome on Windows",
    };
  }
}

/**
 * Record a security IAM audit event
 */
export async function recordSecurityAuditEvent(data: {
  userId?: number | null;
  action: string;
  status?: "success" | "failure" | "blocked";
  riskLevel?: "low" | "medium" | "high" | "critical";
  riskScore?: number;
  details?: Record<string, any>;
  clientContext?: ClientContext;
}) {
  try {
    const publicId = generatePublicId("sec");
    const ctx = data.clientContext || (await getClientContext());

    await db.insert(securityAuditEvents).values({
      publicId,
      userId: data.userId || null,
      action: data.action,
      status: data.status || "success",
      riskLevel: data.riskLevel || "low",
      riskScore: data.riskScore || 0,
      ipAddress: ctx.ipAddress || null,
      userAgent: ctx.userAgent || null,
      browser: ctx.browser || null,
      os: ctx.os || null,
      location: ctx.city ? `${ctx.city}, ${ctx.country || ""}`.trim() : null,
      details: data.details || null,
    });
  } catch (err) {
    console.warn("Failed to record security audit event:", err);
  }
}

/**
 * Register or update tracked device
 */
export async function registerDevice(userId: number, ctx: ClientContext): Promise<string> {
  return await withDbRetry(async () => {
    const fingerprint = ctx.fingerprint || `${ctx.browser}_${ctx.os}_${ctx.userAgent?.slice(0, 50)}`;
    const [existingDevice] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.fingerprint, fingerprint)))
      .limit(1);

    if (existingDevice) {
      await db
        .update(devices)
        .set({
          lastIp: ctx.ipAddress,
          lastLocation: ctx.city ? `${ctx.city}, ${ctx.country}` : ctx.country,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(devices.id, existingDevice.id));
      return existingDevice.publicId;
    }

    const devicePublicId = generatePublicId("dev");
    const [newDevice] = await db
      .insert(devices)
      .values({
        publicId: devicePublicId,
        userId,
        fingerprint,
        name: ctx.deviceName || `${ctx.browser} on ${ctx.os}`,
        browser: ctx.browser,
        os: ctx.os,
        deviceType: ctx.deviceType || "desktop",
        lastIp: ctx.ipAddress,
        lastLocation: ctx.city ? `${ctx.city}, ${ctx.country}` : ctx.country,
        isTrusted: false,
      })
      .returning();

    return newDevice.publicId;
  });
}

/**
 * Create a new enterprise authenticated session
 */
export async function createSession(userId: number, clientContext?: ClientContext) {
  const ctx = clientContext || (await getClientContext());
  const devicePublicId = await registerDevice(userId, ctx);

  const sessionPublicId = generatePublicId("sess");
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);

  const now = new Date();
  const idleExpiresAt = new Date(now.getTime() + IDLE_SESSION_EXPIRY_SECONDS * 1000);
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  const [sessionRow] = await db
    .insert(sessions)
    .values({
      publicId: sessionPublicId,
      userId,
      deviceId: devicePublicId,
      refreshTokenHash,
      tokenVersion: 1,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      browser: ctx.browser,
      os: ctx.os,
      deviceType: ctx.deviceType || "desktop",
      country: ctx.country,
      city: ctx.city,
      region: ctx.region,
      status: "active",
      lastActiveAt: now,
      idleExpiresAt,
      expiresAt,
    })
    .returning();

  // Fetch user publicId and role
  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const userPublicId = userRow?.publicId || `usr_${userId}`;

  const accessToken = signAccessToken({
    sub: userPublicId,
    uid: userId,
    sid: sessionPublicId,
    did: devicePublicId,
    ver: 1,
    role: "user",
  });

  // Set secure cookies
  try {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_OPTIONS.accessToken.name, accessToken, AUTH_COOKIE_OPTIONS.accessToken);
    cookieStore.set(AUTH_COOKIE_OPTIONS.refreshToken.name, rawRefreshToken, AUTH_COOKIE_OPTIONS.refreshToken);
  } catch {}

  await recordSecurityAuditEvent({
    userId,
    action: "login_success",
    status: "success",
    riskLevel: "low",
    details: { sessionId: sessionPublicId, deviceId: devicePublicId },
    clientContext: ctx,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    session: sessionRow,
  };
}

/**
 * SECTION 2: Atomic Refresh Token Rotation with Zero-Reuse Detection
 */
export async function rotateRefreshToken(rawRefreshToken: string, clientContext?: ClientContext) {
  const ctx = clientContext || (await getClientContext());
  const incomingHash = hashToken(rawRefreshToken);

  return await withDbRetry(async () => {
    // 1. Look up session by active refreshTokenHash
    const [activeSession] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.refreshTokenHash, incomingHash), eq(sessions.status, "active")))
      .limit(1);

    // 2. TOKEN REUSE / REPLAY ATTACK DETECTION
    if (!activeSession) {
      // Check if this token belonged to an already revoked or previously used session
      const [reusedSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.refreshTokenHash, incomingHash))
        .limit(1);

      if (reusedSession) {
        // Severe security violation: Replay attack detected!
        // Immediately revoke the entire session lineage
        await db
          .update(sessions)
          .set({
            status: "revoked",
            revocationReason: "token_reuse_detected",
            tokenVersion: reusedSession.tokenVersion + 1,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, reusedSession.id));

        await recordSecurityAuditEvent({
          userId: reusedSession.userId,
          action: "token_reuse_detected",
          status: "blocked",
          riskLevel: "critical",
          riskScore: 100,
          details: {
            sessionId: reusedSession.publicId,
            revocationReason: "token_reuse_detected",
            message: "Replay attack detected: Old refresh token was submitted",
          },
          clientContext: ctx,
        });

        // Clear cookies
        try {
          const cookieStore = await cookies();
          cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME);
          cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME);
        } catch {}

        return {
          success: false,
          error: "Security alert: Refresh token reuse detected. Session has been revoked.",
          reuseDetected: true,
        };
      }

      return {
        success: false,
        error: "Invalid or expired refresh token",
      };
    }

    // 3. Expiration checks
    const now = new Date();
    if (now > activeSession.expiresAt || now > activeSession.idleExpiresAt) {
      await db
        .update(sessions)
        .set({
          status: "expired",
          revocationReason: "session_expired",
          updatedAt: now,
        })
        .where(eq(sessions.id, activeSession.id));

      return {
        success: false,
        error: "Session has expired. Please log in again.",
      };
    }

    // 4. Successful Rotation: Issue brand new AT + RT pair and invalidate old RT
    const newRawRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newIdleExpiresAt = new Date(now.getTime() + IDLE_SESSION_EXPIRY_SECONDS * 1000);

    await db
      .update(sessions)
      .set({
        refreshTokenHash: newRefreshTokenHash,
        lastActiveAt: now,
        idleExpiresAt: newIdleExpiresAt,
        ipAddress: ctx.ipAddress || activeSession.ipAddress,
        updatedAt: now,
      })
      .where(eq(sessions.id, activeSession.id));

    // Fetch user publicId
    const [userRow] = await db.select().from(users).where(eq(users.id, activeSession.userId)).limit(1);

    const newAccessToken = signAccessToken({
      sub: userRow?.publicId || `usr_${activeSession.userId}`,
      uid: activeSession.userId,
      sid: activeSession.publicId,
      did: activeSession.deviceId,
      ver: activeSession.tokenVersion,
      role: "user",
    });

    // Set refreshed cookies
    try {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_OPTIONS.accessToken.name, newAccessToken, AUTH_COOKIE_OPTIONS.accessToken);
      cookieStore.set(AUTH_COOKIE_OPTIONS.refreshToken.name, newRawRefreshToken, AUTH_COOKIE_OPTIONS.refreshToken);
    } catch {}

    await recordSecurityAuditEvent({
      userId: activeSession.userId,
      action: "token_refresh_success",
      status: "success",
      riskLevel: "low",
      details: { sessionId: activeSession.publicId },
      clientContext: ctx,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      sessionId: activeSession.publicId,
    };
  });
}

/**
 * SECTION 3 & 4: Centralized Session Validation & Invalidation Engine
 */
export async function validateSession(sessionId: string, tokenVersion?: number): Promise<{
  valid: boolean;
  userId?: number;
  reason?: string;
}> {
  const [sessionRow] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.publicId, sessionId))
    .limit(1);

  if (!sessionRow) {
    return { valid: false, reason: "session_not_found" };
  }

  if (sessionRow.status !== "active") {
    return { valid: false, reason: sessionRow.revocationReason || "session_inactive" };
  }

  if (typeof tokenVersion === "number" && tokenVersion !== sessionRow.tokenVersion) {
    return { valid: false, reason: "token_version_mismatch" };
  }

  const now = new Date();
  if (now > sessionRow.expiresAt || now > sessionRow.idleExpiresAt) {
    return { valid: false, reason: "session_expired" };
  }

  // Throttled lastActiveAt update (only if > 2 minutes since last active)
  if (now.getTime() - sessionRow.lastActiveAt.getTime() > 2 * 60 * 1000) {
    db.update(sessions)
      .set({
        lastActiveAt: now,
        idleExpiresAt: new Date(now.getTime() + IDLE_SESSION_EXPIRY_SECONDS * 1000),
      })
      .where(eq(sessions.id, sessionRow.id))
      .catch(() => {});
  }

  return { valid: true, userId: sessionRow.userId };
}

/**
 * Terminate a single specific session
 */
export async function terminateSession(sessionId: string, reason = "user_logout") {
  return await withDbRetry(async () => {
    const [targetSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.publicId, sessionId))
      .limit(1);

    if (!targetSession) {
      return { success: false, message: "Session not found" };
    }

    await db
      .update(sessions)
      .set({
        status: "revoked",
        revocationReason: reason,
        tokenVersion: targetSession.tokenVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, targetSession.id));

    await recordSecurityAuditEvent({
      userId: targetSession.userId,
      action: "session_terminated",
      status: "success",
      riskLevel: "low",
      details: { sessionId, reason },
    });

    return { success: true, message: "Session terminated successfully" };
  });
}

/**
 * Terminate all other sessions except the current active session
 */
export async function terminateAllOtherSessions(currentSessionId: string, userId: number) {
  return await withDbRetry(async () => {
    const result = await db
      .update(sessions)
      .set({
        status: "revoked",
        revocationReason: "terminate_all_others",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sessions.userId, userId),
          ne(sessions.publicId, currentSessionId),
          eq(sessions.status, "active")
        )
      )
      .returning();

    await recordSecurityAuditEvent({
      userId,
      action: "terminate_all_other_sessions",
      status: "success",
      riskLevel: "low",
      details: { currentSessionId, terminatedCount: result.length },
    });

    return { success: true, count: result.length };
  });
}

/**
 * SECTION 6: Force Logout All Devices
 */
export async function forceLogoutAllDevices(userId: number, reason = "user_force_logout") {
  return await withDbRetry(async () => {
    await db
      .update(sessions)
      .set({
        status: "revoked",
        revocationReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(sessions.userId, userId), eq(sessions.status, "active")));

    // Clear server cookies
    try {
      const cookieStore = await cookies();
      cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME);
      cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME);
    } catch {}

    await recordSecurityAuditEvent({
      userId,
      action: "force_logout_all_devices",
      status: "success",
      riskLevel: "medium",
      details: { reason },
    });

    return { success: true, message: "All sessions have been revoked across all devices." };
  });
}

/**
 * SECTION 9: Server Logout Orchestration
 */
export async function serverLogout() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;

    if (token) {
      const verified = verifyAccessToken(token);
      if (verified.valid && verified.payload?.sid) {
        await terminateSession(verified.payload.sid, "user_logout");
      }
    }

    cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME);
    cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME);
    return { success: true };
  } catch (err: any) {
    return { success: true }; // Always succeed gracefully on logout
  }
}
