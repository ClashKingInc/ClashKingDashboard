/**
 * Simple in-memory cache for API responses
 * Prevents duplicate API calls within a short time window
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
}

export class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
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
      return pending.promise;
    }

    // Execute fetch and cache result
    const pendingRequest: PendingRequest<T> = {
      promise: Promise.resolve() as Promise<T>,
    };
    const promise = Promise.resolve()
      .then(fetchFn)
      .then((data) => {
        if (this.pendingRequests.get(key) === pendingRequest) {
          this.cache.set(key, { data, timestamp: Date.now() });
        }
        return data;
      })
      .finally(() => {
        if (this.pendingRequests.get(key) === pendingRequest) {
          this.pendingRequests.delete(key);
        }
      });

    pendingRequest.promise = promise;
    this.pendingRequests.set(key, pendingRequest);
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
    const keysToInvalidate = new Set<string>();

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.add(key);
      }
    }
    for (const key of this.pendingRequests.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.add(key);
      }
    }

    for (const key of keysToInvalidate) {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
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
