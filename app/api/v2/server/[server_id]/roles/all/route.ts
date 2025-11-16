import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');

    console.log('[roles/all] server_id:', server_id, 'token present:', !!token);
    console.log('[roles/all] Making request to:', `${API_BASE_URL}/v2/server/${server_id}/roles/all`);

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/roles/all`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('[roles/all] Response status:', response.status);
    console.log('[roles/all] Response data:', data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /roles/all):', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
