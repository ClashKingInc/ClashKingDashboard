import { NextRequest, NextResponse } from 'next/server';
import { upstreamJsonResponse } from '@/lib/server/api-proxy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: server_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/roster/${server_id}/list`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    return upstreamJsonResponse(response);
  } catch (error) {
    console.error('API proxy error (GET /roster/:server_id/list):', error);
    return NextResponse.json(
      { error: 'Failed to fetch rosters' },
      { status: 500 }
    );
  }
}
