/**
 * Simple in-memory cache for API responses
 * Prevents duplicate API calls within a short time window
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly defaultTTL = 30000; // 30 seconds

  /**
   * Get cached data or execute fetch function
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Check if data is in cache and still valid
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // Check if request is already pending (prevents duplicate requests)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Execute fetch and cache result
    const promise = fetchFn()
      .then((data) => {
        this.cache.set(key, { data, timestamp: Date.now() });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.pendingRequests.keys()) {
      if (regex.test(key)) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const apiCache = new ApiCache();
