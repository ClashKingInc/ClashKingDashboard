import { afterEach, describe, expect, it, vi } from "vitest";
import { handleDashboardRequest, resolveDomainRedirect } from "./index";

afterEach(() => vi.unstubAllGlobals());

describe("resolveDomainRedirect", () => {
  it("sends the dashboard root through login restoration", () => {
    expect(resolveDomainRedirect(new URL("https://dash.clashk.ing/"))?.toString()).toBe(
      "https://dash.clashk.ing/login",
    );
  });

  it.each(["/admin/creators", "/servers", "/login", "/auth/callback", "/dashboard", "/dashboard/roles"])(
    "moves the application route %s from the marketing host to the dashboard host",
    (pathname) => {
      const redirect = resolveDomainRedirect(new URL(`https://clashk.ing${pathname}?guildId=123`));
      expect(redirect?.toString()).toBe(`https://dash.clashk.ing${pathname}?guildId=123`);
    },
  );

  it("redirects www to the apex while preserving path and query", () => {
    expect(resolveDomainRedirect(new URL("https://www.clashk.ing/fr/privacy?source=old"))?.toString())
      .toBe("https://clashk.ing/fr/privacy?source=old");
  });

  it.each([
    "https://clashk.ing/",
    "https://clashk.ing/privacy",
    "https://clashk.ing/dashboarding",
    "https://dash.clashk.ing/dashboard",
    "https://app.clashk.ing/",
  ])("serves %s without a domain redirect", (url) => {
    expect(resolveDomainRedirect(new URL(url))).toBeNull();
  });

});

describe("SPA asset routing", () => {
  it("resolves the original Tenor GET before static assets, without central API auth", async () => {
    const providerFetch = vi.fn().mockResolvedValue(new Response('<meta property="og:image" content="https://media.tenor.com/example/roster.gif">'));
    vi.stubGlobal("fetch", providerFetch);
    const assetFetch = vi.fn();
    const response = await handleDashboardRequest(
      new Request("https://dash.clashk.ing/api/tenor-media?url=https%3A%2F%2Ftenor.com%2Fview%2Fexample-42"),
      { ASSETS: { fetch: assetFetch } },
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://media.tenor.com/example/roster.gif");
    expect(providerFetch).toHaveBeenCalledOnce();
    expect(assetFetch).not.toHaveBeenCalled();
  });

  it("passes an allowed request to the generated assets binding", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("spa"));
    const request = new Request("https://dash.clashk.ing/dashboard/general?guildId=123");

    const response = await handleDashboardRequest(request, { ASSETS: { fetch } });

    expect(await response.text()).toBe("spa");
    expect(fetch).toHaveBeenCalledWith(request);
  });

  it("does not invoke assets for redirects", async () => {
    const fetch = vi.fn();
    const response = await handleDashboardRequest(
      new Request("https://www.clashk.ing/privacy"),
      { ASSETS: { fetch } },
    );

    expect(response.status).toBe(308);
    expect(fetch).not.toHaveBeenCalled();
  });
});
