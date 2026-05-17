import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const formData = await request.formData();
    const response = await fetch(`${API_BASE_URL}/v2/cdn/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: token } : {}),
      },
      body: formData,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('CDN upload proxy error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
