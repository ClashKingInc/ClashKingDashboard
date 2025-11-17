import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GET /api/v2/guilds
 * Proxy request to backend to get all guilds the authenticated user has access to
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');

    if (!token) {
      return NextResponse.json(
        { detail: 'Authorization token required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/v2/guilds`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /v2/guilds):', error);
    return NextResponse.json(
      { detail: 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
}
