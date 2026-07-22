import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function proxy(request: NextRequest, serverId: string, method: 'GET' | 'POST') {
  const query = method === 'GET' ? request.nextUrl.search : '';
  const response = await fetch(`${API_BASE_URL}/v2/server/${serverId}/server-roles${query}`, {
    method,
    headers: {
      Authorization: request.headers.get('authorization') || '',
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? JSON.stringify(await request.json()) : undefined,
  });
  const data = await response.json().catch(() => ({ message: 'The API returned an invalid response.' }));
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ server_id: string }> }) {
  const { server_id } = await params;
  return proxy(request, server_id, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ server_id: string }> }) {
  const { server_id } = await params;
  return proxy(request, server_id, 'POST');
}
