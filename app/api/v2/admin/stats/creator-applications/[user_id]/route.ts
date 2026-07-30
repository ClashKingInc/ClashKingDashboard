import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> },
) {
  const { user_id } = await context.params;
  const response = await fetch(
    `${API_BASE_URL}/v2/admin/stats/creator-applications/${encodeURIComponent(user_id)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: request.headers.get("authorization") || "",
        "Content-Type": "application/json",
      },
      body: await request.text(),
    },
  );
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
