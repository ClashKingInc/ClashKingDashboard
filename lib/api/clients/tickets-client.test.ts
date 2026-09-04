import { afterEach, describe, expect, it, vi } from "vitest";

import { TicketsClient } from "./tickets-client";

describe("TicketsClient operational panel and embed routes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps panel list and update calls on the canonical ticket routes", async () => {
    const panelId = "018f1d6b-8c50-7e8d-9c31-aef6f6f1a100";
    const buttonId = "018f1d6b-8c50-7e8d-9c31-aef6f6f1a101";
    const customId = `ck:ticket:open:${panelId}:${buttonId}`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          id: panelId,
          name: "Recruitment / EU",
          server_id: "123",
          components: [{ id: buttonId, custom_id: customId, label: "Apply", style: 1, type: 2 }],
          button_settings: {},
          approve_messages: [],
        }],
        total: 1,
        available_embeds: [],
        townhall_requirement_fields: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "updated" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    const panels = await client.getPanels("123");
    await client.updatePanel("123", "Recruitment / EU", { open_category: "456" });

    expect(panels.data?.items[0]).toMatchObject({
      id: panelId,
      components: [{ id: buttonId, custom_id: customId }],
    });

    const listRequest = fetchMock.mock.calls[0]?.[0] as Request;
    const updateRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(listRequest.url).toBe("http://dashboard.test/v2/server/123/tickets");
    expect(listRequest.method).toBe("GET");
    expect(updateRequest.url).toBe("http://dashboard.test/v2/server/123/tickets/Recruitment%20%2F%20EU");
    expect(updateRequest.method).toBe("PUT");
    expect(await updateRequest.json()).toEqual({ open_category: "456" });
  });

  it("keeps embed list and update calls on the canonical embed routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "updated" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.getEmbeds("123");
    await client.updateEmbed("123", "Ticket Panel", { name: "Ticket Panel", data: { description: "Apply" } });

    const listRequest = fetchMock.mock.calls[0]?.[0] as Request;
    const updateRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(listRequest.url).toBe("http://dashboard.test/v2/server/123/embeds");
    expect(listRequest.method).toBe("GET");
    expect(updateRequest.url).toBe("http://dashboard.test/v2/server/123/embeds/Ticket%20Panel");
    expect(updateRequest.method).toBe("PUT");
    expect(await updateRequest.json()).toEqual({
      name: "Ticket Panel",
      data: { description: "Apply" },
    });
  });

  it("encodes canonical ticket component IDs as one path segment", async () => {
    const panelId = "018f1d6b-8c50-7e8d-9c31-aef6f6f1a100";
    const buttonId = "018f1d6b-8c50-7e8d-9c31-aef6f6f1a101";
    const customId = `ck:ticket:open:${panelId}:${buttonId}`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "updated" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

    await client.updateButtonAppearance("123", "Recruitment", customId, {
      emoji: null,
      label: "Apply",
      style: 1,
    });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(
      `http://dashboard.test/v2/server/123/tickets/Recruitment/buttons/${encodeURIComponent(customId)}`,
    );
    expect(request.method).toBe("PATCH");
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

  it.each([0, 1, 25])("round-trips %i templates through canonical contracts without dropping order or content", async (count) => {
    const messages = Array.from({ length: count }, (_, index) => ({ name: `Template ${index + 1}`, message: `  Content ${index}\n ` }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{
        id: "018f1d6b-8c50-7e8d-9c31-aef6f6f1a100", name: "Recruitment / EU", server_id: "123",
        components: [], button_settings: {}, approve_messages: messages,
      }], total: 1, available_embeds: [], townhall_requirement_fields: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "updated" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    expect((await client.getPanels("123")).data?.items[0].approve_messages).toEqual(messages);
    expect((await client.updateApproveMessages("123", "Recruitment / EU", { messages })).error).toBeUndefined();
    const request = fetchMock.mock.calls[1][0] as Request;
    expect(request.url).toBe("http://dashboard.test/v2/server/123/tickets/Recruitment%20%2F%20EU/approve-messages");
    expect(request.method).toBe("PUT");
    expect(await request.json()).toEqual({ messages });
  });

  it("rejects 26 templates before sending a request and does not mutate the caller's list", async () => {
    const messages = Array.from({ length: 26 }, (_, index) => ({ name: `Template ${index}`, message: "Content" }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    const result = await client.updateApproveMessages("123", "Recruitment", { messages });
    expect(result.status).toBe(0);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(messages).toHaveLength(26);
  });

  it("returns API failures without modifying template names, content, or order", async () => {
    const messages = [{ name: "Second", message: "\nTwo  " }, { name: "First", message: "One" }];
    const before = structuredClone(messages);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Service unavailable" }), { status: 503 })));
    const client = new TicketsClient({ baseUrl: "http://dashboard.test", accessToken: "token" });
    expect((await client.updateApproveMessages("123", "Recruitment", { messages })).error).toBe("Service unavailable");
    expect(messages).toEqual(before);
  });
});
