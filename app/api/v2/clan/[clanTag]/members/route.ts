import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clanTag: string }> }
) {
  try {
    const token = request.headers.get('authorization');
    const { clanTag } = await params;

    const response = await fetch(
      `${API_BASE_URL}/v2/clan/${encodeURIComponent(decodeURIComponent(clanTag))}/members`,
      {
        method: 'GET',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /clan/[clanTag]/members):', error);
    return NextResponse.json({ error: 'Failed to fetch clan members' }, { status: 500 });
  }
}
