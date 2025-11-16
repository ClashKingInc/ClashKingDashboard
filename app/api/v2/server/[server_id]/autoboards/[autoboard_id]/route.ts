import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { server_id: string; autoboard_id: string } }
) {
  try {
    const { server_id, autoboard_id } = params;
    const token = request.headers.get('authorization');

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/autoboards/${autoboard_id}`,
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
    console.error('API proxy error (DELETE /autoboards/:id):', error);
    return NextResponse.json(
      { error: 'Failed to delete autoboard' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { server_id: string; autoboard_id: string } }
) {
  try {
    const { server_id, autoboard_id } = params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/autoboards/${autoboard_id}`,
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
    console.error('API proxy error (PATCH /autoboards/:id):', error);
    return NextResponse.json(
      { error: 'Failed to update autoboard' },
      { status: 500 }
    );
  }
}
