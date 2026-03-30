/**
 * Base HTTP client with core functionality
 */

import type { ApiConfig, ApiResponse } from '../types/common';

export class BaseApiClient {
  protected config: ApiConfig;
  private _isRefreshing = false;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  /**
   * Make an HTTP request, with automatic token refresh on 401
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetry = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Get token from config or localStorage (client-side only)
    let token = this.config.accessToken;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('access_token') || undefined;
    }

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
        // Attempt token refresh on 401, but only once and not for auth endpoints
        if (
          response.status === 401 &&
          !_isRetry &&
          !endpoint.startsWith('/v2/auth/') &&
          typeof window !== 'undefined'
        ) {
          const refreshed = await this._tryRefreshToken();
          if (refreshed) {
            return this.request<T>(endpoint, options, true);
          }
        }

        const detail = data?.detail;
        const error = Array.isArray(detail)
          ? detail.map((e: any) => e.msg ?? String(e)).join(', ')
          : typeof detail === 'string'
            ? detail
            : data?.message || `HTTP ${response.status}`;
        return { error, status: response.status };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
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

    let token = this.config.accessToken;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('access_token') || undefined;
    }

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
          typeof window !== 'undefined'
        ) {
          const refreshed = await this._tryRefreshToken();
          if (refreshed) {
            return this.requestFormData<T>(endpoint, method, body, true);
          }
        }

        const detail = data?.detail;
        const error = Array.isArray(detail)
          ? detail.map((e: any) => e.msg ?? String(e)).join(', ')
          : typeof detail === 'string'
            ? detail
            : data?.message || `HTTP ${response.status}`;
        return { error, status: response.status };
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
   * Returns true if a new access token was obtained and stored.
   */
  private async _tryRefreshToken(): Promise<boolean> {
    if (this._isRefreshing) return false;
    this._isRefreshing = true;

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
        return false;
      }

      const data = await response.json();
      if (data?.access_token) {
        localStorage.setItem('access_token', data.access_token);
        this.config.accessToken = data.access_token;
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      this._isRefreshing = false;
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
