/**
 * Base HTTP client with core functionality
 */

import type { ApiConfig, ApiResponse } from '../types/common';

export class BaseApiClient {
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  /**
   * Make an HTTP request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.accessToken && !options.headers?.['Authorization']) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          error: data?.detail || data?.message || `HTTP ${response.status}`,
          status: response.status,
        };
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
