/**
 * Token Manager
 * Handles storing, retrieving, and refreshing tokens
 * Also handles token expiration detection
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const DEVICE_ID_KEY = 'device_id';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export class TokenManager {
  /**
   * Store tokens in localStorage
   */
  static setTokens(data: TokenData): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);

    // Calculate and store expiry time (expires_in is in seconds)
    const expiryTime = Date.now() + data.expires_in * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Get access token from localStorage
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token from localStorage
   */
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Check if access token is expired
   * Returns true if token is expired or will expire in next 5 minutes
   */
  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;

    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;

    const expiryTime = parseInt(expiryStr, 10);
    const bufferTime = 5 * 60 * 1000; // 5 minute buffer
    const now = Date.now();

    return now + bufferTime > expiryTime;
  }

  /**
   * Clear all tokens
   */
  static clearTokens(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
