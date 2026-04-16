/**
 * Base HTTP client with core functionality
 */

import type { ApiConfig, ApiResponse } from '../types/common';

// Module-level singleton so all client instances share one refresh attempt
let _sharedRefreshPromise: Promise<boolean> | null = null;
const MAX_TRANSIENT_GET_RETRIES = 1;
const TRANSIENT_RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

interface RequestRetryState {
  authRetried: boolean;
  transientRetried: number;
}

function extractErrorMessage(data: any, status: number): string {
  const detail = data?.detail;
  if (Array.isArray(detail)) return detail.map((e: any) => e.msg ?? String(e)).join(', ');
  if (typeof detail === 'string') return detail;
  return data?.message || `HTTP ${status}`;
}

function canRetryTransientError(method: string, status: number): boolean {
  return method === 'GET' && TRANSIENT_RETRYABLE_STATUS.has(status);
}

function getRequestMethod(options: RequestInit): string {
  return (options.method || 'GET').toUpperCase();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class BaseApiClient {
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  /**
   * Resolve an access token, refreshing proactively if needed.
   * @param isRetry - skip proactive refresh when already retrying
   * @param isAuthEndpoint - skip proactive refresh for auth endpoints (no-op refresh loop)
   */
  private async _getToken(isRetry: boolean, isAuthEndpoint = false): Promise<string | undefined> {
    let token = this.config.accessToken;
    if (!token && globalThis.window !== undefined) {
      token = localStorage.getItem('access_token') || undefined;
    }
    if (!token && !isRetry && !isAuthEndpoint && globalThis.window !== undefined) {
      const hasRefresh = !!localStorage.getItem('refresh_token');
      if (hasRefresh) {
        const refreshed = await this._tryRefreshToken();
        if (refreshed) {
          token = this.config.accessToken || localStorage.getItem('access_token') || undefined;
        }
      }
    }
    return token;
  }

  /**
   * Make an HTTP request, with automatic token refresh on 401
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryState?: RequestRetryState
  ): Promise<ApiResponse<T>> {
    const state = this._resolveRetryState(retryState);
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);
    const method = getRequestMethod(options);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const token = await this._getToken(state.authRetried, endpoint.startsWith('/v2/auth/'));

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const authRetry = await this._retryOnUnauthorized<T>(endpoint, options, response.status, state);
        if (authRetry) return authRetry;

        const transientRetry = await this._retryOnTransientFailure<T>(endpoint, options, method, response.status, state);
        if (transientRetry) return transientRetry;

        return { error: extractErrorMessage(data, response.status), status: response.status };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      const transientRetry = await this._retryOnNetworkException<T>(endpoint, options, method, state);
      if (transientRetry) return transientRetry;

      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  private _resolveRetryState(retryState?: RequestRetryState): RequestRetryState {
    return retryState ?? { authRetried: false, transientRetried: 0 };
  }

  // A concrete ApiResponse is always truthy; undefined signals "no retry performed".
  private async _retryOnUnauthorized<T>(
    endpoint: string,
    options: RequestInit,
    status: number,
    retryState: RequestRetryState
  ): Promise<ApiResponse<T> | undefined> {
    const shouldRetryAuth =
      status === 401 &&
      !retryState.authRetried &&
      !endpoint.startsWith('/v2/auth/') &&
      globalThis.window !== undefined;

    if (!shouldRetryAuth) return undefined;

    const refreshed = await this._tryRefreshToken();
    if (!refreshed) return undefined;

    return this.request<T>(endpoint, options, {
      ...retryState,
      authRetried: true,
    });
  }

  private async _retryOnTransientFailure<T>(
    endpoint: string,
    options: RequestInit,
    method: string,
    status: number,
    retryState: RequestRetryState
  ): Promise<ApiResponse<T> | undefined> {
    const canRetry =
      canRetryTransientError(method, status) &&
      retryState.transientRetried < MAX_TRANSIENT_GET_RETRIES;

    if (!canRetry) return undefined;

    await wait(250 * (retryState.transientRetried + 1));
    return this.request<T>(endpoint, options, {
      ...retryState,
      transientRetried: retryState.transientRetried + 1,
    });
  }

  private async _retryOnNetworkException<T>(
    endpoint: string,
    options: RequestInit,
    method: string,
    retryState: RequestRetryState
  ): Promise<ApiResponse<T> | undefined> {
    const canRetry = method === 'GET' && retryState.transientRetried < MAX_TRANSIENT_GET_RETRIES;
    if (!canRetry) return undefined;

    await wait(250 * (retryState.transientRetried + 1));
    return this.request<T>(endpoint, options, {
      ...retryState,
      transientRetried: retryState.transientRetried + 1,
    });
  }

  /**
   * Make a multipart/form-data request, with automatic token refresh on 401
   */
  protected async requestFormData<T>(
    endpoint: string,
    method: 'POST' | 'PUT',
    body: FormData,
    _isRetry = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const token = await this._getToken(_isRetry);

    // Do NOT set Content-Type — browser sets it with the correct multipart boundary
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(url, { method, headers, body });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (
          response.status === 401 &&
          !_isRetry &&
          globalThis.window !== undefined
        ) {
          const refreshed = await this._tryRefreshToken();
          if (refreshed) {
            return this.requestFormData<T>(endpoint, method, body, true);
          }
        }

        return { error: extractErrorMessage(data, response.status), status: response.status };
      }

      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * All client instances share a single in-flight refresh to avoid race conditions.
   */
  private async _tryRefreshToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it instead of starting another
    if (_sharedRefreshPromise) {
      return _sharedRefreshPromise;
    }

    _sharedRefreshPromise = this._doRefresh().finally(() => {
      _sharedRefreshPromise = null;
    });

    return _sharedRefreshPromise;
  }

  private async _doRefresh(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const deviceId = localStorage.getItem('device_id') || undefined;

      const response = await fetch(`${this.config.baseUrl}/v2/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken, device_id: deviceId }),
      });

      if (!response.ok) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        // Both tokens are invalid — redirect to login preserving locale
        const pathParts = globalThis.window.location.pathname.split('/');
        const locale = pathParts[1] || 'en';
        globalThis.window.location.href = `/${locale}/login`;
        return false;
      }

      const data = await response.json();
      if (data?.access_token) {
        localStorage.setItem('access_token', data.access_token);
        this.config.accessToken = data.access_token;
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Build query string from object
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  /**
   * Update the access token
   */
  setAccessToken(token: string): void {
    this.config.accessToken = token;
  }

  /**
   * Update the refresh token
   */
  setRefreshToken(token: string): void {
    this.config.refreshToken = token;
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.config.accessToken = undefined;
    this.config.refreshToken = undefined;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ApiConfig> {
    return { ...this.config };
  }
}
