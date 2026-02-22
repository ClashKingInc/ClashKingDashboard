import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// GET - List roster automations
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;

    // Forward all query params to the backend
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const response = await fetch(
      `${API_BASE_URL}/v2/roster-automation/list?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /roster-automation/list):', error);
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    );
  }
}
