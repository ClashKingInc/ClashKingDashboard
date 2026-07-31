"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserInfo } from "@/lib/api/types/auth";
import { apiClient, getDefaultBaseUrl } from "@/lib/api/client";
import {
  cacheUser,
  getAccessToken,
  getCachedUser,
  refreshAccessToken,
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
  const [user, setUser] = useState<UserInfo | undefined>(() => getCachedUser());

  useEffect(
    () =>
      subscribeSession(() => {
        setStatus(getAccessToken() ? "authenticated" : "anonymous");
        setUser(getCachedUser());
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    void refreshAccessToken(getDefaultBaseUrl()).then(async (restored) => {
      if (!active) return;
      if (!restored) {
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
      setStatus(getAccessToken() ? "authenticated" : "anonymous");
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ status, user }), [status, user]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionValue {
  return useContext(AuthSessionContext);
}
