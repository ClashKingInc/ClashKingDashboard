export const CONNECT_PERMISSION = "links.read" as const;

export type ConnectedAppSelectionMode = "selected" | "all_current" | "all_current_and_future";
export type ConnectResultStatus = "connected" | "denied" | "error";

export interface ConnectRequestContext {
  applicationId: string;
  redirectUri?: string;
  state?: string;
}

export function readConnectRequest(url: URL): ConnectRequestContext | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "connect") return null;

  let applicationId: string;
  try {
    applicationId = decodeURIComponent(segments[1]);
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
