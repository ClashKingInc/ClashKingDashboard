"use client";

import type { UserInfo } from "@/lib/api/types/auth";

const CHANNEL_NAME = "clashking-auth";
const LOCK_NAME = "clashking-refresh";
const LEASE_KEY = "clashking_refresh_lease";
const LEASE_MS = 10_000;
const ROTATION_RACE_RETRY_MS = 200;
const ACCESS_REFRESH_SKEW_MS = 60_000;
const ACCESS_REFRESH_RETRY_MS = 30_000;

export type SessionEvent = "authenticated" | "anonymous" | "user";
type SessionListener = (event: SessionEvent) => void;
export type SessionRestoreResult = "restored" | "anonymous" | "unavailable";
type AuthMessage =
  | { type: "token"; token: string; generation: number }
  | { type: "logout"; generation: number };

type AuthRuntime = {
  accessToken?: string;
  generation: number;
  refreshPromise: Promise<SessionRestoreResult> | null;
  listeners: Set<SessionListener>;
  tabId: string;
  channel: BroadcastChannel | null;
  listening: boolean;
  refreshBaseUrl?: string;
  refreshTimer?: ReturnType<typeof setTimeout>;
};

const AUTH_RUNTIME_KEY = "__clashkingAuthRuntime";
const serverRuntime = createRuntime(false);

function createTabId(enableChannel: boolean): string {
  if (!enableChannel) return "server";
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const values = globalThis.crypto.getRandomValues(new Uint32Array(4));
    return Array.from(values, (value) => value.toString(36)).join("-");
  }
  return `tab-${Date.now()}`;
}

function createRuntime(enableChannel: boolean): AuthRuntime {
  return {
    generation: 0,
    refreshPromise: null,
    listeners: new Set<SessionListener>(),
    tabId: createTabId(enableChannel),
    channel: enableChannel && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null,
    listening: false,
  };
}

function getRuntime(): AuthRuntime {
  if (typeof window === "undefined") return serverRuntime;
  const target = window as Window & { __clashkingAuthRuntime?: AuthRuntime };
  target.__clashkingAuthRuntime ??= createRuntime(true);
  const runtime = target.__clashkingAuthRuntime;
  if (!runtime.listening) {
    runtime.channel?.addEventListener("message", (event: MessageEvent<AuthMessage>) => {
      const message = event.data;
      if (!message || message.generation < runtime.generation) return;
      runtime.generation = message.generation;
      runtime.accessToken = message.type === "token" ? message.token : undefined;
      scheduleAccessTokenRefresh(runtime);
      notifyRuntime(runtime, message.type === "token" ? "authenticated" : "anonymous");
    });
    runtime.listening = true;
  }
  return runtime;
}

export function getAccessToken(): string | undefined {
  return getRuntime().accessToken;
}

export function hasAccessToken(): boolean {
  return Boolean(getRuntime().accessToken);
}

export function setAccessToken(token: string, broadcast = true): void {
  const runtime = getRuntime();
  runtime.accessToken = token;
  runtime.generation = nextGeneration(runtime);
  scheduleAccessTokenRefresh(runtime);
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
  if (broadcast) runtime.channel?.postMessage({ type: "token", token, generation: runtime.generation } satisfies AuthMessage);
  notifyRuntime(runtime, "authenticated");
}

export function clearSession(broadcast = true): void {
  const runtime = getRuntime();
  runtime.accessToken = undefined;
  runtime.generation = nextGeneration(runtime);
  scheduleAccessTokenRefresh(runtime);
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }
  if (broadcast) runtime.channel?.postMessage({ type: "logout", generation: runtime.generation } satisfies AuthMessage);
  notifyRuntime(runtime, "anonymous");
}

export function getCachedUser(): UserInfo | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem("user");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    localStorage.removeItem("user");
    return undefined;
  }
}

export function cacheUser(user: UserInfo | undefined): void {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem("user", JSON.stringify(user));
  else localStorage.removeItem("user");
  notifyRuntime(getRuntime(), "user");
}

export function subscribeSession(listener: SessionListener): () => void {
  const runtime = getRuntime();
  runtime.listeners.add(listener);
  return () => runtime.listeners.delete(listener);
}

export function startAccessTokenRefresh(baseUrl: string): () => void {
  const runtime = getRuntime();
  runtime.refreshBaseUrl = baseUrl;
  scheduleAccessTokenRefresh(runtime);
  return () => {
    if (runtime.refreshBaseUrl !== baseUrl) return;
    runtime.refreshBaseUrl = undefined;
    if (runtime.refreshTimer) clearTimeout(runtime.refreshTimer);
    runtime.refreshTimer = undefined;
  };
}

export async function refreshAccessToken(baseUrl: string): Promise<boolean> {
  return (await restoreAccessToken(baseUrl)) === "restored";
}

export function restoreAccessToken(baseUrl: string): Promise<SessionRestoreResult> {
  const runtime = getRuntime();
  if (runtime.refreshPromise) return runtime.refreshPromise;
  runtime.refreshPromise = coordinateRefresh(baseUrl).finally(() => {
    runtime.refreshPromise = null;
  });
  return runtime.refreshPromise;
}

async function coordinateRefresh(baseUrl: string): Promise<SessionRestoreResult> {
  const runtime = getRuntime();
  const observedGeneration = runtime.generation;
  const locks = typeof navigator !== "undefined"
    ? (navigator as Navigator & {
        locks?: { request<T>(name: string, callback: () => Promise<T>): Promise<T> };
      }).locks
    : undefined;
  if (locks) {
    return locks.request(LOCK_NAME, async () => {
      if (runtime.generation !== observedGeneration && runtime.accessToken) return "restored";
      return performRefresh(baseUrl, observedGeneration);
    });
  }
  return withStorageLease(observedGeneration, () => performRefresh(baseUrl, observedGeneration));
}

async function performRefresh(baseUrl: string, observedGeneration: number): Promise<SessionRestoreResult> {
  const runtime = getRuntime();
  try {
    let response = await fetch(`${baseUrl}/v2/auth/web/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (response.status === 401 && await wasAlreadyRefreshed(response)) {
      await new Promise((resolve) => setTimeout(resolve, ROTATION_RACE_RETRY_MS));
      response = await fetch(`${baseUrl}/v2/auth/web/refresh`, {
        method: "POST",
        credentials: "include",
      });
    }
    if (response.status === 401) {
      if (runtime.generation !== observedGeneration && runtime.accessToken) return "restored";
      clearSession();
      return "anonymous";
    }
    if (response.status === 403) return "anonymous";
    if (!response.ok) return "unavailable";
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) return "unavailable";
    if (runtime.generation !== observedGeneration && runtime.accessToken) return "restored";
    setAccessToken(data.access_token);
    return "restored";
  } catch {
    return "unavailable";
  }
}

async function wasAlreadyRefreshed(response: Response): Promise<boolean> {
  try {
    const body = await response.json() as { message?: unknown };
    return body.message === "Browser session was already refreshed";
  } catch {
    return false;
  }
}

async function withStorageLease(
  observedGeneration: number,
  action: () => Promise<SessionRestoreResult>,
): Promise<SessionRestoreResult> {
  if (typeof window === "undefined") return action();
  const runtime = getRuntime();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const now = Date.now();
    const lease = readLease();
    if (!lease || lease.expiresAt <= now || lease.owner === runtime.tabId) {
      localStorage.setItem(LEASE_KEY, JSON.stringify({ owner: runtime.tabId, expiresAt: now + LEASE_MS }));
      const acquired = readLease();
      if (acquired?.owner === runtime.tabId) {
        try {
          if (runtime.generation !== observedGeneration && runtime.accessToken) return "restored";
          return await action();
        } finally {
          if (readLease()?.owner === runtime.tabId) localStorage.removeItem(LEASE_KEY);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (runtime.generation !== observedGeneration && runtime.accessToken) return "restored";
  }
  return "unavailable";
}

function readLease(): { owner: string; expiresAt: number } | undefined {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function notifyRuntime(runtime: AuthRuntime, event: SessionEvent): void {
  runtime.listeners.forEach((listener) => listener(event));
}

function nextGeneration(runtime: AuthRuntime): number {
  return Math.max(runtime.generation + 1, Date.now());
}

function scheduleAccessTokenRefresh(runtime: AuthRuntime, retryInMs?: number): void {
  if (runtime.refreshTimer) clearTimeout(runtime.refreshTimer);
  runtime.refreshTimer = undefined;
  if (!runtime.refreshBaseUrl || !runtime.accessToken) return;

  const expiresAt = accessTokenExpiresAt(runtime.accessToken);
  if (!expiresAt) return;
  const delay = retryInMs ?? Math.max(0, expiresAt - Date.now() - ACCESS_REFRESH_SKEW_MS);
  runtime.refreshTimer = setTimeout(async () => {
    runtime.refreshTimer = undefined;
    const baseUrl = runtime.refreshBaseUrl;
    if (!baseUrl || !runtime.accessToken) return;
    const result = await restoreAccessToken(baseUrl);
    if (result === "unavailable" && runtime.accessToken && runtime.refreshBaseUrl === baseUrl) {
      scheduleAccessTokenRefresh(runtime, ACCESS_REFRESH_RETRY_MS);
    }
  }, delay);
}

function accessTokenExpiresAt(token: string): number | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof decoded.exp === "number" && Number.isFinite(decoded.exp) ? decoded.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}
