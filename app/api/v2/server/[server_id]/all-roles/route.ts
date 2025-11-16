import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');

    console.log('[all-roles] server_id:', server_id, 'token present:', !!token);
    console.log('[all-roles] Making request to:', `${API_BASE_URL}/v2/server/${server_id}/all-roles`);

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/all-roles`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    console.log('[all-roles] Response status:', response.status);
    console.log('[all-roles] Response headers:', Object.fromEntries(response.headers));

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.log('[all-roles] Response text:', text);
      data = { error: text || 'Invalid response from API' };
    }

    console.log('[all-roles] Response data:', data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /all-roles):', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
