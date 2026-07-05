import { NextRequest, NextResponse } from 'next/server';
import { upstreamJsonResponse } from '@/lib/server/api-proxy';

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
    return await upstreamJsonResponse(response);
  } catch (error) {
    console.error('CDN upload proxy error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
