import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get locale from query params
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale');

    // Build URL with optional locale parameter
    const url = new URL(`${API_BASE_URL}/v2/static/league_tiers/names`);
    if (locale) {
      url.searchParams.set('locale', locale);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /static/league_tiers/names):', error);
    return NextResponse.json(
      { error: 'Failed to fetch league tiers' },
      { status: 500 }
    );
  }
}
