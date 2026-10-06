import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit, cleanupRateLimits } from "../rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    cleanupRateLimits();
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limit", () => {
      const identifier = "user-123";
      const limit = 5;
      const window = 60000; // 1 minute

      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit(identifier, limit, window);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
      }
    });

    it("should block requests exceeding limit", () => {
      const identifier = "user-123";
      const limit = 3;
      const window = 60000;

      // Allow first 3 requests
      for (let i = 0; i < limit; i++) {
        checkRateLimit(identifier, limit, window);
      }

      // 4th request should be blocked
      const result = checkRateLimit(identifier, limit, window);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should reset after window expires", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
      const identifier = "user-expiry-test";
      const limit = 2;
      const window = 100; // 100ms

      // Use up limit
      checkRateLimit(identifier, limit, window);
      checkRateLimit(identifier, limit, window);

      // Should be blocked
      let result = checkRateLimit(identifier, limit, window);
      expect(result.allowed).toBe(false);

      // Advance time past the window
      vi.setSystemTime(new Date("2025-01-01T00:00:01.000Z"));

      // Should be allowed again
      result = checkRateLimit(identifier, limit, window);
      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("resetRateLimit", () => {
    it("should reset rate limit for identifier", () => {
      const identifier = "user-123";
      const limit = 2;
      const window = 60000;

      // Use up limit
      checkRateLimit(identifier, limit, window);
      checkRateLimit(identifier, limit, window);

      // Reset
      resetRateLimit(identifier);

      // Should be allowed again
      const result = checkRateLimit(identifier, limit, window);
      expect(result.allowed).toBe(true);
    });
  });
});
