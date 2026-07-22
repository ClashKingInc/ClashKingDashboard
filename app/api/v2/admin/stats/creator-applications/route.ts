import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || "pending";
  const response = await fetch(
    `${API_BASE_URL}/v2/admin/stats/creator-applications?status=${encodeURIComponent(status)}`,
    {
      headers: {
        Authorization: request.headers.get("authorization") || "",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
