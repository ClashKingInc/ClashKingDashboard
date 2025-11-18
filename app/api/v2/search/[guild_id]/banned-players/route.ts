import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guild_id: string }> }
) {
  try {
    const { guild_id } = await params;
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    const queryString = query ? `?query=${encodeURIComponent(query)}` : '';
    const response = await fetch(`${API_BASE_URL}/v2/search/${guild_id}/banned-players${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /search/banned-players):', error);
    return NextResponse.json(
      { error: 'Failed to search banned players' },
      { status: 500 }
    );
  }
}
