import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GET /api/v2/war/{clan_tag}/previous
 * Get previous wars for a clan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clan_tag: string }> }
) {
  try {
    const { clan_tag } = await params;
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;

    // Forward all query parameters
    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/v2/war/${encodeURIComponent(clan_tag)}/previous${queryString ? `?${queryString}` : ''}`;

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
    console.error('API proxy error (GET /war/previous):', error);
    return NextResponse.json({ error: 'Failed to fetch previous wars' }, { status: 500 });
  }
}
