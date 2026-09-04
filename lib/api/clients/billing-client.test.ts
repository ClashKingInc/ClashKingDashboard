import { afterEach, describe, expect, it, vi } from "vitest";

import { BillingClient } from "./billing-client";

describe("BillingClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the authenticated Stripe billing routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BillingClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.createCheckout("server-1");

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/billing/stripe/checkout");
    expect(request.method).toBe("POST");
    expect(await request.clone().json()).toEqual({ serverId: "server-1" });
    expect(request.headers.get("Authorization")).toBe("Bearer token");
  });

  it("updates the server assigned to the subscription", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BillingClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.updateAssignment("server-2");

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/billing/subscription/assignment");
    expect(request.method).toBe("PUT");
    expect(await request.json()).toEqual({ serverId: "server-2" });
  });

  it("loads usage for the selected server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ serverId: "server/1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BillingClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.getUsage("server/1");

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/billing/usage?serverId=server%2F1");
    expect(request.method).toBe("GET");
  });
});
