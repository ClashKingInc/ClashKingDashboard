import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; clan_tag: string }> }
) {
  try {
    const { server_id, clan_tag } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    // Encode clan_tag as it may contain special characters like #
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/clan/${encodeURIComponent(clan_tag)}/logs`, {
      method: 'PUT',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Log errors from backend
    if (!response.ok) {
      console.error(`Backend error (${response.status}):`, JSON.stringify(data, null, 2));
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PUT /clan/logs):', error);
    return NextResponse.json({ error: 'Failed to update clan logs' }, { status: 500 });
  }
}
