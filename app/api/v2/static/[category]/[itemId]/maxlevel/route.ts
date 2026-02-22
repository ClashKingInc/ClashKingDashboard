import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; itemId: string }> }
) {
  try {
    const { category, itemId } = await params;

    const response = await fetch(
      `${API_BASE_URL}/v2/static/${category}/${encodeURIComponent(itemId)}/maxlevel`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('API proxy error (GET /static/:category/:itemId/maxlevel):', error);
    return NextResponse.json(
      { error: 'Failed to fetch max level' },
      { status: 500 }
    );
  }
}
