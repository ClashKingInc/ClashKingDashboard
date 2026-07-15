import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; embed_name: string }> }
) {
  const { server_id, embed_name } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/embeds/${encodeURIComponent(embed_name)}`, { errorMessage: 'Failed to update embed' });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; embed_name: string }> }
) {
  const { server_id, embed_name } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/embeds/${encodeURIComponent(embed_name)}`, { errorMessage: 'Failed to delete embed' });
}
