import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; member_tag: string }> }
) {
  try {
    const { id: roster_id, member_tag } = await params;
    const token = request.headers.get('authorization');

    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    if (!server_id) {
      return NextResponse.json(
        { error: 'server_id is required' },
        { status: 400 }
      );
    }

    // Use the bulk operation endpoint with remove field
    const response = await fetch(
      `${API_BASE_URL}/v2/roster/${roster_id}/members?server_id=${server_id}`,
      {
        method: 'POST',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remove: [member_tag] }),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE /roster/:id/members/:member_tag):', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; member_tag: string }> }
) {
  try {
    const { id: roster_id, member_tag } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    if (!server_id) {
      return NextResponse.json(
        { error: 'server_id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/v2/roster/${roster_id}/members/${encodeURIComponent(member_tag)}?server_id=${server_id}`,
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
    console.error('API proxy error (PATCH /roster/:id/members/:member_tag):', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}
