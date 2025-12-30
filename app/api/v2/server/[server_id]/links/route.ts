import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Configure route to be dynamic and set longer timeout
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    const search = searchParams.get('search');

    let url = `${API_BASE_URL}/v2/server/${server_id}/links?limit=${limit}&offset=${offset}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    // Add AbortController with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 seconds

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        // @ts-ignore - Next.js specific options
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('API proxy timeout (GET /links): Request took longer than 55 seconds');
        return NextResponse.json(
          { error: 'Request timeout - the links endpoint is taking too long to respond' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('API proxy error (GET /links):', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}
