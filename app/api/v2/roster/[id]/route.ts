import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization');

    // Get server_id from query params
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    if (!server_id) {
      return NextResponse.json(
        { error: 'server_id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/v2/roster/${id}?server_id=${server_id}`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /roster/:id):', error);
    return NextResponse.json(
      { error: 'Failed to fetch roster' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    // Get server_id from query params
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    if (!server_id) {
      return NextResponse.json(
        { error: 'server_id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/v2/roster/${id}?server_id=${server_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PATCH /roster/:id):', error);
    return NextResponse.json(
      { error: 'Failed to update roster' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization');

    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');
    const members_only = searchParams.get('members_only');

    const backendParams = new URLSearchParams();
    if (server_id) backendParams.append('server_id', server_id);
    if (members_only) backendParams.append('members_only', members_only);
    const query = backendParams.toString();

    const response = await fetch(`${API_BASE_URL}/v2/roster/${id}${query ? `?${query}` : ''}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE /roster/:id):', error);
    return NextResponse.json(
      { error: 'Failed to delete roster' },
      { status: 500 }
    );
  }
}
