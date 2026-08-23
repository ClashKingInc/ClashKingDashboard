"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserInfo } from "@/lib/api/types/auth";
import { apiClient, getDefaultBaseUrl } from "@/lib/api/client";
import {
  cacheUser,
  getAccessToken,
  getCachedUser,
  restoreAccessToken,
  startAccessTokenRefresh,
  subscribeSession,
} from "@/lib/auth/session";

type AuthStatus = "restoring" | "authenticated" | "anonymous";

interface AuthSessionValue {
  status: AuthStatus;
  user?: UserInfo;
}

const AuthSessionContext = createContext<AuthSessionValue>({
  status: "restoring",
});

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [user, setUser] = useState<UserInfo | undefined>();

  useEffect(
    () =>
      subscribeSession((event) => {
        if (event === "authenticated") setStatus("authenticated");
        if (event === "anonymous") setStatus("anonymous");
        setUser(getCachedUser());
      }),
    [],
  );

  useEffect(() => startAccessTokenRefresh(getDefaultBaseUrl()), []);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 5_000;

    const restore = async () => {
      setUser((current) => current ?? getCachedUser());
      const result = getAccessToken()
        ? "restored"
        : await restoreAccessToken(getDefaultBaseUrl());
      if (!active) return;
      if (result === "unavailable") {
        setStatus("restoring");
        retryTimer = setTimeout(() => void restore(), retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60_000);
        return;
      }
      retryDelay = 5_000;
      if (result === "anonymous") {
        setStatus("anonymous");
        setUser(undefined);
        return;
      }
      const current = await apiClient.auth.getCurrentUser();
      if (!active) return;
      if (current.data) {
        cacheUser(current.data);
        setUser(current.data);
      }
      // A restored result means the credentialed endpoint issued and installed
      // an access token. Do not re-infer auth from a second module snapshot;
      // Vinext can replace client modules while preserving this provider.
      setStatus("authenticated");
    };

    void restore();
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  const value = useMemo(() => ({ status, user }), [status, user]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionValue {
  return useContext(AuthSessionContext);
}
