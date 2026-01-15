import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; role_type: string; role_id: string }> }
) {
  try {
    const { server_id, role_type, role_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(
      `${API_BASE_URL}/v2/server/${server_id}/family-roles/${role_type}/${role_id}`,
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
    console.error('API proxy error (DELETE /family-roles):', error);
    return NextResponse.json(
      { error: 'Failed to remove family role' },
      { status: 500 }
    );
  }
}
