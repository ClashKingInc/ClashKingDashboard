import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_TIMEOUT_MS = 15_000;

export async function proxyApiRequest(
  request: NextRequest,
  path: string,
  options: { method?: string; body?: unknown } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? request.method,
      headers: {
        Authorization: request.headers.get("authorization") ?? "",
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? parseProxyResponseBody(text, response.status, response.headers.get("content-type")) : null;
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { detail: timedOut ? "The API request timed out" : "The API request failed" },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function parseProxyResponseBody(text: string, status: number, contentType: string | null): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const looksLikeHtml = contentType?.includes("text/html") || /^\s*(?:<!doctype|<html)/i.test(text);
    if (looksLikeHtml || status >= 500) {
      return { detail: "The API is temporarily unavailable. Please try again." };
    }
    return { detail: text };
  }
}
