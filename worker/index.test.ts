import { describe, expect, it } from "vitest";
import { resolveDomainRedirect } from "./index";

describe("resolveDomainRedirect", () => {
  it("sends the dashboard root to the server picker", () => {
    expect(resolveDomainRedirect(new URL("https://dashboard.clashk.ing/"))?.toString()).toBe(
      "https://dashboard.clashk.ing/servers",
    );
  });

  it.each(["/servers", "/login", "/auth/callback", "/dashboard", "/dashboard/roles", "/admin/creators"])(
    "moves the application route %s from the marketing host to the dashboard host",
    (pathname) => {
      const redirect = resolveDomainRedirect(
        new URL(`https://clashk.ing${pathname}?guildId=123`),
      );

      expect(redirect?.toString()).toBe(
        `https://dashboard.clashk.ing${pathname}?guildId=123`,
      );
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
    "https://clashk.ing/dashboarding",
    "https://dashboard.clashk.ing/dashboard",
    "https://app.clashk.ing/",
  ])("serves %s without a domain redirect", (url) => {
    expect(resolveDomainRedirect(new URL(url))).toBeNull();
  });
});
