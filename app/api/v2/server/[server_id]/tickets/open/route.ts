import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> },
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const status = request.nextUrl.searchParams.get('status');

    const url = new URL(`${API_BASE_URL}/v2/server/${server_id}/tickets/open`);
    if (status) url.searchParams.set('status', status);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /server/{id}/tickets/open):', error);
    return NextResponse.json({ error: 'Failed to fetch open tickets' }, { status: 500 });
  }
}
