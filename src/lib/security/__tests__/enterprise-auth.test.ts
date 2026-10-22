import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  constantTimeCompare,
  ACCESS_TOKEN_EXPIRY_SECONDS,
} from "@/lib/security/token-service";
import {
  calculateHaversineDistanceKm,
  analyzeTravelVelocity,
  evaluateAuthenticationRisk,
  recordFailedAttempt,
  resetFailedAttempts,
  GeoCoordinate,
} from "@/lib/security/anomaly-detector";

describe("Enterprise Authentication & Cryptographic Security (Milestone 2)", () => {
  describe("1. Access Token Cryptography & Signature Verification", () => {
    it("should generate a valid signed JWT access token with required financial claims", () => {
      const token = signAccessToken({
        sub: "usr_test_123",
        uid: 42,
        sid: "sess_test_789",
        did: "dev_test_456",
        ver: 1,
        role: "user",
      });

      expect(typeof token).toBe("string");
      const parts = token.split(".");
      expect(parts.length).toBe(3);

      const verification = verifyAccessToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.sub).toBe("usr_test_123");
      expect(verification.payload?.uid).toBe(42);
      expect(verification.payload?.sid).toBe("sess_test_789");
      expect(verification.payload?.did).toBe("dev_test_456");
      expect(verification.payload?.ver).toBe(1);
      expect(verification.payload?.iss).toBe("splitledger-ai");
      expect(verification.payload?.aud).toBe("splitledger-api");
      expect(verification.payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("should reject tampered JWT payloads or signatures", () => {
      const token = signAccessToken({
        sub: "usr_legit",
        uid: 1,
        sid: "sess_1",
        ver: 1,
        role: "user",
      });

      const parts = token.split(".");
      // Tamper with payload (change user id to 999)
      const tamperedPayload = Buffer.from(JSON.stringify({ sub: "usr_hacker", uid: 999 })).toString("base64url");
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = verifyAccessToken(tamperedToken);
      expect(res.valid).toBe(false);
      expect(res.error).toBe("invalid_signature");
    });

    it("should reject expired access tokens", () => {
      // Create token expired 10 seconds ago
      const expiredToken = signAccessToken(
        {
          sub: "usr_expired",
          uid: 2,
          sid: "sess_expired",
          ver: 1,
          role: "user",
        },
        -10
      );

      const res = verifyAccessToken(expiredToken);
      expect(res.valid).toBe(false);
      expect(res.error).toBe("expired");
    });

    it("should perform constant-time comparison accurately", () => {
      expect(constantTimeCompare("secret_token_123", "secret_token_123")).toBe(true);
      expect(constantTimeCompare("secret_token_123", "secret_token_456")).toBe(false);
      expect(constantTimeCompare("short", "longer_token")).toBe(false);
    });
  });

  describe("2. Refresh Tokens & Zero Plaintext Database Storage", () => {
    it("should generate high-entropy 256-bit cryptographically secure refresh tokens", () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      expect(typeof token1).toBe("string");
      expect(token1.length).toBeGreaterThanOrEqual(40);
      expect(token1).not.toBe(token2);
    });

    it("should hash refresh tokens using SHA-256 for secure database persistence", () => {
      const rawToken = generateRefreshToken();
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(rawToken);
      expect(hash1.length).toBe(64); // SHA-256 hex digest length
    });
  });

  describe("3. Haversine Distance & Impossible Travel Anomaly Detection", () => {
    it("should calculate accurate great-circle distances between geographical coordinates", () => {
      // Mumbai to Pune is ~120 km
      const distance = calculateHaversineDistanceKm(19.076, 72.8777, 18.5204, 73.8567);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(150);

      // Mumbai to New York is ~12,500 km
      const globalDistance = calculateHaversineDistanceKm(19.076, 72.8777, 40.7128, -74.006);
      expect(globalDistance).toBeGreaterThan(12000);
      expect(globalDistance).toBeLessThan(13000);
    });

    it("should detect impossible travel anomalies when speed exceeds commercial flight limits", () => {
      const mumbai: GeoCoordinate = {
        lat: 19.076,
        lon: 72.8777,
        city: "Mumbai",
        country: "India",
        timestamp: new Date("2026-10-22T10:00:00Z"),
      };

      // Login from Frankfurt 30 minutes later (distance ~6,500 km)
      const frankfurt: GeoCoordinate = {
        lat: 50.1109,
        lon: 8.6821,
        city: "Frankfurt",
        country: "Germany",
        timestamp: new Date("2026-10-22T10:30:00Z"),
      };

      const result = analyzeTravelVelocity(mumbai, frankfurt);
      expect(result.distanceKm).toBeGreaterThan(6000);
      expect(result.velocityKmh).toBeGreaterThan(900);
      expect(result.isImpossibleTravel).toBe(true);
    });

    it("should recognize feasible travel within reasonable time windows", () => {
      const mumbai: GeoCoordinate = {
        lat: 19.076,
        lon: 72.8777,
        city: "Mumbai",
        timestamp: new Date("2026-10-22T08:00:00Z"),
      };

      // Login from Pune 4 hours later (distance ~120 km -> velocity ~30 km/h)
      const pune: GeoCoordinate = {
        lat: 18.5204,
        lon: 73.8567,
        city: "Pune",
        timestamp: new Date("2026-10-22T12:00:00Z"),
      };

      const result = analyzeTravelVelocity(mumbai, pune);
      expect(result.isImpossibleTravel).toBe(false);
    });
  });

  describe("4. Brute-Force Burst Tracking & Risk Scoring", () => {
    it("should track failed login velocity in sliding window", () => {
      const testIp = `test_ip_${Date.now()}`;
      expect(recordFailedAttempt(testIp)).toBe(1);
      expect(recordFailedAttempt(testIp)).toBe(2);
      expect(recordFailedAttempt(testIp)).toBe(3);
      resetFailedAttempts(testIp);
      expect(recordFailedAttempt(testIp)).toBe(1);
    });

    it("should assign critical risk tier and block access on token reuse", async () => {
      const evalResult = await evaluateAuthenticationRisk(
        999,
        { ipAddress: "127.0.0.1", browser: "Chrome", os: "Windows" },
        { tokenReuse: true }
      );

      expect(evalResult.riskScore).toBe(100);
      expect(evalResult.riskTier).toBe("critical");
      expect(evalResult.isBlocked).toBe(true);
      expect(evalResult.requiresReAuth).toBe(true);
      expect(evalResult.factors.some((f) => f.factor === "token_reuse")).toBe(true);
    });
  });
});
