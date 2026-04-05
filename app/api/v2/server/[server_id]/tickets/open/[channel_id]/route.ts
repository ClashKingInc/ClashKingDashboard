import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; channel_id: string }> },
) {
  try {
    const { server_id, channel_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/tickets/open/${channel_id}`,
      {
        method: 'DELETE',
        headers: { Authorization: token || '', 'Content-Type': 'application/json' },
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE ticket):', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
