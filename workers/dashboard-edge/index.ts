import { sharedViewImage } from "./shared-view-image";
import { isNativeLocalizedRoute } from "../../lib/native-localized-routes";
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
  env: { readonly ASSETS: Pick<Fetcher, "fetch">; readonly SHARED_VIEW_API_ORIGIN?: string },
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const redirectUrl = resolveDomainRedirect(requestUrl);
  if (redirectUrl) return Response.redirect(redirectUrl.toString(), 308);
  const imageToken = /^\/view\/share-image\/([A-Za-z0-9_-]{16})\.png$/.exec(requestUrl.pathname)?.[1];
  if (imageToken && /^(GET|HEAD)$/.test(request.method)) {
    const data = await loadShareMetadata(env.SHARED_VIEW_API_ORIGIN, imageToken);
    if (!data) return new Response("Shared view not found", { status: 404 });
    return sharedViewImage(data, env.ASSETS);
  }
  if (requestUrl.pathname === "/view" && /^(GET|HEAD)$/.test(request.method)) {
    const token = requestUrl.searchParams.get("share") ?? "";
    if (/^[A-Za-z0-9_-]{16}$/.test(token)) return protectNativeLocale(await sharedViewHtml(request, env, token), requestUrl.pathname);
  }
  if (requestUrl.pathname === "/api/tenor-media") return resolveTenorMedia(request);
  if(requestUrl.pathname==='/access' || (requestUrl.pathname.startsWith('/dashboard') && requestUrl.searchParams.get('embedded')==='1')) {
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
    // /access navigates to an embedded dashboard URL; reloads need the same
    // restricted frame policy, without the conflicting static DENY header.
    headers.delete('X-Frame-Options');
    headers.set('Cache-Control','no-store');headers.set('Referrer-Policy','no-referrer');
    headers.set('Content-Security-Policy',"frame-ancestors 'self' https://app.clashk.ing https://dev-app.clashk.ing http://localhost:7357");
    return protectNativeLocale(new Response(response.body,{status:response.status,statusText:response.statusText,headers}), requestUrl.pathname);
  }
  return protectNativeLocale(await env.ASSETS.fetch(request), requestUrl.pathname);
}

function protectNativeLocale(response: Response, pathname: string): Response {
  if (!isNativeLocalizedRoute(pathname) || !response.headers.get("content-type")?.includes("text/html")) return response;
  // Send the policy in the original HTML, before auto-translation can run.
  // LocaleProvider still chooses and renders the user's language normally.
  return new HTMLRewriter().on("html, body, #root", {
    element(element) {
      element.setAttribute("translate", "no");
      const classes = new Set((element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean));
      classes.add("notranslate");
      element.setAttribute("class", [...classes].join(" "));
    },
  }).transform(response);
}

export default {
  fetch(request, env): Promise<Response> {
    return handleDashboardRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
import { resolveTenorMedia } from "../../lib/tenor-media";


async function sharedViewHtml(
  request: Request,
  env: { readonly ASSETS: Pick<Fetcher, "fetch">; readonly SHARED_VIEW_API_ORIGIN?: string },
  token: string,
): Promise<Response> {
  const shell = await env.ASSETS.fetch(new Request(new URL("/", request.url), { headers: { accept: "text/html" } }));
  if (!shell.ok || !shell.headers.get("content-type")?.includes("text/html")) return shell;
  try {
    // Server-render this metadata for crawlers that never run the React app.
    // Forward no cookies or user credentials to the public metadata endpoint.
    const data = await loadShareMetadata(env.SHARED_VIEW_API_ORIGIN, token);
    if (!data) return shell;
    const count = data.savedServerCount;
    const description = [data.description, `Saved to ${count} ${count === 1 ? "server" : "servers"}`].filter(Boolean).join(" · ");
    const canonical = `https://dash.clashk.ing/view?share=${token}`;
    const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
    const tags = [
      ["property", "og:type", "website"], ["property", "og:site_name", "ClashKing · Shared roster view"],
      ["property", "og:title", data.name], ["property", "og:description", description],
      ["property", "og:url", canonical], ["property", "og:image", `https://dash.clashk.ing/view/share-image/${token}.png`],
      ["name", "twitter:card", "summary_large_image"], ["name", "twitter:title", data.name],
      ["name", "twitter:description", description], ["name", "twitter:image", `https://dash.clashk.ing/view/share-image/${token}.png`],
      ["property", "og:image:width", "1200"], ["property", "og:image:height", "630"],
      ["name", "robots", "noindex, nofollow"],
    ].map(([attribute, name, content]) => `<meta ${attribute}="${name}" content="${escape(content!)}">`).join("");
    const rewritten = new HTMLRewriter()
      .on("title", { element(element) { element.setInnerContent(`${data.name} | ClashKing`); } })
      .on('meta[property^="og:"],meta[name^="twitter:"],meta[name="robots"]', { element(element) { element.remove(); } })
      .on('script[id="discord:component-embed"]', {
        element(element) { element.remove(); }
      })
      .on('meta[name="description"]', { element(element) { element.setAttribute("content", description); } })
      .on("head", { element(element) { element.append(tags, { html: true }); } }).transform(shell);
    const headers = new Headers(rewritten.headers);
    // The URL query identifies the snapshot. Avoid a generic /view cache entry
    // leaking another link's metadata; social platforms maintain their own cache.
    headers.set("Cache-Control", "no-store");
    return new Response(rewritten.body, { status: rewritten.status, headers });
  } catch (error) {
    console.warn("shared_view_metadata_failed", error instanceof Error ? error.message : "unknown");
    return shell;
  }
}

async function loadShareMetadata(apiOrigin: string | undefined, token: string): Promise<{name:string;description:string;savedServerCount:number}|null> {
  const response = await fetch(`${apiOrigin ?? "https://api.clashk.ing"}/v2/roster/view-shares/${token}/embed`, {
    signal: AbortSignal.timeout(4000), headers: { accept: "application/json" }, redirect: "manual",
  });
  if (!response.ok) {console.warn("shared_view_metadata_unavailable",response.status);return null;}
  const value: unknown = await response.json();
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.name !== "string" || typeof data.description !== "string" ||
    typeof data.savedServerCount !== "number" || !Number.isSafeInteger(data.savedServerCount) || data.savedServerCount < 0) return null;
  return {name:data.name,description:data.description,savedServerCount:data.savedServerCount};
}
