/**
 * Base HTTP client with core functionality
 */

import type { ApiConfig, ApiResponse } from '../types/common';
import { TokenManager } from '@/lib/auth/token-manager';

export class BaseApiClient {
  protected config: ApiConfig;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // If already refreshing, wait for the result
      return this.refreshPromise || null;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.config.refreshToken || TokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const deviceId = typeof window !== 'undefined' ? localStorage.getItem('device_id') : null;
        if (!deviceId) {
          throw new Error('No device_id available');
        }

        const url = `${this.config.baseUrl}/v2/auth/refresh`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
            device_id: deviceId,
          }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        const newAccessToken = data.access_token;
        const expiresIn = data.expires_in;

        // Update tokens
        this.setAccessToken(newAccessToken);
        TokenManager.setTokens({
          access_token: newAccessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
        });

        console.log('✅ Token refreshed successfully');
        return newAccessToken;
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        // Clear tokens on refresh failure
        this.clearTokens();
        TokenManager.clearTokens();
        // TODO: Redirect to login when ready for production
        // if (typeof window !== 'undefined') {
        //   window.location.href = '/login';
        // }
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Make an HTTP request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
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
      let response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      // Handle 401 - try to refresh token
      if (response.status === 401 && token && typeof window !== 'undefined') {
        console.log('⚠️ Got 401, attempting to refresh token...');
        const newToken = await this.refreshAccessToken();

        if (newToken) {
          // Retry request with new token
          headers.set('Authorization', `Bearer ${newToken}`);
          response = await fetch(url, {
            ...options,
            headers,
          });

          const retryData = await response.json().catch(() => null);

          if (!response.ok) {
            return {
              error: retryData?.detail || retryData?.message || `HTTP ${response.status}`,
              status: response.status,
            };
          }

          return {
            data: retryData,
            status: response.status,
          };
        }
      }

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
