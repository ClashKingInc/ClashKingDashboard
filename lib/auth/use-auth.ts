/**
 * useAuth Hook
 * Provides authentication utilities and automatic token refresh
 */

"use client";

import { useEffect, useState } from "react";
import { TokenManager } from "./token-manager";
import { ApiClient } from "@/lib/api-client";

interface AuthState {
  isAuthenticated: boolean;
  isExpired: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isExpired: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = TokenManager.isAuthenticated();
        const isExpired = TokenManager.isTokenExpired();

        if (isAuthenticated && isExpired) {
          // Try to refresh the token
          const refreshToken = TokenManager.getRefreshToken();
          if (refreshToken) {
            try {
              const apiClient = new ApiClient();
              const response = await apiClient.refreshToken(refreshToken);
              
              TokenManager.setTokens({
                access_token: response.access_token,
                refresh_token: response.refresh_token,
                expires_in: response.expires_in || 3600,
              });

              setAuthState({
                isAuthenticated: true,
                isExpired: false,
                isLoading: false,
                error: null,
              });
            } catch (error) {
              TokenManager.clearTokens();
              setAuthState({
                isAuthenticated: false,
                isExpired: true,
                isLoading: false,
                error: "Token refresh failed",
              });
            }
          }
        } else {
          setAuthState({
            isAuthenticated,
            isExpired,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        setAuthState({
          isAuthenticated: false,
          isExpired: true,
          isLoading: false,
          error: error instanceof Error ? error.message : "Auth check failed",
        });
      }
    };

    checkAuth();

    // Check token expiry every 5 minutes
    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    TokenManager.clearTokens();
    setAuthState({
      isAuthenticated: false,
      isExpired: true,
      isLoading: false,
      error: null,
    });
  };

  return {
    ...authState,
    logout,
    getAccessToken: () => TokenManager.getAccessToken(),
    getRefreshToken: () => TokenManager.getRefreshToken(),
  };
}
