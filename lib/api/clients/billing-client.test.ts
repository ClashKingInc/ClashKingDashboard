import { afterEach, describe, expect, it, vi } from "vitest";

import { BillingClient } from "./billing-client";

describe("BillingClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the authenticated Stripe billing routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BillingClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.createCheckout("server-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://dashboard.test/v2/billing/stripe/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ serverId: "server-1" }),
        headers: expect.objectContaining({}),
      }),
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token");
  });

  it("updates the server assigned to the subscription", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BillingClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.updateAssignment("server-2");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://dashboard.test/v2/billing/subscription/assignment",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ serverId: "server-2" }) }),
    );
  });

  it("loads usage for the selected server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ serverId: "server/1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BillingClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.getUsage("server/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://dashboard.test/v2/billing/usage?serverId=server%2F1",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
