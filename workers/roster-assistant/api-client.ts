import { ApiResponseError, createApiClient, httpTransport, ResponseDecodeError } from "@clashking/api-client";
import type { AnyEndpoint, EndpointRequest, EndpointResponse } from "@clashking/api-contracts";
import { Effect } from "effect";

export class AssistantApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function responseMessage(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) return body.trim().slice(0, 500);
  if (typeof body === "object" && body !== null) {
    if ("detail" in body && typeof body.detail === "string") return body.detail;
    if ("message" in body && typeof body.message === "string") return body.message;
    if ("error" in body && typeof body.error === "string") return body.error;
  }
  return `Roster API request failed (${status})`;
}

/** Worker transport: request-scoped bearer, no browser session or refresh replay. */
export async function executeAssistantEndpoint<E extends AnyEndpoint>(
  apiOrigin: string,
  userToken: string | undefined,
  endpoint: E,
  input: EndpointRequest<E>,
  signal?: AbortSignal,
  options: { readonly headers?: Readonly<Record<string, string>>; readonly fetcher?: typeof fetch } = {},
): Promise<EndpointResponse<E>> {
  const client = createApiClient({
    baseUrl: apiOrigin,
    transport: httpTransport(options.fetcher ?? ((request) => globalThis.fetch(request))),
    ...(userToken === undefined ? {} : { auth: { bearerToken: userToken } }),
    headers: options.headers,
  });
  try {
    return await Effect.runPromise(client.execute(endpoint, input, { signal }));
  } catch (error) {
    if (error instanceof ApiResponseError) throw new AssistantApiError(error.status, responseMessage(error.body, error.status));
    if (error instanceof ResponseDecodeError) throw new AssistantApiError(502, "Roster API response is invalid");
    throw error;
  }
}
