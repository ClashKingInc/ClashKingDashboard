import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');
    const roster_id = searchParams.get('roster_id');

    if (!server_id) {
      return NextResponse.json(
        { error: 'server_id is required' },
        { status: 400 }
      );
    }

    // Build query string
    const queryParams = new URLSearchParams({ server_id });
    if (roster_id) {
      queryParams.append('roster_id', roster_id);
    }

    const response = await fetch(`${API_BASE_URL}/v2/roster/missing-members?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /roster/missing-members):', error);
    return NextResponse.json(
      { error: 'Failed to fetch missing members' },
      { status: 500 }
    );
  }
}
