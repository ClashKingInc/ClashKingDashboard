import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchAsset,
  handleDashboardRequest,
  resolveConnectAssetUrl,
  resolveDomainRedirect,
  resolveRscAssetUrl,
} from "./index";

afterEach(() => vi.unstubAllGlobals());

describe("resolveDomainRedirect", () => {
  it("sends the dashboard root through login restoration", () => {
    expect(resolveDomainRedirect(new URL("https://dash.clashk.ing/"))?.toString()).toBe(
      "https://dash.clashk.ing/login",
    );
  });

  it.each(["/servers", "/login", "/auth/callback", "/dashboard", "/dashboard/roles", "/admin/creators"])(
    "moves the application route %s from the marketing host to the dashboard host",
    (pathname) => {
      const redirect = resolveDomainRedirect(
        new URL(`https://clashk.ing${pathname}?guildId=123`),
      );

      expect(redirect?.toString()).toBe(`https://dash.clashk.ing${pathname}?guildId=123`);
    },
  );

  it("redirects www to the apex while preserving path and query", () => {
    expect(
      resolveDomainRedirect(new URL("https://www.clashk.ing/fr/privacy?source=old"))?.toString(),
    ).toBe("https://clashk.ing/fr/privacy?source=old");
  });

  it.each([
    "https://clashk.ing/",
    "https://clashk.ing/privacy",
    "https://clashk.ing/connect/app_123",
    "https://clashk.ing/dashboarding",
    "https://dash.clashk.ing/dashboard",
    "https://app.clashk.ing/",
  ])("serves %s without a domain redirect", (url) => {
    expect(resolveDomainRedirect(new URL(url))).toBeNull();
  });

  it.each([
    "https://connect.clashk.ing/app_123?state=opaque",
    "https://connect.clashk.ing/login",
    "https://connect.clashk.ing/auth/callback?code=abc",
    "https://connect.clashk.ing/_next/static/app.js",
    "https://connect.clashk.ing/connect.rsc",
    "https://connect.clashk.ing/favicon.ico",
  ])("keeps standalone flow URL %s on the connect host", (url) => {
    expect(resolveDomainRedirect(new URL(url))).toBeNull();
  });

  it.each(["/", "/servers", "/dashboard", "/auth/other", "/app_123/extra"])(
    "keeps unrelated path %s out of the connect experience",
    (pathname) => {
      expect(resolveDomainRedirect(new URL(`https://connect.clashk.ing${pathname}`))?.hostname)
        .toBe("clashk.ing");
    },
  );
});

describe("permanent connect URLs", () => {
  it("serves an arbitrary application ID from the static connect page", () => {
    const request = new Request(
      "https://connect.clashk.ing/app_123?redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&state=opaque",
    );

    expect(resolveConnectAssetUrl(request)?.toString()).toBe(
      "https://connect.clashk.ing/connect?redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&state=opaque",
    );
  });

  it("does not rewrite malformed or unrelated connect paths", () => {
    expect(resolveConnectAssetUrl(new Request("https://dash.clashk.ing/connect"))).toBeNull();
    expect(resolveConnectAssetUrl(new Request("https://dash.clashk.ing/connect/app_123"))).toBeNull();
    expect(resolveConnectAssetUrl(new Request("https://dash.clashk.ing/connect/app_123/extra"))).toBeNull();
    expect(resolveConnectAssetUrl(new Request("https://dash.clashk.ing/dashboard/connect/app_123"))).toBeNull();
    expect(resolveConnectAssetUrl(new Request("https://connect.clashk.ing/app_123/extra"))).toBeNull();
    expect(resolveConnectAssetUrl(new Request("https://connect.clashk.ing/login"))).toBeNull();
    expect(resolveConnectAssetUrl(new Request("https://connect.clashk.ing/connect.rsc"))).toBeNull();
  });

  it("maps connect-page navigation to the generated static RSC asset", async () => {
    let fetchedUrl = "";
    const env = {
      ASSETS: {
        fetch: async (request: Request) => {
          fetchedUrl = request.url;
          return new Response("rsc payload", {
            headers: { "Content-Type": "application/octet-stream" },
          });
        },
      },
    };
    const request = new Request(
      "https://connect.clashk.ing/app_123?state=opaque&_rsc=cache-key",
      { headers: { Accept: "text/x-component", RSC: "1" } },
    );

    const response = await fetchAsset(request, env);

    expect(fetchedUrl).toBe("https://connect.clashk.ing/connect.rsc?state=opaque");
    expect(response.headers.get("Content-Type")).toBe("text/x-component");
  });
});

describe("RSC static asset routing", () => {
  it("maps vinext navigation requests to the generated RSC asset", () => {
    const request = new Request(
      "https://dash.clashk.ing/dashboard/general?guildId=123&_rsc=cache-key",
      { headers: { Accept: "text/x-component", RSC: "1" } },
    );

    expect(resolveRscAssetUrl(request)?.toString()).toBe(
      "https://dash.clashk.ing/dashboard/general.rsc?guildId=123",
    );
  });

  it("recognizes vinext navigation when an edge omits either RSC header", () => {
    const acceptRequest = new Request(
      "https://dash.clashk.ing/dashboard/clans?guildId=123&_rsc=accept-key",
      { headers: { Accept: "text/x-component" } },
    );
    const cacheKeyRequest = new Request(
      "https://dash.clashk.ing/dashboard/wars?guildId=123&_rsc=query-key",
    );

    expect(resolveRscAssetUrl(acceptRequest)?.pathname).toBe("/dashboard/clans.rsc");
    expect(resolveRscAssetUrl(cacheKeyRequest)?.pathname).toBe("/dashboard/wars.rsc");
  });

  it("maps the root RSC request to index.rsc", () => {
    const request = new Request("https://clashk.ing/?_rsc=cache-key", {
      headers: { Accept: "text/x-component", RSC: "1" },
    });

    expect(resolveRscAssetUrl(request)?.pathname).toBe("/index.rsc");
  });

  it("leaves ordinary document and mutation requests alone", () => {
    expect(resolveRscAssetUrl(new Request("https://dash.clashk.ing/dashboard/general"))).toBeNull();
    expect(
      resolveRscAssetUrl(
        new Request("https://dash.clashk.ing/dashboard/general", {
          method: "POST",
          headers: { Accept: "text/x-component", RSC: "1" },
        }),
      ),
    ).toBeNull();
  });

  it("serves RSC bytes with the component content type", async () => {
    let fetchedUrl = "";
    const env = {
      ASSETS: {
        fetch: async (request: Request) => {
          fetchedUrl = request.url;
          return new Response("rsc payload", {
            headers: { "Content-Type": "application/octet-stream" },
          });
        },
      },
    };
    const request = new Request(
      "https://dash.clashk.ing/dashboard/roles?guildId=123&_rsc=cache-key",
      { headers: { Accept: "text/x-component", RSC: "1" } },
    );

    const response = await fetchAsset(request, env);

    expect(fetchedUrl).toBe("https://dash.clashk.ing/dashboard/roles.rsc?guildId=123");
    expect(response.headers.get("Content-Type")).toBe("text/x-component");
    expect(await response.text()).toBe("rsc payload");
  });

  it("does not disguise an SPA HTML fallback as an RSC response", async () => {
    const env = {
      ASSETS: {
        fetch: async () => new Response("<!doctype html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      },
    };
    const request = new Request("https://dash.clashk.ing/missing?_rsc=cache-key", {
      headers: { Accept: "text/x-component", RSC: "1" },
    });

    const response = await fetchAsset(request, env);

    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  });
});

describe("dynamic edge routes", () => {
  it("resolves Tenor previews before the static asset fallback", async () => {
    const assetsFetch = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      '<meta property="og:image" content="https://media1.tenor.com/m/exampleAAAAC/roster.gif">',
    )));

    const response = await handleDashboardRequest(
      new Request("https://dash.clashk.ing/api/tenor-media?url=https%3A%2F%2Ftenor.com%2Fview%2Froster-12345"),
      { ASSETS: { fetch: assetsFetch } },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://media1.tenor.com/m/exampleAAAAC/roster.gif");
    expect(assetsFetch).not.toHaveBeenCalled();
  });
});
