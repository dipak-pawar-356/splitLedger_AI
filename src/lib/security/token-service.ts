import crypto from "crypto";

export interface AccessTokenPayload {
  sub: string; // User publicId
  uid: number; // User database id
  sid: string; // Session publicId
  did?: string | null; // Device publicId
  ver: number; // Token version
  role: "user" | "admin";
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  payload?: AccessTokenPayload;
  error?: "expired" | "invalid_signature" | "malformed" | "invalid_claims";
}

const DEFAULT_SECRET = "splitledger_enterprise_auth_hmac_master_secret_2026";
const TOKEN_ISSUER = "splitledger-ai";
const TOKEN_AUDIENCE = "splitledger-api";
export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const IDLE_SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const ACCESS_TOKEN_COOKIE_NAME = "sl_access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "sl_refresh_token";

function getAuthSecret(): Buffer {
  const raw = process.env.SPLITLEDGER_AUTH_SECRET || process.env.CLERK_SECRET_KEY || DEFAULT_SECRET;
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Generate cryptographically secure base64url string
 */
function toBase64Url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64url");
}

function fromBase64Url(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

/**
 * Constant-time string equality check to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Sign an enterprise JWT access token (15 minutes)
 */
export function signAccessToken(
  claims: Omit<AccessTokenPayload, "iat" | "exp" | "iss" | "aud">,
  expiresInSeconds: number = ACCESS_TOKEN_EXPIRY_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload: AccessTokenPayload = {
    ...claims,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(message)
    .digest("base64url");

  return `${message}.${signature}`;
}

/**
 * Cryptographically verify an access token with constant-time signature check
 */
export function verifyAccessToken(token: string): VerifyTokenResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "malformed" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "malformed" };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const message = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(message)
    .digest("base64url");

  if (!constantTimeCompare(signature, expectedSignature)) {
    return { valid: false, error: "invalid_signature" };
  }

  let payload: AccessTokenPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return { valid: false, error: "malformed" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp <= now) {
    return { valid: false, error: "expired", payload };
  }

  if (payload.iss !== TOKEN_ISSUER || payload.aud !== TOKEN_AUDIENCE) {
    return { valid: false, error: "invalid_claims" };
  }

  return { valid: true, payload };
}

/**
 * Generate high-entropy 256-bit cryptographically random opaque refresh token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Compute SHA-256 hash of refresh token for database persistence
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Secure Cookie Options for Access and Refresh Tokens
 */
export const AUTH_COOKIE_OPTIONS = {
  accessToken: {
    name: ACCESS_TOKEN_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS,
  },
  refreshToken: {
    name: REFRESH_TOKEN_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
  },
};
