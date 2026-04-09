import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiCache } from "./api-cache";

beforeEach(() => {
  apiCache.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── get ─────────────────────────────────────────────────────────────────────

describe("ApiCache.get — cache miss / hit", () => {
  it("calls fetchFn on cache miss and returns data", async () => {
    const fetchFn = vi.fn().mockResolvedValue("hello");
    const result = await apiCache.get("key1", fetchFn);
    expect(result).toBe("hello");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns cached data on hit without calling fetchFn again", async () => {
    const fetchFn = vi.fn().mockResolvedValue("hello");
    await apiCache.get("key1", fetchFn);
    const result = await apiCache.get("key1", fetchFn);
    expect(result).toBe("hello");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after TTL expires", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("key1", fetchFn, 1000);
    vi.advanceTimersByTime(1001);
    await apiCache.get("key1", fetchFn, 1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does not re-fetch before TTL expires", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("key1", fetchFn, 5000);
    vi.advanceTimersByTime(4999);
    await apiCache.get("key1", fetchFn, 5000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("ApiCache.get — pending request deduplication", () => {
  it("deduplicates concurrent requests for the same key", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    const [r1, r2] = await Promise.all([
      apiCache.get("key1", fetchFn),
      apiCache.get("key1", fetchFn),
    ]);
    expect(r1).toBe("data");
    expect(r2).toBe("data");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("allows a new fetch after pending request resolves", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("key1", fetchFn);
    apiCache.invalidate("key1");
    await apiCache.get("key1", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("ApiCache.get — error handling", () => {
  it("propagates fetch errors", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network fail"));
    await expect(apiCache.get("key1", fetchFn)).rejects.toThrow("network fail");
  });

  it("cleans up pending entry after a failed fetch", async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    await expect(apiCache.get("key1", fetchFn)).rejects.toThrow();
    const result = await apiCache.get("key1", fetchFn);
    expect(result).toBe("ok");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

// ─── invalidate ──────────────────────────────────────────────────────────────

describe("ApiCache.invalidate", () => {
  it("forces a re-fetch on the invalidated key", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("key1", fetchFn);
    apiCache.invalidate("key1");
    await apiCache.get("key1", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does not affect other cached entries", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("key1", fetchFn);
    await apiCache.get("key2", fetchFn);
    apiCache.invalidate("key1");
    await apiCache.get("key2", fetchFn); // still cached
    expect(fetchFn).toHaveBeenCalledTimes(2); // key1 + key2 initial, no extra for key2
  });

  it("is a no-op for non-existent keys", () => {
    expect(() => apiCache.invalidate("does-not-exist")).not.toThrow();
  });
});

// ─── invalidatePattern ───────────────────────────────────────────────────────

describe("ApiCache.invalidatePattern", () => {
  it("removes all keys matching the pattern", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("guild:123:members", fetchFn);
    await apiCache.get("guild:123:wars", fetchFn);
    await apiCache.get("player:456", fetchFn);

    apiCache.invalidatePattern("^guild:123");

    await apiCache.get("guild:123:members", fetchFn);
    await apiCache.get("guild:123:wars", fetchFn);
    await apiCache.get("player:456", fetchFn); // still cached

    expect(fetchFn).toHaveBeenCalledTimes(5); // 3 initial + 2 re-fetches
  });

  it("does not remove non-matching keys", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("player:456", fetchFn);
    apiCache.invalidatePattern("^guild:");
    await apiCache.get("player:456", fetchFn); // still cached
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

// ─── clear ───────────────────────────────────────────────────────────────────

describe("ApiCache.clear", () => {
  it("removes all cached entries", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    await apiCache.get("key1", fetchFn);
    await apiCache.get("key2", fetchFn);
    apiCache.clear();
    await apiCache.get("key1", fetchFn);
    await apiCache.get("key2", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });
});
