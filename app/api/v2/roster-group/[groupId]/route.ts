import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// PATCH - Update roster group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get('server_id');

    if (!serverId) {
      return NextResponse.json({ error: 'server_id is required' }, { status: 400 });
    }

    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/v2/roster-group/${groupId}?server_id=${serverId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PATCH /roster-group/:id):', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE - Delete roster group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get('server_id');

    if (!serverId) {
      return NextResponse.json({ error: 'server_id is required' }, { status: 400 });
    }

    const response = await fetch(
      `${API_BASE_URL}/v2/roster-group/${groupId}?server_id=${serverId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE /roster-group/:id):', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
