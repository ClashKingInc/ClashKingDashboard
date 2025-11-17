import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const weekend = searchParams.get('weekend');
    const type = searchParams.get('type');
    const league = searchParams.get('league') || 'All';
    const lower = searchParams.get('lower') || '1';
    const upper = searchParams.get('upper') || '50';

    if (!weekend || !type) {
      return NextResponse.json(
        { error: 'weekend and type are required' },
        { status: 400 }
      );
    }

    const url = `${API_BASE_URL}/v2/leaderboard/players/capital?weekend=${weekend}&type=${type}&league=${encodeURIComponent(league)}&lower=${lower}&upper=${upper}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /leaderboard/players/capital):', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
