import { describe, expect, it } from "vitest";
import { ApiCache } from "./api-cache";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("ApiCache", () => {
  it("deduplicates pending requests for the same key", async () => {
    const cache = new ApiCache();
    let calls = 0;

    const first = cache.get("guild-info-1", () => {
      calls += 1;
      return Promise.resolve("value");
    });
    const second = cache.get("guild-info-1", () => {
      calls += 1;
      return Promise.resolve("other");
    });

    await expect(Promise.all([first, second])).resolves.toEqual(["value", "value"]);
    expect(calls).toBe(1);
  });

  it("does not let an invalidated in-flight request overwrite newer cached data", async () => {
    const cache = new ApiCache();
    const stale = deferred<string>();

    const staleRequest = cache.get("guild-info-1", () => stale.promise, 1000);

    cache.invalidate("guild-info-1");
    await expect(
      cache.get("guild-info-1", () => Promise.resolve("fresh"), 1000)
    ).resolves.toBe("fresh");

    stale.resolve("stale");
    await expect(staleRequest).resolves.toBe("stale");
    await expect(
      cache.get("guild-info-1", () => Promise.resolve("next"), 1000)
    ).resolves.toBe("fresh");
  });

  it("does not let pattern-invalidated in-flight requests overwrite newer cached data", async () => {
    const cache = new ApiCache();
    const stale = deferred<string[]>();

    const staleRequest = cache.get("rosters-groups-1", () => stale.promise, 1000);

    cache.invalidatePattern("^rosters-");
    await expect(
      cache.get("rosters-groups-1", () => Promise.resolve(["fresh"]), 1000)
    ).resolves.toEqual(["fresh"]);

    stale.resolve(["stale"]);
    await expect(staleRequest).resolves.toEqual(["stale"]);
    await expect(
      cache.get("rosters-groups-1", () => Promise.resolve(["next"]), 1000)
    ).resolves.toEqual(["fresh"]);
  });
});
