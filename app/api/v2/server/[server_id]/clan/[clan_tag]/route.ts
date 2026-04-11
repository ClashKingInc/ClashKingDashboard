import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; clan_tag: string }> }
) {
  try {
    const { server_id, clan_tag } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/clan/${encodeURIComponent(clan_tag)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE /clan):', error);
    return NextResponse.json({ error: 'Failed to delete clan' }, { status: 500 });
  }
}
