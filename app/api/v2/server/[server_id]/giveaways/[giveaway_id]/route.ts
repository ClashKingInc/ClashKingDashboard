import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  const { server_id, giveaway_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/giveaways/${giveaway_id}`, { errorMessage: 'Failed to fetch giveaway' });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  const { server_id, giveaway_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/giveaways/${giveaway_id}`, { errorMessage: 'Failed to update giveaway' });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  const { server_id, giveaway_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/giveaways/${giveaway_id}`, { errorMessage: 'Failed to delete giveaway' });
}
