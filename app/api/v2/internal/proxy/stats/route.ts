import { NextRequest, NextResponse } from "next/server";
import { isDeveloperUserId } from "@/lib/internal/developer-access";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PROXY_STATS_URL = "https://proxy.clashk.ing/stats";
const ALLOWED_QUERY_KEYS = ["series", "lookback", "endpoints", "limit"] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meResponse = await fetch(`${API_BASE_URL}/v2/auth/me`, {
      method: "GET",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const meData = await meResponse.json().catch(() => null);

    if (!meResponse.ok) {
      return NextResponse.json(
        meData ?? { error: "Failed to validate developer access" },
        { status: meResponse.status }
      );
    }

    if (!meData || typeof meData !== "object") {
      return NextResponse.json(
        { error: "Invalid response from auth upstream" },
        { status: 502 }
      );
    }

    if (!isDeveloperUserId(meData?.user_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const upstreamUrl = new URL(PROXY_STATS_URL);
    for (const key of ALLOWED_QUERY_KEYS) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) {
        upstreamUrl.searchParams.set(key, value);
      }
    }

    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        { error: "Invalid response from proxy stats upstream" },
        { status: response.ok ? 502 : response.status }
      );
    }

    return NextResponse.json(
      data,
      { status: response.status }
    );
  } catch (error) {
    console.error("API proxy error (GET /v2/internal/proxy/stats):", error);
    return NextResponse.json(
      { error: "Failed to fetch proxy stats" },
      { status: 500 }
    );
  }
}
