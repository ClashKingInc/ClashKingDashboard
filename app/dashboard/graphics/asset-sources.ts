export const CLASHKING_ASSET_MANIFEST_URL = "https://assets.clashk.ing/manifest.json";
export const SUPERCELL_FAN_KIT_SEARCH_URL = "https://fankit.supercell.com/api/assets/search/338";

export type LibraryAssetSourceKind = "clashking" | "supercell-fankit";

export interface LibraryAsset {
  id: string;
  name: string;
  source: string;
  thumbnail: string;
  sourceKind: LibraryAssetSourceKind;
  category: string;
  width?: number;
  height?: number;
}

export interface LibraryAssetPage {
  assets: LibraryAsset[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  categories: string[];
}

export interface AssetSearchOptions {
  query?: string;
  page?: number;
  limit?: number;
  category?: string;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export class AssetSourceError extends Error {
  readonly status?: number;
  readonly sourceKind: LibraryAssetSourceKind;

  constructor(message: string, sourceKind: LibraryAssetSourceKind, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssetSourceError";
    this.sourceKind = sourceKind;
    this.status = status;
  }
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;
const CLASHKING_ASSET_ORIGIN = "https://assets.clashk.ing";
const SUPERCELL_MEDIA_ORIGIN_SUFFIX = ".ffycdn.net";
const FAN_KIT_THUMBNAIL_WIDTH = 400;
const FAN_KIT_EDITOR_WIDTH = 1600;

let clashKingManifestPromise: Promise<unknown> | null = null;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function pageNumber(value: number | undefined): number {
  return Number.isSafeInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

function pageSize(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(value!, MAX_PAGE_SIZE);
}

function safeHttpUrl(value: unknown, allowed: (url: URL) => boolean): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !allowed(url)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizedSearchText(value: string): string {
  return value.toLocaleLowerCase().replaceAll(/[_/.-]+/g, " ").replaceAll(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function paginateAssets(
  assets: LibraryAsset[],
  options: Pick<AssetSearchOptions, "page" | "limit">,
  categories: string[],
): LibraryAssetPage {
  const page = pageNumber(options.page);
  const limit = pageSize(options.limit);
  const offset = (page - 1) * limit;

  return {
    assets: assets.slice(offset, offset + limit),
    page,
    limit,
    total: assets.length,
    hasMore: offset + limit < assets.length,
    categories,
  };
}

export function parseClashKingManifest(payload: unknown): LibraryAsset[] {
  if (!isRecord(payload) || !Array.isArray(payload.assets)) return [];

  const assets: LibraryAsset[] = [];
  for (const candidate of payload.assets) {
    if (!isRecord(candidate)) continue;

    const path = stringValue(candidate.path);
    const source = safeHttpUrl(candidate.url, (url) => url.origin === CLASHKING_ASSET_ORIGIN);
    if (!path || !source) continue;

    const name = stringValue(candidate.display_name) ?? titleCase(path.split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? path);
    const category = stringValue(candidate.category) ?? titleCase(path.split("/")[0] ?? "Other");
    assets.push({
      id: `clashking:${path}`,
      name,
      source,
      thumbnail: source,
      sourceKind: "clashking",
      category,
    });
  }

  return assets;
}

function fanKitMediaUrl(candidate: UnknownRecord, key: "generic_url" | "preview_url", requestedWidth?: number): string | undefined {
  const url = safeHttpUrl(candidate[key], (parsed) => parsed.hostname === "media.ffycdn.net" || parsed.hostname.endsWith(SUPERCELL_MEDIA_ORIGIN_SUFFIX));
  if (!url) return undefined;

  if (key === "generic_url" && /(?:\{width\}|%7Bwidth%7D)/i.test(url)) {
    const width = requestedWidth ?? positiveInteger(candidate.width) ?? 1600;
    return url.replace(/(?:\{width\}|%7Bwidth%7D)/i, String(width));
  }
  return url;
}

export function parseSupercellFanKitResponse(payload: unknown, requestedLimit = DEFAULT_PAGE_SIZE): LibraryAssetPage {
  if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.data)) {
    throw new AssetSourceError("Supercell Fan Kit returned an invalid response.", "supercell-fankit");
  }

  const assets: LibraryAsset[] = [];
  for (const candidate of payload.data) {
    if (!isRecord(candidate) || candidate.is_image !== true) continue;

    const id = positiveInteger(candidate.id);
    const originalWidth = positiveInteger(candidate.width);
    // Full-resolution fan-kit originals can be tens of megabytes. The editor
    // source is capped at 1600 px, which is enough for the supported canvases
    // while making drag-to-canvas feel immediate.
    const source = fanKitMediaUrl(candidate, "generic_url", Math.min(originalWidth ?? FAN_KIT_EDITOR_WIDTH, FAN_KIT_EDITOR_WIDTH))
      ?? fanKitMediaUrl(candidate, "preview_url");
    if (!id || !source) continue;

    const preview = fanKitMediaUrl(candidate, "generic_url", Math.min(originalWidth ?? FAN_KIT_THUMBNAIL_WIDTH, FAN_KIT_THUMBNAIL_WIDTH))
      ?? fanKitMediaUrl(candidate, "preview_url")
      ?? source;
    const name = stringValue(candidate.title) ?? stringValue(candidate.computed_alternative_text) ?? `Fan Kit asset ${id}`;
    const objectType = stringValue(candidate.object_type) ?? "Image";
    const category = objectType.toLocaleLowerCase() === "image" ? "Images" : titleCase(objectType.toLocaleLowerCase());
    assets.push({
      id: `supercell-fankit:${id}`,
      name,
      source,
      thumbnail: preview,
      sourceKind: "supercell-fankit",
      category,
      width: originalWidth,
      height: positiveInteger(candidate.height),
    });
  }

  const page = positiveInteger(payload.page) ?? 1;
  const total = typeof payload.total === "number" && Number.isSafeInteger(payload.total) && payload.total >= 0
    ? payload.total
    : assets.length;

  return {
    assets,
    page,
    limit: pageSize(requestedLimit),
    total,
    hasMore: payload.hasMore === true,
    categories: [...new Set(assets.map((asset) => asset.category))].sort((a, b) => a.localeCompare(b)),
  };
}

export function searchClashKingManifest(payload: unknown, options: AssetSearchOptions = {}): LibraryAssetPage {
  const queryTerms = normalizedSearchText(options.query ?? "").split(" ").filter(Boolean);
  const wantedCategory = normalizedSearchText(options.category ?? "");
  const allAssets = parseClashKingManifest(payload);
  const categories = [...new Set(allAssets.map((asset) => asset.category))].sort((a, b) => a.localeCompare(b));

  const matching = allAssets.filter((asset) => {
    if (wantedCategory && normalizedSearchText(asset.category) !== wantedCategory) return false;
    if (!queryTerms.length) return true;
    const haystack = normalizedSearchText(`${asset.name} ${asset.source} ${asset.category}`);
    return queryTerms.every((term) => haystack.includes(term));
  });

  return paginateAssets(matching, options, categories);
}

async function fetchJson(url: string, sourceKind: LibraryAssetSourceKind, options: AssetSearchOptions): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(url, { signal: options.signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new AssetSourceError(`Could not reach the ${sourceKind === "clashking" ? "ClashKing asset library" : "Supercell Fan Kit"}.`, sourceKind, undefined, { cause: error });
  }

  if (!response.ok) {
    throw new AssetSourceError(
      `${sourceKind === "clashking" ? "ClashKing asset library" : "Supercell Fan Kit"} returned HTTP ${response.status}.`,
      sourceKind,
      response.status,
    );
  }

  try {
    return await response.json() as unknown;
  } catch (error) {
    throw new AssetSourceError(
      `${sourceKind === "clashking" ? "ClashKing asset library" : "Supercell Fan Kit"} returned unreadable data.`,
      sourceKind,
      response.status,
      { cause: error },
    );
  }
}

export function buildSupercellFanKitSearchUrl(options: AssetSearchOptions = {}): string {
  const url = new URL(SUPERCELL_FAN_KIT_SEARCH_URL);
  url.searchParams.set("q", options.query?.trim() ?? "");
  url.searchParams.set("limit", String(pageSize(options.limit ?? MAX_PAGE_SIZE)));
  url.searchParams.set("page", String(pageNumber(options.page)));
  url.searchParams.set("requestnewflag", "true");
  url.searchParams.set("order", "RELEVANCE");
  return url.toString();
}

export async function fetchClashKingAssets(options: AssetSearchOptions = {}): Promise<LibraryAssetPage> {
  let payload: unknown;
  if (options.fetcher) {
    payload = await fetchJson(CLASHKING_ASSET_MANIFEST_URL, "clashking", options);
  } else {
    if (!clashKingManifestPromise) {
      clashKingManifestPromise = fetchJson(CLASHKING_ASSET_MANIFEST_URL, "clashking", {})
        .catch((error: unknown) => {
          clashKingManifestPromise = null;
          throw error;
        });
    }
    payload = await waitForPromise(clashKingManifestPromise, options.signal);
  }
  return searchClashKingManifest(payload, options);
}

export async function fetchSupercellFanKitAssets(options: AssetSearchOptions = {}): Promise<LibraryAssetPage> {
  const payload = await fetchJson(buildSupercellFanKitSearchUrl(options), "supercell-fankit", options);
  return parseSupercellFanKitResponse(payload, pageSize(options.limit ?? MAX_PAGE_SIZE));
}

export async function fetchLibraryAssets(sourceKind: LibraryAssetSourceKind, options: AssetSearchOptions = {}): Promise<LibraryAssetPage> {
  return sourceKind === "clashking"
    ? fetchClashKingAssets(options)
    : fetchSupercellFanKitAssets(options);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
    || isRecord(error) && error.name === "AbortError";
}

function waitForPromise<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("The request was aborted.", "AbortError"));

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("The request was aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    void promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export function clearClashKingAssetCache(): void {
  clashKingManifestPromise = null;
}

export function assetSourceErrorMessage(error: unknown): string {
  if (error instanceof AssetSourceError) return error.message;
  return "The asset library could not be loaded. Please try again.";
}
