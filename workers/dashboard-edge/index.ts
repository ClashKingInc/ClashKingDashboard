import { resolveTenorMedia } from "../../lib/tenor-media";

const MARKETING_HOST = "clashk.ing";
const DASHBOARD_HOST = "dash.clashk.ing";
const WWW_HOST = "www.clashk.ing";
const RSC_CONTENT_TYPE = "text/x-component";

interface AssetEnv {
  ASSETS: Pick<Fetcher, "fetch">;
}

const dashboardRoutePrefixes = [
  "/admin",
  "/auth",
  "/connect",
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

  if (requestUrl.hostname === DASHBOARD_HOST && requestUrl.pathname === "/") {
    redirectUrl.pathname = "/login";
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

export function resolveConnectAssetUrl(request: Request): URL | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const assetUrl = new URL(request.url);
  const segments = assetUrl.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "connect") return null;

  assetUrl.pathname = "/connect";
  return assetUrl;
}

export async function fetchAsset(request: Request, env: AssetEnv): Promise<Response> {
  const connectAssetUrl = resolveConnectAssetUrl(request);
  const assetRequest = connectAssetUrl
    ? new Request(connectAssetUrl.toString(), request)
    : request;
  const rscAssetUrl = resolveRscAssetUrl(assetRequest);
  if (!rscAssetUrl) return env.ASSETS.fetch(assetRequest);

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

export async function handleDashboardRequest(request: Request, env: AssetEnv): Promise<Response> {
  const requestUrl = new URL(request.url);
  const redirectUrl = resolveDomainRedirect(requestUrl);
  if (redirectUrl) {
    return Response.redirect(redirectUrl.toString(), 308);
  }

  if (requestUrl.pathname === "/api/tenor-media") {
    return resolveTenorMedia(request);
  }

  return fetchAsset(request, env);
}

export default {
  async fetch(request, env): Promise<Response> {
    return handleDashboardRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
