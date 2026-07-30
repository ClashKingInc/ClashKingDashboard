import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ category: string; itemId: string }> }
) {
  const { category, itemId } = await params;
  const response = await fetch(
    `${API_BASE_URL}/v2/static/${category}/${encodeURIComponent(itemId)}/max-level`,
    { headers: { 'Content-Type': 'application/json' } }
  );
  const data = await response.json().catch(() => ({ message: 'The API returned an invalid response.' }));
  return NextResponse.json(data, {
    status: response.status,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
