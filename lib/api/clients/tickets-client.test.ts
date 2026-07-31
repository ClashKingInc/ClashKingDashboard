import { afterEach, describe, expect, it, vi } from "vitest";

import { TicketsClient } from "./tickets-client";

describe("TicketsClient operational panel and embed routes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps panel list and update calls on the canonical ticket routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "updated" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.getPanels("123");
    await client.updatePanel("123", "Recruitment / EU", { open_category: "456" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://dashboard.test/v2/server/123/tickets",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://dashboard.test/v2/server/123/tickets/Recruitment%20%2F%20EU",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ open_category: "456" }),
      }),
    );
  });

  it("keeps embed list and update calls on the canonical embed routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "updated" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.getEmbeds("123");
    await client.updateEmbed("123", "Ticket Panel", { name: "Ticket Panel", data: { content: "Apply" } });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://dashboard.test/v2/server/123/embeds",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://dashboard.test/v2/server/123/embeds/Ticket%20Panel",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Ticket Panel", data: { content: "Apply" } }),
      }),
    );
  });

  it("does not expose the retired open-ticket client methods", () => {
    const client = new TicketsClient({
      baseUrl: "http://dashboard.test",
      accessToken: "token",
    }) as unknown as Record<string, unknown>;

    expect(client.getOpenTickets).toBeUndefined();
    expect(client.updateOpenTicketStatus).toBeUndefined();
    expect(client.updateOpenTicketClan).toBeUndefined();
    expect(client.deleteOpenTicket).toBeUndefined();
  });
});
