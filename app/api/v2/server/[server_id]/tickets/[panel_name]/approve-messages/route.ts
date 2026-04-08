import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string }> },
) {
  try {
    const { server_id, panel_name } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/approve-messages`,
      {
        method: 'PUT',
        headers: { Authorization: token || '', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PUT approve-messages):', error);
    return NextResponse.json({ error: 'Failed to update approve messages' }, { status: 500 });
  }
}
