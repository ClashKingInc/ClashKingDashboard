import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string; custom_id: string }> },
) {
  try {
    const { server_id, panel_name, custom_id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/buttons/${encodeURIComponent(custom_id)}`,
      {
        method: 'PUT',
        headers: { Authorization: token || '', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PUT tickets button):', error);
    return NextResponse.json({ error: 'Failed to update button settings' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string; custom_id: string }> },
) {
  try {
    const { server_id, panel_name, custom_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/buttons/${encodeURIComponent(custom_id)}`,
      {
        method: 'DELETE',
        headers: { Authorization: token || '', 'Content-Type': 'application/json' },
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE tickets button):', error);
    return NextResponse.json({ error: 'Failed to delete button' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string; custom_id: string }> },
) {
  try {
    const { server_id, panel_name, custom_id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/buttons/${encodeURIComponent(custom_id)}`,
      {
        method: 'PATCH',
        headers: { Authorization: token || '', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PATCH tickets button):', error);
    return NextResponse.json({ error: 'Failed to update button appearance' }, { status: 500 });
  }
}
