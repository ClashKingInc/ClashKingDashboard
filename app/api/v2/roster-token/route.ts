import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');
    const roster_id = searchParams.get('roster_id');

    if (!server_id) {
      return NextResponse.json({ error: 'server_id is required' }, { status: 400 });
    }

    const params = new URLSearchParams({ server_id });
    if (roster_id) params.append('roster_id', roster_id);

    const response = await fetch(`${API_BASE_URL}/v2/roster-token?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (POST /roster-token):', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
