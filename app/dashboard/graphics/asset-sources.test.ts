import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssetSourceError,
  assetSourceErrorMessage,
  buildSupercellFanKitSearchUrl,
  clearClashKingAssetCache,
  fetchClashKingAssets,
  fetchSupercellFanKitAssets,
  isAbortError,
  parseClashKingManifest,
  parseSupercellFanKitResponse,
  searchClashKingManifest,
} from "./asset-sources";

const clashKingManifest = {
  version: 1,
  assets: [
    {
      path: "buildings/home-village/town_hall/level_17.webp",
      category: "buildings",
      display_name: "town hall level 17",
      extension: "webp",
      url: "https://assets.clashk.ing/buildings/home-village/town_hall/level_17.webp",
    },
    {
      path: "logos/ClashKing-logo.png",
      category: "logos",
      display_name: "ClashKing logo",
      extension: "png",
      url: "https://assets.clashk.ing/logos/ClashKing-logo.png",
    },
    {
      path: "icons/unsafe.png",
      category: "icons",
      display_name: "unsafe",
      extension: "png",
      url: "https://example.com/unsafe.png",
    },
    { path: "icons/missing-url.png", category: "icons", display_name: "missing URL" },
    null,
  ],
};

const fanKitResponse = {
  success: true,
  data: [
    {
      id: 102850,
      title: "Barbarian_07",
      computed_alternative_text: "Barbarian alternative",
      generic_url: "https://media.ffycdn.net/eu/supercell/asset.png?width={width}",
      preview_url: "https://media.ffycdn.net/eu/supercell/asset.png?width=800",
      is_image: true,
      object_type: "IMAGE",
      width: 820,
      height: 859,
    },
    {
      id: 12,
      title: "Audio should not enter the canvas",
      generic_url: "https://media.ffycdn.net/eu/supercell/audio.mp3?width={width}",
      is_image: false,
      object_type: "AUDIO",
    },
    {
      id: 13,
      title: "Untrusted host",
      generic_url: "https://example.com/image.png?width={width}",
      is_image: true,
      object_type: "IMAGE",
    },
  ],
  page: 2,
  hasMore: true,
  total: 471,
};

afterEach(() => {
  clearClashKingAssetCache();
  vi.unstubAllGlobals();
});

describe("parseClashKingManifest", () => {
  it("normalizes only real ClashKing CDN entries", () => {
    expect(parseClashKingManifest(clashKingManifest)).toEqual([
      {
        id: "clashking:buildings/home-village/town_hall/level_17.webp",
        name: "town hall level 17",
        source: "https://assets.clashk.ing/buildings/home-village/town_hall/level_17.webp",
        thumbnail: "https://assets.clashk.ing/buildings/home-village/town_hall/level_17.webp",
        sourceKind: "clashking",
        category: "buildings",
      },
      {
        id: "clashking:logos/ClashKing-logo.png",
        name: "ClashKing logo",
        source: "https://assets.clashk.ing/logos/ClashKing-logo.png",
        thumbnail: "https://assets.clashk.ing/logos/ClashKing-logo.png",
        sourceKind: "clashking",
        category: "logos",
      },
    ]);
  });

  it("returns an empty list for malformed manifests", () => {
    expect(parseClashKingManifest(null)).toEqual([]);
    expect(parseClashKingManifest({ assets: "not-an-array" })).toEqual([]);
  });
});

describe("searchClashKingManifest", () => {
  it("supports tokenized search, category filtering, and paging", () => {
    const result = searchClashKingManifest(clashKingManifest, {
      query: "hall 17",
      category: "BUILDINGS",
      page: 1,
      limit: 1,
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]?.name).toBe("town hall level 17");
    expect(result).toMatchObject({ page: 1, limit: 1, total: 1, hasMore: false });
    expect(result.categories).toEqual(["buildings", "logos"]);
  });

  it("clamps invalid paging values and reports whether more results exist", () => {
    const first = searchClashKingManifest(clashKingManifest, { page: -5, limit: 1 });
    const second = searchClashKingManifest(clashKingManifest, { page: 2, limit: 1 });

    expect(first).toMatchObject({ page: 1, limit: 1, total: 2, hasMore: true });
    expect(second).toMatchObject({ page: 2, limit: 1, total: 2, hasMore: false });
    expect(second.assets[0]?.name).toBe("ClashKing logo");
  });
});

describe("parseSupercellFanKitResponse", () => {
  it("normalizes image results and resolves Frontify's width template", () => {
    expect(parseSupercellFanKitResponse(fanKitResponse, 25)).toEqual({
      assets: [
        {
          id: "supercell-fankit:102850",
          name: "Barbarian_07",
          source: "https://media.ffycdn.net/eu/supercell/asset.png?width=820",
          thumbnail: "https://media.ffycdn.net/eu/supercell/asset.png?width=400",
          sourceKind: "supercell-fankit",
          category: "Images",
          width: 820,
          height: 859,
        },
      ],
      page: 2,
      limit: 25,
      total: 471,
      hasMore: true,
      categories: ["Images"],
    });
  });

  it("rejects an unsuccessful or malformed response", () => {
    expect(() => parseSupercellFanKitResponse({ success: false, data: [] })).toThrow(AssetSourceError);
    expect(() => parseSupercellFanKitResponse({ success: true, data: null })).toThrow("invalid response");
  });
});

describe("fan-kit request construction", () => {
  it("requests 50 assets by default", () => {
    expect(new URL(buildSupercellFanKitSearchUrl()).searchParams.get("limit")).toBe("50");
  });

  it("encodes the query and required search parameters", () => {
    const url = new URL(buildSupercellFanKitSearchUrl({ query: "Archer Queen & King", page: 3, limit: 100 }));

    expect(url.origin + url.pathname).toBe("https://fankit.supercell.com/api/assets/search/338");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "Archer Queen & King",
      limit: "50",
      page: "3",
      requestnewflag: "true",
      order: "RELEVANCE",
    });
  });
});

describe("asset source requests", () => {
  it("downloads the large ClashKing manifest once across searches", async () => {
    const fetcher = vi.fn(async () => Response.json(clashKingManifest));
    vi.stubGlobal("fetch", fetcher);

    const first = await fetchClashKingAssets({ query: "town hall" });
    const second = await fetchClashKingAssets({ query: "logo" });

    expect(first.assets[0]?.name).toBe("town hall level 17");
    expect(second.assets[0]?.name).toBe("ClashKing logo");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("forwards abort signals and normalizes ClashKing results", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return new Response(JSON.stringify(clashKingManifest), { status: 200 });
    });

    const result = await fetchClashKingAssets({ query: "logo", signal: controller.signal, fetcher });
    expect(result.assets.map((asset) => asset.name)).toEqual(["ClashKing logo"]);
  });

  it("preserves AbortError so stale searches can be ignored", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    const fetcher = vi.fn(async () => { throw abortError; });

    await expect(fetchSupercellFanKitAssets({ fetcher })).rejects.toBe(abortError);
    expect(isAbortError(abortError)).toBe(true);
  });

  it("returns actionable HTTP and network errors", async () => {
    const httpFetcher = vi.fn(async () => new Response("nope", { status: 503 }));
    const networkFetcher = vi.fn(async () => { throw new TypeError("network down"); });

    await expect(fetchClashKingAssets({ fetcher: httpFetcher })).rejects.toMatchObject({
      name: "AssetSourceError",
      sourceKind: "clashking",
      status: 503,
    });
    await expect(fetchSupercellFanKitAssets({ fetcher: networkFetcher })).rejects.toMatchObject({
      name: "AssetSourceError",
      sourceKind: "supercell-fankit",
    });
    expect(assetSourceErrorMessage(new Error("private detail"))).toBe("The asset library could not be loaded. Please try again.");
  });

});
