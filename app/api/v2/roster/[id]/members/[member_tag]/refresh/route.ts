import { NextRequest, NextResponse } from 'next/server';
import { upstreamJsonResponse } from '@/lib/server/api-proxy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; member_tag: string }> }
) {
  try {
    const { id: roster_id, member_tag } = await params;
    const token = request.headers.get('authorization');

    const server_id = request.nextUrl.searchParams.get('server_id');
    if (!server_id) {
      return NextResponse.json({ error: 'server_id is required' }, { status: 400 });
    }

    const response = await fetch(
      `${API_BASE_URL}/v2/roster/${roster_id}/members/${encodeURIComponent(member_tag)}/refresh?server_id=${server_id}`,
      {
        method: 'POST',
        headers: { 'Authorization': token || '' },
      }
    );

    return upstreamJsonResponse(response);
  } catch (error) {
    console.error('API proxy error (POST /roster/:id/members/:tag/refresh):', error);
    return NextResponse.json({ error: 'Failed to refresh member' }, { status: 500 });
  }
}
