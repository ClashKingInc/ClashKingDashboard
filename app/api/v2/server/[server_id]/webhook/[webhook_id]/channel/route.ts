import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; webhook_id: string }> }
) {
  try {
    const { server_id, webhook_id } = await params;
    const token = request.headers.get('authorization');

    // Try to get channel from webhook via backend API
    // This endpoint should exist in the backend to return channel_id from webhook_id
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/webhook/${webhook_id}/channel`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /webhook/{webhook_id}/channel):', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel from webhook' },
      { status: 500 }
    );
  }
}
