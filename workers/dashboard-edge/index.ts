const MARKETING_HOST = "clashk.ing";
const DASHBOARD_HOST = "dash.clashk.ing";
const WWW_HOST = "www.clashk.ing";

const dashboardRoutePrefixes = ["/access", "/admin", "/auth", "/dashboard", "/login", "/servers"] as const;

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

export async function handleDashboardRequest(
  request: Request,
  env: { readonly ASSETS: Pick<Fetcher, "fetch"> },
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const redirectUrl = resolveDomainRedirect(requestUrl);
  if (redirectUrl) return Response.redirect(redirectUrl.toString(), 308);
  if (requestUrl.pathname === "/api/tenor-media") return resolveTenorMedia(request);
  if(requestUrl.pathname==='/access') {
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
    headers.set('Cache-Control','no-store');headers.set('Referrer-Policy','no-referrer');
    headers.set('Content-Security-Policy',"frame-ancestors 'self' https://app.clashk.ing https://dev-app.clashk.ing http://localhost:7357");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
  return env.ASSETS.fetch(request);
}

export default {
  fetch(request, env): Promise<Response> {
    return handleDashboardRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
import { resolveTenorMedia } from "../../lib/tenor-media";
