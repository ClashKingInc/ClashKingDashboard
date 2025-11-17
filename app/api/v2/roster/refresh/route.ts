import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');

    // Get query parameters - at least one is required
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');
    const group_id = searchParams.get('group_id');
    const roster_id = searchParams.get('roster_id');

    if (!server_id && !group_id && !roster_id) {
      return NextResponse.json(
        { error: 'Must provide server_id, group_id, or roster_id' },
        { status: 400 }
      );
    }

    // Build query string with provided parameters
    const queryParams = new URLSearchParams();
    if (server_id) queryParams.append('server_id', server_id);
    if (group_id) queryParams.append('group_id', group_id);
    if (roster_id) queryParams.append('roster_id', roster_id);

    const response = await fetch(
      `${API_BASE_URL}/v2/roster/refresh?${queryParams.toString()}`,
      {
        method: 'POST',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (POST /roster/refresh):', error);
    return NextResponse.json(
      { error: 'Failed to refresh roster data' },
      { status: 500 }
    );
  }
}
