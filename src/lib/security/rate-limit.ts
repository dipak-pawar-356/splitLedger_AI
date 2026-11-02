/**
 * Rate Limiting & Abuse Prevention Engine
 * 
 * In-memory token-bucket / sliding window rate limiter for API routes,
 * server actions, authentication attempts, AI queries, exports, and uploads.
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier (user ID, IP address, action key)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const store = rateLimitStore.get(identifier);

  if (!store || now > store.resetTime) {
    // Create new window
    const newStore: RateLimitStore = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, newStore);
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetTime: newStore.resetTime,
    };
  }

  // Check if limit exceeded
  if (store.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: store.resetTime,
    };
  }

  // Increment count
  store.count++;
  return {
    allowed: true,
    remaining: Math.max(0, limit - store.count),
    resetTime: store.resetTime,
  };
}

/**
 * Assert rate limit and throw a friendly rate limit error if exceeded
 */
export function assertRateLimit(
  identifier: string,
  config: { limit: number; windowMs: number },
  errorMessage?: string
): void {
  const result = checkRateLimit(identifier, config.limit, config.windowMs);
  if (!result.allowed) {
    const secondsRemaining = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
    const { ValidationError } = require("@/lib/errors");
    throw new ValidationError(
      errorMessage || `Too many requests. Please wait ${secondsRemaining} seconds before trying again.`
    );
  }
}

/**
 * Reset rate limit for a specific identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [identifier, store] of rateLimitStore.entries()) {
    if (now > store.resetTime) {
      rateLimitStore.delete(identifier);
    }
  }
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Rate limit configurations for different endpoints and actions
 */
export const RATE_LIMITS = {
  // API routes
  api: {
    default: { limit: 100, windowMs: 60000 }, // 100 requests per minute
    strict: { limit: 20, windowMs: 60000 }, // 20 requests per minute
    loose: { limit: 1000, windowMs: 60000 }, // 1000 requests per minute
  },
  // Server actions
  actions: {
    default: { limit: 60, windowMs: 60000 }, // 60 actions per minute
    write: { limit: 30, windowMs: 60000 }, // 30 write actions per minute
    delete: { limit: 15, windowMs: 60000 }, // 15 delete actions per minute
  },
  // Authentication & Security
  auth: {
    login: { limit: 5, windowMs: 300000 }, // 5 login attempts per 5 minutes
    signup: { limit: 5, windowMs: 3600000 }, // 5 signup attempts per hour
    passwordReset: { limit: 3, windowMs: 3600000 }, // 3 password reset attempts per hour
    otp: { limit: 5, windowMs: 600000 }, // 5 OTP attempts per 10 minutes
  },
  // Sensitive Domain Workflows
  ai: {
    assistant: { limit: 30, windowMs: 60000 }, // 30 AI queries per minute
    chatbot: { limit: 30, windowMs: 60000 },
  },
  exports: {
    reports: { limit: 15, windowMs: 60000 }, // 15 exports per minute
    data: { limit: 5, windowMs: 300000 }, // 5 full data dumps per 5 minutes
  },
  uploads: {
    receipts: { limit: 20, windowMs: 60000 }, // 20 uploads per minute
    avatars: { limit: 10, windowMs: 60000 },
  },
  transactions: {
    create: { limit: 40, windowMs: 60000 },
    update: { limit: 40, windowMs: 60000 },
    delete: { limit: 20, windowMs: 60000 },
  },
  search: {
    query: { limit: 60, windowMs: 60000 },
  },
  settings: {
    profile: { limit: 30, windowMs: 60000 },
  },
  notifications: {
    broadcast: { limit: 30, windowMs: 60000 },
  },
} as const;
