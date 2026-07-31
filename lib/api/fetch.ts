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
  const token = getAccessToken();
  if (token && !headers.has("Authorization") && url.startsWith(getDefaultBaseUrl())) {
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
  if (response.status !== 401 || authRetried || url.includes("/v2/auth/")) return response;
  if (!(await refreshAccessToken(getDefaultBaseUrl()))) return response;
  return apiFetch(input, init, true);
}
