import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  const { server_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/logs`, { errorMessage: 'Failed to fetch logs' });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  const { server_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/logs`, { errorMessage: 'Failed to update logs' });
}
