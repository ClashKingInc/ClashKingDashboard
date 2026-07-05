import { NextRequest, NextResponse } from 'next/server';
import { upstreamJsonResponse } from '@/lib/server/api-proxy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// GET - List roster groups
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get('server_id');

    if (!serverId) {
      return NextResponse.json({ error: 'server_id is required' }, { status: 400 });
    }

    const response = await fetch(
      `${API_BASE_URL}/v2/roster-group/list?server_id=${serverId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
      }
    );

    return upstreamJsonResponse(response);
  } catch (error) {
    console.error('API proxy error (GET /roster-group/list):', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
