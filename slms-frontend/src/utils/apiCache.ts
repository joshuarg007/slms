// src/utils/apiCache.ts
// Simple in-memory cache for API responses with TTL support

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, Promise<unknown>>();

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if cache entry is stale but still usable
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  /**
   * Get stale data (even if expired) for stale-while-revalidate pattern
   */
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    return entry?.data ?? null;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all entries matching a prefix
   */
  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Fetch with caching support
   * Deduplicates concurrent requests to the same URL
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = DEFAULT_TTL, staleWhileRevalidate = false } = options;

    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // For stale-while-revalidate, return stale data and refresh in background
    if (staleWhileRevalidate) {
      const staleData = this.getStale<T>(key);
      if (staleData !== null) {
        // Refresh in background (don't await)
        this.refreshInBackground(key, fetcher, ttl);
        return staleData;
      }
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Create new request
    const request = fetcher()
      .then((data) => {
        this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Refresh cache in background
   */
  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    // Don't duplicate background requests
    if (this.pendingRequests.has(key)) return;

    const request = fetcher()
      .then((data) => {
        this.set(key, data, ttl);
      })
      .catch((err) => {
        console.warn(`Background cache refresh failed for ${key}:`, err);
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, request);
  }

  /**
   * Invalidate cache entries when data changes
   * Call this after mutations (POST, PUT, DELETE)
   */
  invalidate(patterns: string[]): void {
    for (const pattern of patterns) {
      if (pattern.endsWith("*")) {
        this.deleteByPrefix(pattern.slice(0, -1));
      } else {
        this.delete(pattern);
      }
    }
  }
}

// Singleton instance
export const apiCache = new ApiCache();

// Cache key generators
export const cacheKeys = {
  dashboard: () => "dashboard:metrics",
  leads: (params: Record<string, unknown>) => `leads:${JSON.stringify(params)}`,
  leadsAll: () => "leads:*",
  leaderboard: (metric: string, period: string) => `leaderboard:${metric}:${period}`,
  leaderboardAll: () => "leaderboard:*",
  user: () => "user:me",
  organization: () => "org:current",
  integrations: () => "integrations:list",
  salespeopleStats: (days: number) => `salespeople:stats:${days}`,
  salespeopleAll: () => "salespeople:*",
};

// Cache TTL presets
export const cacheTTL = {
  short: 30 * 1000,      // 30 seconds
  medium: 5 * 60 * 1000, // 5 minutes
  long: 15 * 60 * 1000,  // 15 minutes
  hour: 60 * 60 * 1000,  // 1 hour
};

// Patterns to invalidate on mutations
export const invalidationPatterns = {
  leadMutation: [cacheKeys.leadsAll(), cacheKeys.dashboard()],
  userMutation: [cacheKeys.user()],
  orgMutation: [cacheKeys.organization()],
  integrationMutation: [cacheKeys.integrations()],
};

export default apiCache;
