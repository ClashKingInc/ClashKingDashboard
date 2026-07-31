const MARKETING_HOST = "clashk.ing";
const DASHBOARD_HOST = "dash.clashk.ing";
const LEGACY_DASHBOARD_HOST = "dashboard.clashk.ing";
const WWW_HOST = "www.clashk.ing";
const RSC_CONTENT_TYPE = "text/x-component";

interface AssetEnv {
  ASSETS: Pick<Fetcher, "fetch">;
}

const dashboardRoutePrefixes = [
  "/admin",
  "/auth",
  "/dashboard",
  "/login",
  "/servers",
] as const;

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveDomainRedirect(requestUrl: URL): URL | null {
  const redirectUrl = new URL(requestUrl);
  redirectUrl.protocol = "https:";

  if (requestUrl.hostname === WWW_HOST) {
    redirectUrl.hostname = MARKETING_HOST;
    return redirectUrl;
  }

  if (requestUrl.hostname === LEGACY_DASHBOARD_HOST) {
    redirectUrl.hostname = DASHBOARD_HOST;
    if (requestUrl.pathname === "/") {
      redirectUrl.pathname = "/servers";
    }
    return redirectUrl;
  }

  if (requestUrl.hostname === DASHBOARD_HOST && requestUrl.pathname === "/") {
    redirectUrl.pathname = "/servers";
    return redirectUrl;
  }

  if (
    requestUrl.hostname === MARKETING_HOST &&
    dashboardRoutePrefixes.some((prefix) => matchesRoutePrefix(requestUrl.pathname, prefix))
  ) {
    redirectUrl.hostname = DASHBOARD_HOST;
    return redirectUrl;
  }

  return null;
}

export function resolveRscAssetUrl(request: Request): URL | null {
  const assetUrl = new URL(request.url);
  const isRscRequest =
    request.headers.get("RSC") === "1" ||
    request.headers.get("Accept")?.includes(RSC_CONTENT_TYPE) ||
    assetUrl.searchParams.has("_rsc");
  if ((request.method !== "GET" && request.method !== "HEAD") || !isRscRequest) return null;

  const pathname = assetUrl.pathname === "/"
    ? "/index"
    : assetUrl.pathname.replace(/\/$/, "");

  assetUrl.pathname = pathname.endsWith(".rsc") ? pathname : `${pathname}.rsc`;
  assetUrl.searchParams.delete("_rsc");
  return assetUrl;
}

export async function fetchAsset(request: Request, env: AssetEnv): Promise<Response> {
  const rscAssetUrl = resolveRscAssetUrl(request);
  if (!rscAssetUrl) return env.ASSETS.fetch(request);

  const response = await env.ASSETS.fetch(new Request(rscAssetUrl.toString(), request));
  if (!response.ok || response.headers.get("Content-Type")?.startsWith("text/html")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Content-Type", RSC_CONTENT_TYPE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const redirectUrl = resolveDomainRedirect(new URL(request.url));
    if (redirectUrl) {
      return Response.redirect(redirectUrl.toString(), 308);
    }

    return fetchAsset(request, env);
  },
} satisfies ExportedHandler<Env>;
