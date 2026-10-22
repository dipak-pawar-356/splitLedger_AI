import crypto from "crypto";
import { db } from "@/lib/db";
import { sessions, devices, securityAuditEvents } from "@/lib/db/schema/schema";
import { eq, desc } from "drizzle-orm";
import { threatMonitor } from "./threat-monitor";
import { createNotification } from "@/actions/notifications";
import { ClientContext } from "@/actions/auth-session";

export type RiskTier = "low" | "medium" | "high" | "critical";

export interface GeoCoordinate {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
  timestamp: Date;
}

export interface AnomalyFactor {
  factor: "impossible_travel" | "new_device" | "new_country" | "rapid_ip_switch" | "brute_force_burst" | "token_reuse";
  severity: RiskTier;
  riskPoints: number;
  description: string;
}

export interface AnomalyEvaluationResult {
  riskScore: number; // 0 - 100
  riskTier: RiskTier;
  factors: AnomalyFactor[];
  isBlocked: boolean;
  requiresReAuth: boolean;
  summary: string;
}

/**
 * Standard Coordinates for common Indian and global hubs (fallback lookup for test/dev)
 */
const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  mumbai: { lat: 19.076, lon: 72.8777 },
  delhi: { lat: 28.6139, lon: 77.209 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  pune: { lat: 18.5204, lon: 73.8567 },
  london: { lat: 51.5074, lon: -0.1278 },
  newyork: { lat: 40.7128, lon: -74.006 },
  frankfurt: { lat: 50.1109, lon: 8.6821 },
  singapore: { lat: 1.3521, lon: 103.8198 },
  dubai: { lat: 25.2048, lon: 55.2708 },
};

export function resolveCoordinates(cityName?: string, countryName?: string): { lat: number; lon: number } | null {
  if (!cityName) return null;
  const normalized = cityName.toLowerCase().replace(/[^a-z]/g, "");
  return CITY_COORDINATES[normalized] || null;
}

/**
 * SECTION 7: Haversine Great-Circle Distance Calculation
 * Formula:
 * a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
 * c = 2 ⋅ atan2( √a, √(1−a) )
 * d = R ⋅ c
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Impossible Travel Analysis
 */
export function analyzeTravelVelocity(
  origin: GeoCoordinate,
  destination: GeoCoordinate
): {
  distanceKm: number;
  timeDeltaHours: number;
  velocityKmh: number;
  isImpossibleTravel: boolean;
} {
  const distanceKm = calculateHaversineDistanceKm(origin.lat, origin.lon, destination.lat, destination.lon);
  const timeDeltaMs = Math.abs(destination.timestamp.getTime() - origin.timestamp.getTime());
  const timeDeltaHours = Math.max(0.01, timeDeltaMs / (1000 * 60 * 60));
  const velocityKmh = Math.round(distanceKm / timeDeltaHours);

  // Commercial air travel max ~900 km/h. If required velocity exceeds 900 km/h within 4 hours, flag impossible travel
  const isImpossibleTravel = distanceKm > 500 && velocityKmh > 900 && timeDeltaHours < 4;

  return {
    distanceKm,
    timeDeltaHours: Number(timeDeltaHours.toFixed(2)),
    velocityKmh,
    isImpossibleTravel,
  };
}

/**
 * In-memory sliding window for IP and Email failed login burst tracking
 */
interface FailedAttemptWindow {
  count: number;
  firstAttempt: number;
}
const failedLoginsStore = new Map<string, FailedAttemptWindow>();

export function recordFailedAttempt(identifier: string): number {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const existing = failedLoginsStore.get(identifier);

  if (!existing || now - existing.firstAttempt > windowMs) {
    failedLoginsStore.set(identifier, { count: 1, firstAttempt: now });
    return 1;
  }

  existing.count += 1;
  return existing.count;
}

export function resetFailedAttempts(identifier: string): void {
  failedLoginsStore.delete(identifier);
}

/**
 * Continuous Anomaly & Threat Detection Engine
 */
export async function evaluateAuthenticationRisk(
  userId: number,
  clientContext: ClientContext,
  options?: { isFailedAttempt?: boolean; tokenReuse?: boolean }
): Promise<AnomalyEvaluationResult> {
  const factors: AnomalyFactor[] = [];
  let riskScore = 0;

  // 1. Critical Token Reuse Factor
  if (options?.tokenReuse) {
    factors.push({
      factor: "token_reuse",
      severity: "critical",
      riskPoints: 100,
      description: "Cryptographic token replay / reuse detected on revoked token lineage",
    });
    riskScore += 100;
  }

  // 2. Brute-Force Burst Violation
  const ipKey = clientContext.ipAddress || "127.0.0.1";
  if (options?.isFailedAttempt) {
    const failures = recordFailedAttempt(ipKey);
    if (failures >= 5) {
      factors.push({
        factor: "brute_force_burst",
        severity: failures >= 8 ? "critical" : "high",
        riskPoints: failures >= 8 ? 60 : 45,
        description: `Rapid failed attempts detected (${failures} attempts in 10 minutes)`,
      });
      riskScore += failures >= 8 ? 60 : 45;
    }
  }

  try {
    // 3. Inspect Previous User Sessions for Geolocation & Impossible Travel
    const previousSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastActiveAt))
      .limit(5)
      .catch(() => []);

    if (previousSessions.length > 0 && clientContext.city) {
      const lastSession = previousSessions[0];
      const prevCoords = resolveCoordinates(lastSession.city || "", lastSession.country || "");
      const currCoords = resolveCoordinates(clientContext.city, clientContext.country);

      if (prevCoords && currCoords) {
        const origin: GeoCoordinate = {
          lat: prevCoords.lat,
          lon: prevCoords.lon,
          city: lastSession.city || "",
          country: lastSession.country || "",
          timestamp: lastSession.lastActiveAt,
        };

        const destination: GeoCoordinate = {
          lat: currCoords.lat,
          lon: currCoords.lon,
          city: clientContext.city,
          country: clientContext.country,
          timestamp: new Date(),
        };

        const travel = analyzeTravelVelocity(origin, destination);
        if (travel.isImpossibleTravel) {
          factors.push({
            factor: "impossible_travel",
            severity: "critical",
            riskPoints: 60,
            description: `Impossible travel detected: ${travel.distanceKm} km from ${origin.city} to ${destination.city} at ${travel.velocityKmh} km/h`,
          });
          riskScore += 60;
        }
      }

      // Check New Country
      const userCountries = new Set(previousSessions.map((s) => s.country).filter(Boolean));
      if (clientContext.country && userCountries.size > 0 && !userCountries.has(clientContext.country)) {
        factors.push({
          factor: "new_country",
          severity: "medium",
          riskPoints: 30,
          description: `Login originated from a newly observed country: ${clientContext.country}`,
        });
        riskScore += 30;
      }
    }

    // 4. Device Fingerprint Anomaly Check
    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId))
      .catch(() => []);

    const currentFingerprint = clientContext.fingerprint || `${clientContext.browser}_${clientContext.os}`;
    const recognizedDevice = userDevices.find((d) => d.fingerprint === currentFingerprint);

    if (!recognizedDevice && userDevices.length > 0) {
      factors.push({
        factor: "new_device",
        severity: "medium",
        riskPoints: 25,
        description: `Unrecognized device fingerprint: ${clientContext.deviceName || "Unknown Device"}`,
      });
      riskScore += 25;
    }
  } catch (err) {
    console.warn("Anomaly evaluation degraded gracefully:", err);
  }

  // Bound score [0, 100]
  const finalScore = Math.min(100, Math.max(0, riskScore));

  let riskTier: RiskTier = "low";
  if (finalScore >= 80) riskTier = "critical";
  else if (finalScore >= 60) riskTier = "high";
  else if (finalScore >= 30) riskTier = "medium";

  const isBlocked = riskTier === "critical";
  const requiresReAuth = riskTier === "high" || riskTier === "critical";

  return {
    riskScore: finalScore,
    riskTier,
    factors,
    isBlocked,
    requiresReAuth,
    summary:
      factors.length > 0
        ? factors.map((f) => f.description).join("; ")
        : "Standard authenticated activity. Zero anomalies detected.",
  };
}

/**
 * Automated Threat Mitigation & Notification Dispatcher
 */
export async function dispatchAnomalyMitigation(
  userId: number,
  result: AnomalyEvaluationResult,
  clientContext: ClientContext
): Promise<void> {
  if (result.riskTier === "low") return;

  // 1. Report to Threat Monitor
  threatMonitor.recordEvent({
    type: result.riskTier === "critical" ? "malicious_payload" : "failed_login",
    severity: result.riskTier,
    userId,
    ip: clientContext.ipAddress,
    details: `[RISK SCORE: ${result.riskScore}] ${result.summary}`,
  });

  // 2. Record High-Priority Security Alert Notification
  try {
    await createNotification({
      userId,
      type: "reminder",
      category: "security",
      priority: result.riskTier === "critical" ? "critical" : "high",
      title: result.riskTier === "critical" ? "🚨 Critical Security Alert" : "⚠️ Suspicious Login Detected",
      message: `A login attempt from ${clientContext.city || "Unknown City"}, ${clientContext.country || "Unknown Country"} on ${clientContext.deviceName || "unrecognized device"} was flagged with risk score ${result.riskScore}/100. Reasons: ${result.summary}`,
    });
  } catch (err) {
    console.warn("Could not dispatch user security alert:", err);
  }
}
