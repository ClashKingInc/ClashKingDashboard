import { NextRequest, NextResponse } from 'next/server';
import { upstreamJsonResponse } from '@/lib/server/api-proxy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// POST - Create signup category
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get('server_id');

    if (!serverId) {
      return NextResponse.json({ error: 'server_id is required' }, { status: 400 });
    }

    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/v2/roster-signup-category?server_id=${serverId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    return upstreamJsonResponse(response);
  } catch (error) {
    console.error('API proxy error (POST /roster-signup-category):', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
