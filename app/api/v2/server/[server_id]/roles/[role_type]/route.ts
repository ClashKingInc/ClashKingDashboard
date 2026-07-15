import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; role_type: string }> }
) {
  const { server_id, role_type } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/roles/${role_type}`, { errorMessage: 'Failed to fetch roles' });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; role_type: string }> }
) {
  const { server_id, role_type } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/roles/${role_type}`, { errorMessage: 'Failed to create role' });
}
