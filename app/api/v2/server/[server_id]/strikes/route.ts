import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    const playerTag = searchParams.get('player_tag');
    const viewExpired = searchParams.get('view_expired') === 'true';

    const queryParams = new URLSearchParams();
    if (playerTag) queryParams.set('player_tag', playerTag);
    queryParams.set('view_expired', String(viewExpired));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/strikes${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /server/{server_id}/strikes):', error);
    return NextResponse.json(
      { error: 'Failed to fetch strikes' },
      { status: 500 }
    );
  }
}
