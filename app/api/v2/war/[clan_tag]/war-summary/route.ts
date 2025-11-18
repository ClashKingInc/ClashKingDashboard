import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GET /api/v2/war/{clan_tag}/war-summary
 * Get war summary for a single clan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clan_tag: string }> }
) {
  try {
    const { clan_tag } = await params;
    const token = request.headers.get('authorization');

    const url = `${API_BASE_URL}/v2/war/${clan_tag}/war-summary`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /war/war-summary):', error);
    return NextResponse.json({ error: 'Failed to fetch war summary' }, { status: 500 });
  }
}
