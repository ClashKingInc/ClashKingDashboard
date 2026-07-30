import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function proxyResponse(response: Response) {
  const responseBody = await response.text();
  let data: unknown = null;

  if (responseBody) {
    try {
      data = JSON.parse(responseBody);
    } catch {
      data = { message: responseBody };
    }
  }

  if (response.status === 204) {
    return new NextResponse(null, { status: response.status });
  }
  return NextResponse.json(data ?? { success: response.ok }, { status: response.status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/logs`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    return proxyResponse(response);
  } catch (error) {
    console.error('API proxy error (GET /logs):', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/logs`, {
      method: 'PUT',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return proxyResponse(response);
  } catch (error) {
    console.error('API proxy error (PUT /logs):', error);
    return NextResponse.json(
      { error: 'Failed to update logs' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/logs`, {
      method: 'PATCH',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return proxyResponse(response);
  } catch (error) {
    console.error('API proxy error (PATCH /logs):', error);
    return NextResponse.json(
      { error: 'Failed to change log state' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/logs?${query}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token || '',
      },
    });

    return proxyResponse(response);
  } catch (error) {
    console.error('API proxy error (DELETE /logs):', error);
    return NextResponse.json(
      { error: 'Failed to delete logs' },
      { status: 500 }
    );
  }
}
