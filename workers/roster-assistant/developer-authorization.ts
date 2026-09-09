import { isDeveloperUserId } from "../../lib/internal/developer-access";
import { AuthMeEndpoint } from "@clashking/api-contracts";
import { AssistantApiError, executeAssistantEndpoint } from "./api-client";

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
  const payload = await executeAssistantEndpoint(apiOrigin, userToken, AuthMeEndpoint, {
    path: {}, query: {}, body: {},
  }, signal).catch((error: unknown) => {
    if (error instanceof AssistantApiError) throw new RosterAssistantAuthorizationError(
      error.status,
      error.status === 502 ? "Roster assistant identity response is invalid" : error.message,
    );
    throw error;
  });
  if (!isDeveloperUserId(payload.user_id)) {
    throw new RosterAssistantAuthorizationError(403, "Roster assistant access is limited to the developer preview");
  }
}
