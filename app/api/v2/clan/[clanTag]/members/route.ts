import { NextRequest, NextResponse } from 'next/server';
import { upstreamJsonResponse } from '@/lib/server/api-proxy';

const CLASHKING_PROXY_BASE_URL = 'https://proxy.clashk.ing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clanTag: string }> }
) {
  try {
    const { clanTag } = await params;

    const response = await fetch(
      `${CLASHKING_PROXY_BASE_URL}/v1/clans/${encodeURIComponent(decodeURIComponent(clanTag))}/members`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    return upstreamJsonResponse(response);
  } catch (error) {
    console.error('API proxy error (GET /clan/[clanTag]/members):', error);
    return NextResponse.json({ error: 'Failed to fetch clan members' }, { status: 500 });
  }
}
