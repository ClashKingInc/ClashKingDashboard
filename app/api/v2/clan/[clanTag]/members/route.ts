import { NextRequest, NextResponse } from 'next/server';

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

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /clan/[clanTag]/members):', error);
    return NextResponse.json({ error: 'Failed to fetch clan members' }, { status: 500 });
  }
}
