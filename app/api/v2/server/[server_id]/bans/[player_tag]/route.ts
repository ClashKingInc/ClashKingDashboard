import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; player_tag: string }> }
) {
  try {
    const { server_id, player_tag } = await params;
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const body = await request.json();

    const queryString = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/bans/${player_tag}${queryString}`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (POST /server/{server_id}/bans/{player_tag}):', error);
    return NextResponse.json(
      { error: 'Failed to add ban' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; player_tag: string }> }
) {
  try {
    const { server_id, player_tag } = await params;
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    const queryString = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/bans/${player_tag}${queryString}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE /server/{server_id}/bans/{player_tag}):', error);
    return NextResponse.json(
      { error: 'Failed to remove ban' },
      { status: 500 }
    );
  }
}
