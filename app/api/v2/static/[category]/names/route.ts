import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const { searchParams } = new URL(request.url);

    const upstream = new URL(`${API_BASE_URL}/v2/static/${category}/names`);
    searchParams.forEach((value, key) => upstream.searchParams.set(key, value));

    const response = await fetch(upstream.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('API proxy error (GET /static/:category/names):', error);
    return NextResponse.json({ error: 'Failed to fetch category names' }, { status: 500 });
  }
}
