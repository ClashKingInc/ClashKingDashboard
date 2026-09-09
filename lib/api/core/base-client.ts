import type {
  AnyEndpoint,
  EndpointRequest,
  EndpointResponse,
} from "@clashking/api-contracts";
import type { ExecuteOptions } from "@clashking/api-client";

import { executeSharedApiResult } from "@/lib/api/shared-client";
import type { ApiConfig, ApiResponse } from "../types/common";

/**
 * Compatibility shell for the existing domain-oriented client facade.
 * Request construction, transport, auth replay, and response decoding all live
 * in the shared Effect client; this class only supplies instance configuration.
 */
export class BaseApiClient {
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  protected executeEndpoint<E extends AnyEndpoint>(
    endpoint: E,
    input: EndpointRequest<E>,
    options: ExecuteOptions = {},
  ): Promise<ApiResponse<EndpointResponse<E>>> {
    return executeSharedApiResult(endpoint, input, {
      ...options,
      baseUrl: options.baseUrl ?? this.config.baseUrl,
      ...(options.auth !== undefined || this.config.accessToken === undefined
        ? {}
        : { auth: { bearerToken: this.config.accessToken } }),
    });
  }

  setAccessToken(token: string): void {
    this.config.accessToken = token;
  }

  clearTokens(): void {
    this.config.accessToken = undefined;
  }

  getConfig(): Readonly<ApiConfig> {
    return { ...this.config };
  }
}
