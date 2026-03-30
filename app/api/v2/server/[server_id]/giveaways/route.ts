import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/giveaways`, {
      method: 'GET',
      headers: {
        Authorization: token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /giveaways):', error);
    return NextResponse.json({ error: 'Failed to fetch giveaways' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const formData = await request.formData();

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/giveaways`, {
      method: 'POST',
      headers: {
        Authorization: token || '',
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (POST /giveaways):', error);
    return NextResponse.json({ error: 'Failed to create giveaway' }, { status: 500 });
  }
}
