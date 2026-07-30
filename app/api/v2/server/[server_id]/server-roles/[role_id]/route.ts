import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function proxy(request: NextRequest, serverId: string, roleId: string, method: 'PATCH' | 'DELETE') {
  const response = await fetch(`${API_BASE_URL}/v2/server/${serverId}/server-roles/${roleId}`, {
    method,
    headers: {
      Authorization: request.headers.get('authorization') || '',
      'Content-Type': 'application/json',
    },
    body: method === 'PATCH' ? JSON.stringify(await request.json()) : undefined,
  });
  const data = await response.json().catch(() => ({ message: 'The API returned an invalid response.' }));
  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ server_id: string; role_id: string }> }) {
  const { server_id, role_id } = await params;
  return proxy(request, server_id, role_id, 'PATCH');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ server_id: string; role_id: string }> }) {
  const { server_id, role_id } = await params;
  return proxy(request, server_id, role_id, 'DELETE');
}
