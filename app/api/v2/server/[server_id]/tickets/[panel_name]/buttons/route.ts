import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string }> }
) {
  const { server_id, panel_name } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/buttons`, { errorMessage: 'Failed to add button' });
}
