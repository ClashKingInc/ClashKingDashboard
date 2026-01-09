/**
 * Token Refresh Provider
 * Initializes automatic token refresh on app load
 */

"use client";

import { useEffect } from "react";
import { initializeTokenRefresh, startPeriodicTokenRefresh } from "@/lib/auth/token-refresh-interceptor";

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize token refresh on app load
    initializeTokenRefresh();

    // Start periodic token refresh check every 5 minutes
    const cleanup = startPeriodicTokenRefresh(5 * 60 * 1000);

    return cleanup;
  }, []);

  return <>{children}</>;
}
