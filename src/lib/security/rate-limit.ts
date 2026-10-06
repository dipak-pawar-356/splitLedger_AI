/**
 * Rate Limiting
 * 
 * Simple in-memory rate limiter for API routes and server actions
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier (user ID, IP address, etc.)
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
      remaining: limit - 1,
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
    remaining: limit - store.count,
    resetTime: store.resetTime,
  };
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
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // API routes
  api: {
    default: { limit: 100, windowMs: 60000 }, // 100 requests per minute
    strict: { limit: 20, windowMs: 60000 }, // 20 requests per minute
    loose: { limit: 1000, windowMs:60000 }, // 1000 requests per minute
  },
  // Server actions
  actions: {
    default: { limit: 50, windowMs: 60000 }, // 50 actions per minute
    write: { limit: 20, windowMs: 60000 }, // 20 write actions per minute
    delete: { limit: 10, windowMs: 60000 }, // 10 delete actions per minute
  },
  // Authentication
  auth: {
    login: { limit: 5, windowMs: 300000 }, // 5 login attempts per 5 minutes
    signup: { limit: 3, windowMs: 3600000 }, // 3 signup attempts per hour
    passwordReset: { limit: 3, windowMs: 3600000 }, // 3 password reset attempts per hour
  },
} as const;
