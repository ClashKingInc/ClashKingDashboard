import { getDefaultBaseUrl } from "@/lib/api/client";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/session";

export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/api/") ? path.slice(4) : path;
  return `${getDefaultBaseUrl()}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

export async function apiFetch(
  input: string | URL | Request,
  init: RequestInit = {},
  authRetried = false,
): Promise<Response> {
  if (input instanceof Request) return fetch(input, init);
  const raw = input instanceof URL ? input.toString() : input;
  const url = apiUrl(raw);
  const headers = new Headers(init.headers);
  const baseUrl = getDefaultBaseUrl();
  const isApiRequest = url.startsWith(baseUrl);
  const isAuthRequest = url.includes("/v2/auth/");
  let token = getAccessToken();

  // Static dashboard documents can render before AuthSessionProvider finishes
  // restoring the cookie-backed session. Wait for that shared refresh instead
  // of sending an unauthenticated first request from page-level fetches.
  if (!token && isApiRequest && !isAuthRequest && !authRetried && globalThis.window !== undefined) {
    if (await refreshAccessToken(baseUrl)) token = getAccessToken();
  }

  const suppliedAuthorization = headers.get("Authorization");
  const hasUsableAuthorization = Boolean(
    suppliedAuthorization && !/^Bearer\s*(?:undefined|null)?$/i.test(suppliedAuthorization),
  );
  if (token && isApiRequest && !hasUsableAuthorization) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body != null && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: url.includes("/v2/auth/web/") ? "include" : init.credentials,
  });
  if (response.status !== 401 || authRetried || isAuthRequest) return response;
  if (!(await refreshAccessToken(baseUrl))) return response;
  return apiFetch(input, init, true);
}
