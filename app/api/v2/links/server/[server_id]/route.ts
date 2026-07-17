import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function proxyServerLinks(
  request: NextRequest,
  serverId: string,
  method: 'GET' | 'POST' | 'DELETE'
) {
  const target = new URL(`${API_BASE_URL}/v2/links/server/${encodeURIComponent(serverId)}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55_000);
  try {
    const body = method === 'GET' || method === 'DELETE' ? undefined : await request.text();
    const response = await fetch(target, {
      method,
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Links request timed out' }, { status: 504 });
    }
    console.error(`API proxy error (${method} /links/server/:server_id):`, error);
    return NextResponse.json({ error: 'Failed to manage server links' }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}

type RouteContext = { params: Promise<{ server_id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  return proxyServerLinks(request, (await params).server_id, 'GET');
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  return proxyServerLinks(request, (await params).server_id, 'POST');
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return proxyServerLinks(request, (await params).server_id, 'DELETE');
}
