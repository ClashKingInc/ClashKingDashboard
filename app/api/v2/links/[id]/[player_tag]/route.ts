import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; player_tag: string }> }
) {
  try {
    const { id, player_tag } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(
      `${API_BASE_URL}/v2/links/${encodeURIComponent(id)}/${encodeURIComponent(player_tag)}`,
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
    console.error('API proxy error (DELETE /links/:id/:player_tag):', error);
    return NextResponse.json(
      { error: 'Failed to unlink account' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; player_tag: string }> }
) {
  try {
    const { id, player_tag } = await params;
    const token = request.headers.get('authorization');
    const { hidden } = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/v2/links/${encodeURIComponent(id)}/${encodeURIComponent(player_tag)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hidden: Boolean(hidden) }),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PATCH /links/:id/:player_tag):', error);
    return NextResponse.json({ error: 'Failed to update account visibility' }, { status: 500 });
  }
}
