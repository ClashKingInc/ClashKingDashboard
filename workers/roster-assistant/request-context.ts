import { DashboardRosterAIContextEndpoint, type EndpointResponse } from "@clashking/api-contracts";
import type { UIMessage } from "ai";
import { z } from "zod";
import { ROSTER_ASSISTANT_MODEL } from "../../lib/roster-assistant-constants";
import { AssistantApiError, executeAssistantEndpoint } from "./api-client";
import { assertRosterAssistantDeveloper } from "./developer-authorization";
import { buildTrustedUserTranscript } from "./request-guard";

const BrowserRequest = z.object({
  serverId: z.string().min(1),
  rosterIds: z.array(z.string()).min(1).max(25),
  viewId: z.string().optional(),
  currentView: z.json().optional(),
  mode: z.enum(["chat", "replay"]).optional(),
  sourceCode: z.string().optional(),
  sourceVersion: z.number().optional(),
  playerContexts: z.array(z.object({ playerTag: z.string(), name: z.string(), townhall: z.number(), rosterId: z.string() })).optional(),
  // Intentionally untrusted entries: the existing guard discards non-user and
  // non-text content instead of accepting tool claims or requiring them to parse.
  messages: z.array(z.unknown()),
});
export type AssistantBrowserRequest = z.infer<typeof BrowserRequest>;

export async function decodeAssistantBrowserRequest(request: Request): Promise<AssistantBrowserRequest> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AssistantApiError(400, "Roster assistant request must contain valid JSON");
  }
  const decoded = BrowserRequest.safeParse(raw);
  if (!decoded.success) throw new AssistantApiError(400, `Invalid roster assistant request: ${decoded.error.issues[0]?.message ?? "Invalid payload"}`);
  return decoded.data;
}

type ContextResponse = EndpointResponse<typeof DashboardRosterAIContextEndpoint>;
export type AssistantRequest = {
  requestId: string;
  model: ContextResponse["model"];
  userToken: string;
  request: Omit<AssistantBrowserRequest, "messages"> & { messages: UIMessage[] };
  context: Omit<ContextResponse["context"], "attachments"> & {
    attachments: NonNullable<ContextResponse["context"]["attachments"]>;
  };
};

export async function prepareRequest(
  env: Pick<RosterAssistantRuntimeEnv, "CLASHKING_API_ORIGIN">,
  request: AssistantBrowserRequest,
  userToken: string,
  signal: AbortSignal,
): Promise<AssistantRequest> {
  await assertRosterAssistantDeveloper(env.CLASHKING_API_ORIGIN, userToken, signal);
  // The same user-only text is reserved by the API and forwarded to the model.
  const messages = buildTrustedUserTranscript(request.messages);
  const payload = await executeAssistantEndpoint(env.CLASHKING_API_ORIGIN, userToken, DashboardRosterAIContextEndpoint, {
    path: {}, query: {}, body: {
      serverId: request.serverId,
      rosterIds: request.rosterIds,
      ...(request.viewId === undefined ? {} : { viewId: request.viewId }),
      messages: messages.map((message) => ({
        id: message.id, role: "user" as const,
        parts: message.parts.flatMap((part) => part.type === "text" ? [{ type: "text", text: part.text }] : []),
      })),
    },
  }, signal);
  if (payload.model !== ROSTER_ASSISTANT_MODEL) throw new AssistantApiError(502, "Roster assistant model configuration is out of sync");
  if (!payload.requestId || payload.context.attachments === null) throw new AssistantApiError(502, "Roster assistant context response is invalid");
  return {
    requestId: payload.requestId, model: payload.model, userToken,
    request: { ...request, messages, rosterIds: payload.context.attachments.map((attachment) => attachment.rosterId) },
    context: { ...payload.context, attachments: payload.context.attachments },
  };
}
