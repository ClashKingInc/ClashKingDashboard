const dashboardPaths = ["/admin", "/auth", "/dashboard", "/login", "/servers"];

/** Move to the dashboard origin before creating any origin-bound login state. */
export function canonicalDashboardHref(href: string, baseUrl: string): string {
  const base = new URL(baseUrl);
  const target = new URL(href, base);
  if (
    ["clashk.ing", "www.clashk.ing"].includes(target.hostname)
    && dashboardPaths.some((path) => target.pathname === path || target.pathname.startsWith(`${path}/`))
  ) {
    target.protocol = "https:";
    target.hostname = "dash.clashk.ing";
    target.port = "";
    return target.href;
  }
  return href;
}
