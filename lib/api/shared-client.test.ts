import { defineEndpoint, NoBody, NoPathParams, NoQuery } from "@clashking/api-contracts";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { executeSharedApiResult, executeSharedEndpoint } from "./shared-client";

const session = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => string | undefined>(),
  refreshAccessToken: vi.fn<(baseUrl: string) => Promise<boolean>>(),
}));

vi.mock("@/lib/auth/session", () => session);

const endpoint = defineEndpoint({
  auth: "user",
  body: NoBody,
  bodyMode: "none",
  method: "GET",
  operationId: "testSharedTransport",
  path: "/v2/test-transport",
  pathParams: NoPathParams,
  query: NoQuery,
  response: Schema.Struct({ message: Schema.String }),
  responseMode: "json",
  successStatus: 200,
  summary: "Test the Dashboard transport boundary",
  errors: [{ status: 409, body: Schema.Struct({ message: Schema.String, retryable: Schema.Boolean }) }],
});

const input = { path: {}, query: {}, body: {} };

describe("shared Dashboard transport", () => {
  beforeEach(() => {
    session.getAccessToken.mockReturnValue("current-token");
    session.refreshAccessToken.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("preserves the actual successful HTTP status rather than the descriptor default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message: "created" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(executeSharedApiResult(endpoint, input)).resolves.toEqual({
      data: { message: "created" }, status: 201,
    });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.credentials).toBe("include");
    expect(request.headers.get("authorization")).toBe("Bearer current-token");
    expect(session.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("preserves the declared error's decoded body and actual status", async () => {
    const body = { message: "conflict", retryable: false };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 409 })));

    await expect(executeSharedApiResult(endpoint, input)).resolves.toEqual({
      error: "conflict", errorData: body, status: 409,
    });
  });

  it("rejects malformed declared error payloads instead of exposing unchecked data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "conflict" }, { status: 409 })));

    const result = await executeSharedApiResult(endpoint, input);

    expect(result.status).toBe(0);
    expect(result.error).toBe("API data validation failed");
    expect(result.errorData).toBeUndefined();
  });

  it("preserves undeclared HTTP errors", async () => {
    const body = { detail: "Unavailable" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 503 })));

    await expect(executeSharedApiResult(endpoint, input)).resolves.toEqual({
      error: "Unavailable", errorData: body, status: 503,
    });
  });

  it("keeps blank HTTP error messages truthy and uses the next usable error field", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ message: " ", retryable: false }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ detail: "", message: "Try again" }, { status: 503 })));

    await expect(executeSharedApiResult(endpoint, input)).resolves.toMatchObject({ error: "HTTP 409", status: 409 });
    await expect(executeSharedApiResult(endpoint, input)).resolves.toMatchObject({ error: "Try again", status: 503 });
  });

  it("reauthorizes one 401 replay and returns the replay's actual status", async () => {
    session.refreshAccessToken.mockImplementation(async () => {
      session.getAccessToken.mockReturnValue("rotated-token");
      return true;
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ message: "expired" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ message: "accepted" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(executeSharedApiResult(endpoint, input)).resolves.toEqual({
      data: { message: "accepted" }, status: 202,
    });
    expect(session.refreshAccessToken).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0]![0] as Request).headers.get("authorization")).toBe("Bearer current-token");
    expect((fetchMock.mock.calls[1]![0] as Request).headers.get("authorization")).toBe("Bearer rotated-token");
  });

  it.each(["endpoint", "result"])("restores a missing access token before %s execution", async (mode) => {
    session.getAccessToken.mockReturnValue(undefined);
    session.refreshAccessToken.mockImplementation(async () => {
      session.getAccessToken.mockReturnValue("restored-token");
      return true;
    });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    if (mode === "endpoint") {
      await expect(executeSharedEndpoint(endpoint, input)).resolves.toEqual({ message: "ok" });
    } else {
      await expect(executeSharedApiResult(endpoint, input)).resolves.toEqual({ data: { message: "ok" }, status: 200 });
    }

    expect(session.refreshAccessToken).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0]![0] as Request).headers.get("authorization")).toBe("Bearer restored-token");
  });

  it("stops after one replay when the refreshed request is also rejected", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ message: "rejected" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(executeSharedApiResult(endpoint, input)).resolves.toEqual({
      error: "rejected", errorData: { message: "rejected" }, status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(session.refreshAccessToken).toHaveBeenCalledOnce();
  });

  it("preserves caller-provided authorization without a proactive refresh", async () => {
    session.getAccessToken.mockReturnValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await executeSharedApiResult(endpoint, input, { auth: { bearerToken: "explicit-token" } });

    expect(session.refreshAccessToken).not.toHaveBeenCalled();
    expect((fetchMock.mock.calls[0]![0] as Request).headers.get("authorization")).toBe("Bearer explicit-token");
  });

  it("does not refresh or replay auth endpoints", async () => {
    session.getAccessToken.mockReturnValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message: "rejected" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeSharedApiResult({ ...endpoint, path: "/v2/auth/web/login" }, input);

    expect(result.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(session.refreshAccessToken).not.toHaveBeenCalled();
  });
});
