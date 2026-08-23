import { isDeveloperUserId } from "../../lib/internal/developer-access";

export class RosterAssistantAuthorizationError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function assertRosterAssistantDeveloper(
  apiOrigin: string,
  userToken: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${apiOrigin.replace(/\/$/, "")}/v2/auth/me`, {
    method: "GET",
    headers: { authorization: `Bearer ${userToken}` },
    signal,
  });
  const payload = await response.json().catch(() => ({})) as {
    user_id?: unknown;
    detail?: unknown;
    error?: unknown;
    message?: unknown;
  };
  if (!response.ok) {
    const message = typeof payload.detail === "string"
      ? payload.detail
      : typeof payload.message === "string"
        ? payload.message
        : typeof payload.error === "string"
          ? payload.error
          : "Roster assistant authorization failed";
    throw new RosterAssistantAuthorizationError(response.status, message);
  }
  if (typeof payload.user_id !== "string") {
    throw new RosterAssistantAuthorizationError(502, "Roster assistant identity response is invalid");
  }
  if (!isDeveloperUserId(payload.user_id)) {
    throw new RosterAssistantAuthorizationError(403, "Roster assistant access is limited to the developer preview");
  }
}
