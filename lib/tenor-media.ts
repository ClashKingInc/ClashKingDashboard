const TENOR_HOSTS = new Set(["tenor.com", "www.tenor.com"]);
const TENOR_VIEW_PATH = /^\/view\/.+-(\d+)\/?$/;
const OG_GIF_PATTERN = /<meta\s+[^>]*property=["']og:image["'][^>]*content=["'](https:\/\/(?:media1?\.)tenor\.com\/[^"']+\.gif)["'][^>]*>/i;

export function isSupportedTenorUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && TENOR_HOSTS.has(url.hostname.toLowerCase()) && TENOR_VIEW_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

export function extractTenorGifUrl(html: string): string | null {
  return OG_GIF_PATTERN.exec(html)?.[1]?.replaceAll("&amp;", "&") ?? null;
}

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function resolveTenorMedia(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const sourceUrl = new URL(request.url).searchParams.get("url");
  if (!sourceUrl || !isSupportedTenorUrl(sourceUrl)) {
    return jsonError("Invalid Tenor URL", 400);
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "ClashKingDashboard/1.0" },
    });
    if (!response.ok) throw new Error(`Tenor returned ${response.status}`);

    const gifUrl = extractTenorGifUrl(await response.text());
    if (!gifUrl) return jsonError("GIF media not found", 404);

    return new Response(null, {
      status: 307,
      headers: {
        Location: gifUrl,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return jsonError("Unable to load GIF", 502);
  }
}
