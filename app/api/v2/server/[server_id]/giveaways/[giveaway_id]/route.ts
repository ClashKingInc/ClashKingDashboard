import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  try {
    const { server_id, giveaway_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/giveaways/${giveaway_id}`, {
      method: 'GET',
      headers: {
        Authorization: token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /giveaways/:id):', error);
    return NextResponse.json({ error: 'Failed to fetch giveaway' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  try {
    const { server_id, giveaway_id } = await params;
    const token = request.headers.get('authorization');
    const formData = await request.formData();

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/giveaways/${giveaway_id}`, {
      method: 'PUT',
      headers: {
        Authorization: token || '',
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (PUT /giveaways/:id):', error);
    return NextResponse.json({ error: 'Failed to update giveaway' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  try {
    const { server_id, giveaway_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/giveaways/${giveaway_id}`, {
      method: 'DELETE',
      headers: {
        Authorization: token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (DELETE /giveaways/:id):', error);
    return NextResponse.json({ error: 'Failed to delete giveaway' }, { status: 500 });
  }
}
