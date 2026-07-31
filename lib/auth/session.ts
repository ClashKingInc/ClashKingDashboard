"use client";

import type { UserInfo } from "@/lib/api/types/auth";

const CHANNEL_NAME = "clashking-auth";
const LOCK_NAME = "clashking-refresh";
const LEASE_KEY = "clashking_refresh_lease";
const LEASE_MS = 10_000;

type SessionListener = () => void;
type AuthMessage =
  | { type: "token"; token: string; generation: number }
  | { type: "logout"; generation: number };

let accessToken: string | undefined;
let generation = 0;
let refreshPromise: Promise<boolean> | null = null;
const listeners = new Set<SessionListener>();
const tabId = typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2);

const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

channel?.addEventListener("message", (event: MessageEvent<AuthMessage>) => {
  const message = event.data;
  if (!message || message.generation < generation) return;
  generation = message.generation;
  accessToken = message.type === "token" ? message.token : undefined;
  notify();
});

export function getAccessToken(): string | undefined {
  return accessToken;
}

export function hasAccessToken(): boolean {
  return Boolean(accessToken);
}

export function setAccessToken(token: string, broadcast = true): void {
  accessToken = token;
  generation = nextGeneration();
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
  if (broadcast) channel?.postMessage({ type: "token", token, generation } satisfies AuthMessage);
  notify();
}

export function clearSession(broadcast = true): void {
  accessToken = undefined;
  generation = nextGeneration();
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }
  if (broadcast) channel?.postMessage({ type: "logout", generation } satisfies AuthMessage);
  notify();
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
  notify();
}

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function refreshAccessToken(baseUrl: string): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = coordinateRefresh(baseUrl).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function coordinateRefresh(baseUrl: string): Promise<boolean> {
  const observedGeneration = generation;
  const locks = typeof navigator !== "undefined"
    ? (navigator as Navigator & {
        locks?: { request<T>(name: string, callback: () => Promise<T>): Promise<T> };
      }).locks
    : undefined;
  if (locks) {
    return locks.request(LOCK_NAME, async () => {
      if (generation !== observedGeneration && accessToken) return true;
      return performRefresh(baseUrl);
    });
  }
  return withStorageLease(observedGeneration, () => performRefresh(baseUrl));
}

async function performRefresh(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/v2/auth/web/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      clearSession();
      return false;
    }
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) return false;
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function withStorageLease(
  observedGeneration: number,
  action: () => Promise<boolean>,
): Promise<boolean> {
  if (typeof window === "undefined") return action();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const now = Date.now();
    const lease = readLease();
    if (!lease || lease.expiresAt <= now || lease.owner === tabId) {
      localStorage.setItem(LEASE_KEY, JSON.stringify({ owner: tabId, expiresAt: now + LEASE_MS }));
      const acquired = readLease();
      if (acquired?.owner === tabId) {
        try {
          if (generation !== observedGeneration && accessToken) return true;
          return await action();
        } finally {
          if (readLease()?.owner === tabId) localStorage.removeItem(LEASE_KEY);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (generation !== observedGeneration && accessToken) return true;
  }
  return false;
}

function readLease(): { owner: string; expiresAt: number } | undefined {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function nextGeneration(): number {
  return Math.max(generation + 1, Date.now());
}
