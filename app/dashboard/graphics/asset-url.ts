const CLASH_API_ASSET_ORIGIN = "https://api-assets.clashofclans.com";
const CLASHKING_ASSET_PROXY_ORIGIN = "https://assets-proxy.clashk.ing";

/**
 * Official API artwork does not expose browser-safe CORS headers. Keep the
 * path intact and route it through ClashKing's immutable asset proxy.
 */
export function proxyClashApiAssetUrl(source: string): string {
  try {
    const url = new URL(source);
    if (url.origin !== CLASH_API_ASSET_ORIGIN) return source;
    return `${CLASHKING_ASSET_PROXY_ORIGIN}${url.pathname}${url.search}`;
  } catch {
    return source;
  }
}

