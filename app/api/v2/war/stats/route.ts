import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GET /api/v2/war/stats
 * Get war statistics for clans
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;

    // Forward all query parameters
    const queryString = searchParams.toString();
    const queryPart = queryString ? `?${queryString}` : '';
    const url = `${API_BASE_URL}/v2/war/clan/stats${queryPart}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /war/stats):', error);
    return NextResponse.json({ error: 'Failed to fetch war stats' }, { status: 500 });
  }
}
