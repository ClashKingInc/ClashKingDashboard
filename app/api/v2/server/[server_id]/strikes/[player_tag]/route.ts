import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; player_tag: string }> }
) {
  try {
    const { server_id, player_tag } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/strikes/${player_tag}`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      console.error(`API non-JSON response (POST /server/${server_id}/strikes/${player_tag}):`, text);
      return NextResponse.json(
        { error: `Backend error: ${text.substring(0, 100)}` },
        { status: response.status || 500 }
      );
    }
  } catch (error) {
    console.error('API proxy error (POST /server/{server_id}/strikes/{player_tag}):', error);
    return NextResponse.json(
      { error: 'Failed to add strike' },
      { status: 500 }
    );
  }
}

// This route also handles DELETE for strike_id
// Since Next.js can't differentiate between [player_tag] and [strike_id] in routing,
// DELETE requests with a strike_id will also come here
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; player_tag: string }> }
) {
  try {
    const { server_id, player_tag } = await params;
    const token = request.headers.get('authorization');

    // For DELETE, player_tag is actually strike_id
    const strikeId = player_tag;

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/strikes/${strikeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      console.error(`API non-JSON response (DELETE /server/${server_id}/strikes/${strikeId}):`, text);
      return NextResponse.json(
        { error: `Backend error: ${text.substring(0, 100)}` },
        { status: response.status || 500 }
      );
    }
  } catch (error) {
    console.error('API proxy error (DELETE /server/{server_id}/strikes/{strike_id}):', error);
    return NextResponse.json(
      { error: 'Failed to remove strike' },
      { status: 500 }
    );
  }
}
