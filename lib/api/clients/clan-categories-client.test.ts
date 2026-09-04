import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClanCategoriesClient } from "./clan-categories-client";

describe("ClanCategoriesClient", () => {
  const fetchMock = vi.fn();
  const client = new ClanCategoriesClient({ baseUrl: "http://dashboard.test", accessToken: "token" });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses every server-scoped category contract with camelCase responses", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        category: { id: "category-1", serverId: "123", name: "CWL", position: 0, clanCount: 0 },
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        category: { id: "category-1", serverId: "123", name: "Events", position: 0, clanCount: 0 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ id: "category-1", serverId: "123", name: "Events", position: 0, clanCount: 0 }],
        total: 1,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        category: { id: "category-1", serverId: "123", name: "Events", position: 0, clanCount: 2 },
        affectedClanCount: 2,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        categoryId: "category-1",
        name: "Events",
        deleted: true,
        uncategorizedClanCount: 3,
      }), { status: 200 }));

    await client.list("123");
    await client.create("123", "CWL");
    await client.rename("123", "category/1", "Events");
    await client.reorder("123", ["category-1"]);
    await client.previewDelete("123", "category/1");
    const deleted = await client.delete("123", "category/1");

    expect(fetchMock.mock.calls.map(([request]) => (request as Request).url)).toEqual([
      "http://dashboard.test/v2/server/123/clan-categories",
      "http://dashboard.test/v2/server/123/clan-categories",
      "http://dashboard.test/v2/server/123/clan-categories/category%2F1",
      "http://dashboard.test/v2/server/123/clan-categories/order",
      "http://dashboard.test/v2/server/123/clan-categories/category%2F1/delete-preview",
      "http://dashboard.test/v2/server/123/clan-categories/category%2F1",
    ]);
    const createRequest = fetchMock.mock.calls[1]?.[0] as Request;
    const renameRequest = fetchMock.mock.calls[2]?.[0] as Request;
    const reorderRequest = fetchMock.mock.calls[3]?.[0] as Request;
    const deleteRequest = fetchMock.mock.calls[5]?.[0] as Request;
    expect(createRequest.method).toBe("POST");
    expect(await createRequest.json()).toEqual({ name: "CWL" });
    expect(renameRequest.method).toBe("PATCH");
    expect(await renameRequest.json()).toEqual({ name: "Events" });
    expect(reorderRequest.method).toBe("PUT");
    expect(await reorderRequest.json()).toEqual({ categoryIds: ["category-1"] });
    expect(deleteRequest.method).toBe("DELETE");
    expect(deleted.data?.uncategorizedClanCount).toBe(3);
  });

  it("retains the shared error envelope and status", async () => {
    const error = {
      code: "conflict",
      message: "Clan category already exists",
      requestId: "request-1",
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(error), { status: 409 }));

    const response = await client.create("123", "CWL");

    expect(response.status).toBe(409);
    expect(response.error).toBe(error.message);
    expect(response.errorData).toEqual(error);
  });
});
