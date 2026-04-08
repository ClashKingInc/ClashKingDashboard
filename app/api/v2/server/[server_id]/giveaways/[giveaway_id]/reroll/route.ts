import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  try {
    const { server_id, giveaway_id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/giveaways/${giveaway_id}/reroll`, {
      method: 'POST',
      headers: {
        Authorization: token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (POST /giveaways/:id/reroll):', error);
    return NextResponse.json({ error: 'Failed to reroll giveaway winners' }, { status: 500 });
  }
}
