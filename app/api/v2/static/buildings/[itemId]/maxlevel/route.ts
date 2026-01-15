import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> | { itemId: string } }
) {
  try {
    // Extract itemId from params (handle both Promise and direct params)
    let itemId: string;
    if (context.params instanceof Promise) {
      const params = await context.params;
      itemId = params.itemId;
    } else {
      itemId = context.params.itemId;
    }
    
    // If itemId is still undefined, try to extract from URL path
    if (!itemId || itemId === 'undefined') {
      const urlPath = request.nextUrl.pathname;
      // Extract from path like /api/v2/static/buildings/Town%20Hall/maxlevel
      const match = urlPath.match(/\/buildings\/([^/]+)\/maxlevel/);
      if (match) {
        itemId = decodeURIComponent(match[1]);
      } else {
        console.error('itemId is missing. URL path:', urlPath);
        return NextResponse.json(
          { error: 'Item ID is required' },
          { status: 400 }
        );
      }
    }
    
    // Decode the itemId if it's URL encoded
    const decodedItemId = decodeURIComponent(itemId);
    
    // Build URL to the backend API (re-encode for the backend)
    const encodedItemId = encodeURIComponent(decodedItemId);
    const url = `${API_BASE_URL}/v2/static/buildings/${encodedItemId}/maxlevel`;

    console.log('Proxying request to:', url, 'from itemId:', itemId);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch max level', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /static/buildings/[itemId]/maxlevel):', error);
    return NextResponse.json(
      { error: 'Failed to fetch max level', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
