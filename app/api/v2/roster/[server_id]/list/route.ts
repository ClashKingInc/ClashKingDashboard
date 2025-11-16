import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { server_id: string } }
) {
  try {
    const server_id = params.server_id;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/roster/${server_id}/list`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /roster/:server_id/list):', error);
    return NextResponse.json(
      { error: 'Failed to fetch rosters' },
      { status: 500 }
    );
  }
}
