import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.json();

    // Get server_id from query params
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    if (!server_id) {
      return NextResponse.json(
        { error: 'server_id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/v2/roster?server_id=${server_id}`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (POST /roster):', error);
    return NextResponse.json(
      { error: 'Failed to create roster' },
      { status: 500 }
    );
  }
}
