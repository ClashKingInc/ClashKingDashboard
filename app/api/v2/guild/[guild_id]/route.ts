import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GET /api/v2/guild/{guild_id}
 * Proxy request to backend to get information for a specific guild
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guild_id: string }> }
) {
  try {
    const token = request.headers.get('authorization');
    const { guild_id } = await params;

    if (!token) {
      return NextResponse.json(
        { detail: 'Authorization token required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/v2/guild/${guild_id}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /v2/guild/{guild_id}):', error);
    return NextResponse.json(
      { detail: 'Failed to fetch guild information' },
      { status: 500 }
    );
  }
}
