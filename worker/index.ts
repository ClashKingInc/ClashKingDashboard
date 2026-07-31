const MARKETING_HOST = "clashk.ing";
const DASHBOARD_HOST = "dashboard.clashk.ing";
const WWW_HOST = "www.clashk.ing";

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

export default {
  async fetch(request, env): Promise<Response> {
    const redirectUrl = resolveDomainRedirect(new URL(request.url));
    if (redirectUrl) {
      return Response.redirect(redirectUrl.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
