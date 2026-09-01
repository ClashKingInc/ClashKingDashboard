export const CONNECT_PERMISSION = "links.read" as const;
export const CONNECT_HOST = "connect.clashk.ing" as const;

export type ConnectedAppSelectionMode = "selected" | "all_current" | "all_current_and_future";
export type ConnectResultStatus = "connected" | "denied" | "error";

export interface ConnectRequestContext {
  applicationId: string;
  redirectUri?: string;
  state?: string;
}

export function postAuthFallbackPath(hostname: string): string {
  return hostname === CONNECT_HOST ? "/" : "/servers";
}

export function readConnectRequest(url: URL): ConnectRequestContext | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const isStandaloneUrl = url.hostname === CONNECT_HOST && segments.length === 1;
  if (!isStandaloneUrl) return null;

  let applicationId: string;
  try {
    applicationId = decodeURIComponent(segments[0]);
  } catch {
    return null;
  }
  if (!applicationId || applicationId.includes("/") || applicationId.length > 128) return null;

  const redirectUri = url.searchParams.get("redirect_uri") || undefined;
  const state = url.searchParams.has("state") ? url.searchParams.get("state") ?? "" : undefined;
  return { applicationId, redirectUri, state };
}

export function buildConnectReturnUrl(
  redirectUri: string,
  status: ConnectResultStatus,
  state?: string,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("ck_status", status);
  if (state !== undefined) url.searchParams.set("state", state);
  return url.toString();
}
