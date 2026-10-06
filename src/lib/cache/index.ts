/**
 * Enterprise In-Memory LRU Cache with TTL & Tag-based Invalidation
 * Optimized for Sub-millisecond Financial Summary & Dashboard lookups
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export interface CacheOptions {
  ttlMs?: number; // Default TTL in milliseconds (default: 60,000ms / 1 min)
  tags?: string[]; // e.g. ["user:12", "group:45"]
}

export interface CacheStats {
  hits: number;
  misses: number;
  keysCount: number;
  maxSize: number;
  hitRatio: number;
}

export class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private maxCapacity: number;
  private defaultTtlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxCapacity = 2000, defaultTtlMs = 60 * 1000) {
    this.maxCapacity = maxCapacity;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Retrieve cached value or null if expired / not found
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU order: delete and re-insert
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache with optional TTL and invalidation tags
   */
  set<T>(key: string, value: T, options?: CacheOptions): void {
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
    const tags = options?.tags ?? [];

    // Enforce LRU eviction if full
    if (this.store.size >= this.maxCapacity && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      tags,
    });
  }

  /**
   * Read-through helper: Fetch from cache or execute loader and cache result
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys matching any of the provided tags
   */
  invalidateTags(tags: string[]): number {
    const tagSet = new Set(tags);
    let count = 0;

    for (const [key, entry] of this.store.entries()) {
      const hasMatchingTag = entry.tags.some((t) => tagSet.has(t));
      if (hasMatchingTag) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cached keys
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache telemetry statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      keysCount: this.store.size,
      maxSize: this.maxCapacity,
      hitRatio: total === 0 ? 0 : Number((this.hits / total).toFixed(4)),
    };
  }
}

// Global cache instance
export const appCache = new MemoryCache(2000, 60 * 1000);

export default MemoryCache;
