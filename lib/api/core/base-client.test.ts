import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BaseApiClient } from "./base-client";

// Expose protected members for testing
class TestClient extends BaseApiClient {
  public queryString(params: Record<string, any>) {
    return this.buildQueryString(params);
  }
  public async req<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, options);
  }
  public async reqFormData<T>(endpoint: string, method: "POST" | "PUT", body: FormData) {
    return this.requestFormData<T>(endpoint, method, body);
  }
}

// ─── token management ────────────────────────────────────────────────────────

describe("BaseApiClient — token management", () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient({ baseUrl: "http://api.example.com" });
  });

  it("getConfig returns the initial config", () => {
    const cfg = client.getConfig();
    expect(cfg.baseUrl).toBe("http://api.example.com");
    expect(cfg.accessToken).toBeUndefined();
    expect(cfg.refreshToken).toBeUndefined();
  });

  it("setAccessToken updates the token in config", () => {
    client.setAccessToken("tok_123");
    expect(client.getConfig().accessToken).toBe("tok_123");
  });

  it("setRefreshToken updates the refresh token in config", () => {
    client.setRefreshToken("ref_abc");
    expect(client.getConfig().refreshToken).toBe("ref_abc");
  });

  it("clearTokens removes both tokens", () => {
    client.setAccessToken("tok_123");
    client.setRefreshToken("ref_abc");
    client.clearTokens();
    expect(client.getConfig().accessToken).toBeUndefined();
    expect(client.getConfig().refreshToken).toBeUndefined();
  });

  it("getConfig returns a snapshot (immutable to subsequent setters)", () => {
    const cfg = client.getConfig();
    client.setAccessToken("changed");
    expect(cfg.accessToken).toBeUndefined();
  });
});

// ─── buildQueryString ────────────────────────────────────────────────────────

describe("BaseApiClient — buildQueryString", () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient({ baseUrl: "http://api.example.com" });
  });

  it("returns empty string for empty params", () => {
    expect(client.queryString({})).toBe("");
  });

  it("builds a simple query string", () => {
    expect(client.queryString({ foo: "bar" })).toBe("?foo=bar");
  });

  it("handles multiple params", () => {
    const qs = client.queryString({ a: "1", b: "2" });
    expect(qs).toContain("a=1");
    expect(qs).toContain("b=2");
    expect(qs.startsWith("?")).toBe(true);
  });

  it("skips undefined values", () => {
    expect(client.queryString({ foo: "bar", baz: undefined })).toBe("?foo=bar");
  });

  it("skips null values", () => {
    expect(client.queryString({ foo: "bar", baz: null })).toBe("?foo=bar");
  });

  it("appends array values as repeated params", () => {
    const qs = client.queryString({ tags: ["#A", "#B"] });
    expect(qs).toContain("tags=%23A");
    expect(qs).toContain("tags=%23B");
  });

  it("handles number values", () => {
    expect(client.queryString({ page: 2 })).toBe("?page=2");
  });

  it("handles boolean values", () => {
    expect(client.queryString({ active: true })).toBe("?active=true");
  });
});

// ─── request ─────────────────────────────────────────────────────────────────

describe("BaseApiClient — request", () => {
  let client: TestClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    client = new TestClient({ baseUrl: "http://api.example.com", accessToken: "tok" });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("returns data on 200 response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 1 }),
    });
    const result = await client.req("/players");
    expect(result.data).toEqual({ id: 1 });
    expect(result.status).toBe(200);
    expect(result.error).toBeUndefined();
  });

  it("sets Authorization header from config token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    await client.req("/players");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok");
  });

  it("sets Content-Type header by default", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    await client.req("/players");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    const headers = options.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("returns error with string detail on non-OK response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ detail: "Not found" }),
    });
    const result = await client.req("/missing");
    expect(result.error).toBe("Not found");
    expect(result.status).toBe(404);
    expect(result.data).toBeUndefined();
  });

  it("joins array detail items into a string", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({
        detail: [{ msg: "field required" }, { msg: "invalid value" }],
      }),
    });
    const result = await client.req("/endpoint");
    expect(result.error).toBe("field required, invalid value");
  });

  it("falls back to message field when no detail", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ message: "Service unavailable" }),
    });
    const result = await client.req("/endpoint");
    expect(result.error).toBe("Service unavailable");
  });

  it("falls back to HTTP status string when no detail or message", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    });
    const result = await client.req("/endpoint");
    expect(result.error).toBe("HTTP 500");
  });

  it("returns network error on fetch exception", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));
    const result = await client.req("/players");
    expect(result.error).toBe("Network error");
    expect(result.status).toBe(0);
  });

  it("returns generic network error for non-Error exceptions", async () => {
    fetchMock.mockRejectedValue("string error");
    const result = await client.req("/players");
    expect(result.error).toBe("Network error");
    expect(result.status).toBe(0);
  });

  it("uses token from localStorage when config token is absent", async () => {
    const clientNoToken = new TestClient({ baseUrl: "http://api.example.com" });
    localStorage.setItem("access_token", "local_tok");
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    await clientNoToken.req("/players");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer local_tok");
  });

  it("does not retry 401 on auth endpoints", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ detail: "Unauthorized" }),
    });
    const result = await client.req("/v2/auth/me");
    expect(result.error).toBe("Unauthorized");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry 403 responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ detail: "Forbidden" }),
    });
    const result = await client.req("/protected");
    expect(result.error).toBe("Forbidden");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on 401 when refresh token is available and refresh succeeds", async () => {
    localStorage.setItem("refresh_token", "ref_tok");
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ access_token: "new_tok" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 42 }),
      });

    const result = await client.req("/protected");
    expect(result.data).toEqual({ id: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries one time on transient 500 for GET requests", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ detail: "Temporary upstream issue" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ recovered: true }),
      });

    const result = await client.req("/players");
    expect(result.data).toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry transient 500 for non-GET requests", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ detail: "Temporary upstream issue" }),
    });

    const result = await client.req("/players", { method: "POST" });
    expect(result.error).toBe("Temporary upstream issue");
    expect(result.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries one time on transient network failure for GET requests", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ recovered: true }),
      });

    const result = await client.req("/players");
    expect(result.data).toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry aborted GET requests", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValueOnce(abortError);

    const result = await client.req("/players");
    expect(result.error).toBe("Aborted");
    expect(result.status).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry transient 500 when signal aborts during backoff", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ detail: "Temporary upstream issue" }),
      });

      const pending = client.req("/players", { signal: controller.signal });
      await Promise.resolve();
      controller.abort();
      await vi.runAllTimersAsync();

      const result = await pending;
      expect(result.error).toBe("Temporary upstream issue");
      expect(result.status).toBe(500);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry transient network error when signal aborts during backoff", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const pending = client.req("/players", { signal: controller.signal });
      await Promise.resolve();
      controller.abort();
      await vi.runAllTimersAsync();

      const result = await pending;
      expect(result.error).toBe("Network error");
      expect(result.status).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─── requestFormData ─────────────────────────────────────────────────────────

describe("BaseApiClient — requestFormData", () => {
  let client: TestClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    client = new TestClient({ baseUrl: "http://api.example.com", accessToken: "tok" });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("returns data on successful POST", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ created: true }),
    });
    const result = await client.reqFormData("/upload", "POST", new FormData());
    expect(result.data).toEqual({ created: true });
    expect(result.status).toBe(201);
  });

  it("returns data on successful PUT", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ updated: true }),
    });
    const result = await client.reqFormData("/upload", "PUT", new FormData());
    expect(result.data).toEqual({ updated: true });
  });

  it("returns error on non-OK response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ detail: "Bad request" }),
    });
    const result = await client.reqFormData("/upload", "POST", new FormData());
    expect(result.error).toBe("Bad request");
    expect(result.status).toBe(400);
  });

  it("returns network error on exception", async () => {
    fetchMock.mockRejectedValue(new Error("Failed"));
    const result = await client.reqFormData("/upload", "POST", new FormData());
    expect(result.error).toBe("Failed");
    expect(result.status).toBe(0);
  });

  it("sets Authorization header from config token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    await client.reqFormData("/upload", "POST", new FormData());
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(options.headers["Authorization"]).toBe("Bearer tok");
  });

  it("does not set Content-Type (browser sets multipart boundary)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
    });
    await client.reqFormData("/upload", "POST", new FormData());
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(options.headers["Content-Type"]).toBeUndefined();
  });
});

// ─── _doRefresh edge cases ────────────────────────────────────────────────────

describe('BaseApiClient — _doRefresh edge cases', () => {
  let client: TestClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    client = new TestClient({ baseUrl: 'http://api.example.com', accessToken: 'tok' });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('clears tokens when refresh endpoint returns non-OK', async () => {
    localStorage.setItem('refresh_token', 'ref_tok');
    localStorage.setItem('access_token', 'old_tok');
    localStorage.setItem('user', '{}');
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: vi.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: vi.fn().mockResolvedValue({}) });
    await client.req('/protected').catch(() => null);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('stores new refresh_token when rotation is included in refresh response', async () => {
    localStorage.setItem('refresh_token', 'old_ref');
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: vi.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: vi.fn().mockResolvedValue({ access_token: 'new_tok', refresh_token: 'new_ref' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({}) });
    await client.req('/protected');
    expect(localStorage.getItem('refresh_token')).toBe('new_ref');
  });

  it('does not retry when refresh response has no access_token', async () => {
    localStorage.setItem('refresh_token', 'ref_tok');
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: vi.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ message: 'ok' }) });
    const result = await client.req('/protected');
    expect(result.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns error gracefully when network fails during refresh', async () => {
    localStorage.setItem('refresh_token', 'ref_tok');
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: vi.fn().mockResolvedValue({}) })
      .mockRejectedValueOnce(new Error('Network down'));
    const result = await client.req('/protected');
    expect(result.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('BaseApiClient — requestFormData 401 retry', () => {
  let client: TestClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    client = new TestClient({ baseUrl: 'http://api.example.com', accessToken: 'tok' });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('retries requestFormData on 401 when refresh succeeds', async () => {
    localStorage.setItem('refresh_token', 'ref_tok');
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: vi.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ access_token: 'new_tok' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ uploaded: true }) });
    const result = await client.reqFormData('/upload', 'POST', new FormData());
    expect(result.data).toEqual({ uploaded: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('BaseApiClient — proactive token refresh', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('proactively refreshes when no access_token exists but refresh_token is stored', async () => {
    const clientNoToken = new TestClient({ baseUrl: 'http://api.example.com' });
    localStorage.setItem('refresh_token', 'ref_tok');
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ access_token: 'fresh_tok' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ id: 99 }) });
    const result = await clientNoToken.req('/players');
    expect(result.data).toEqual({ id: 99 });
    const [, opts] = fetchMock.mock.calls[1] as [string, RequestInit & { headers: Headers }];
    expect((opts.headers as Headers).get('Authorization')).toBe('Bearer fresh_tok');
  });

  it('proceeds without token when proactive refresh returns no access_token', async () => {
    const clientNoToken = new TestClient({ baseUrl: 'http://api.example.com' });
    localStorage.setItem('refresh_token', 'ref_tok');
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ message: 'no token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ id: 1 }) });
    const result = await clientNoToken.req('/players');
    expect(result.data).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
