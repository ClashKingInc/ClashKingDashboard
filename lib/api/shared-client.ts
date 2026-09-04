import {
  createApiClient,
  httpTransport,
  withUnauthorizedRefresh,
  ApiResponseError,
  ResponseDecodeError,
  type ExecuteOptions,
} from "@clashking/api-client";
import type { AnyEndpoint, EndpointRequest, EndpointResponse } from "@clashking/api-contracts";
import { Effect } from "effect";

import { getAccessToken, refreshAccessToken } from "@/lib/auth/session";
import { readBrowserRuntimeConfig } from "@/lib/runtime-config";

export interface SharedApiResult<A> {
  readonly data?: A;
  readonly error?: string;
  readonly errorData?: unknown;
  readonly status: number;
}

function errorMessage(body: unknown, status: number): string {
  if (typeof body !== "object" || body === null) {
    return typeof body === "string" && body.trim() ? body.trim() : `HTTP ${status}`;
  }
  const payload = body as { detail?: unknown; error?: unknown; message?: unknown };
  for (const value of [payload.detail, payload.message, payload.error]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return `HTTP ${status}`;
}

const apiOrigin = readBrowserRuntimeConfig().apiOrigin;
const browserTransport = withUnauthorizedRefresh({
  transport: httpTransport((request) => globalThis.fetch(request)),
  refresh: async () => {
    await refreshAccessToken(apiOrigin);
  },
  authorizeReplay: (request) => {
    const headers = new Headers(request.headers);
    const bearerToken = getAccessToken();
    if (bearerToken === undefined) headers.delete("authorization");
    else headers.set("authorization", `Bearer ${bearerToken}`);
    return new Request(request, { headers });
  },
});

const sharedApiClient = createApiClient({
  baseUrl: apiOrigin,
  transport: browserTransport,
  credentials: "include",
});

async function resolveExecuteOptions(
  endpoint: AnyEndpoint,
  options: ExecuteOptions,
): Promise<ExecuteOptions> {
  let bearerToken = getAccessToken();
  const isAuthEndpoint = endpoint.path.startsWith("/v2/auth/");
  if (
    options.auth === undefined
    && bearerToken === undefined
    && !isAuthEndpoint
    && globalThis.window !== undefined
  ) {
    await refreshAccessToken(apiOrigin);
    bearerToken = getAccessToken();
  }
  return {
    ...options,
    ...(options.auth !== undefined || bearerToken === undefined ? {} : { auth: { bearerToken } }),
  };
}

export async function executeSharedEndpoint<E extends AnyEndpoint>(
  endpoint: E,
  input: EndpointRequest<E>,
  options: ExecuteOptions = {},
): Promise<EndpointResponse<E>> {
  const resolvedOptions = await resolveExecuteOptions(endpoint, options);
  return Effect.runPromise(sharedApiClient.execute(endpoint, input, resolvedOptions));
}

export async function executeSharedApiResult<E extends AnyEndpoint>(
  endpoint: E,
  input: EndpointRequest<E>,
  options: ExecuteOptions = {},
): Promise<SharedApiResult<EndpointResponse<E>>> {
  try {
    const resolvedOptions = await resolveExecuteOptions(endpoint, options);
    const result = await Effect.runPromise(
      sharedApiClient.executeStatus(endpoint, input, resolvedOptions),
    );
    if ("body" in result) {
      return {
        error: errorMessage(result.body, result.status),
        errorData: result.body,
        status: result.status,
      };
    }
    return {
      data: result.value,
      status: result.status,
    };
  } catch (error) {
    if (error instanceof ApiResponseError) {
      return {
        error: errorMessage(error.body, error.status),
        errorData: error.body,
        status: error.status,
      };
    }
    const message = error instanceof Error ? error.message.trim() : "";
    return {
      error: message || (error instanceof ResponseDecodeError ? "API data validation failed" : "API request failed"),
      status: 0,
    };
  }
}
