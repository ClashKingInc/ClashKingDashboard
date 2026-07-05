import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string; custom_id: string }> }
) {
  const { server_id, panel_name, custom_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/buttons/${encodeURIComponent(custom_id)}`, { errorMessage: 'Failed to update button settings' });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string; custom_id: string }> }
) {
  const { server_id, panel_name, custom_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/buttons/${encodeURIComponent(custom_id)}`, { errorMessage: 'Failed to delete button' });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; panel_name: string; custom_id: string }> }
) {
  const { server_id, panel_name, custom_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/tickets/${encodeURIComponent(panel_name)}/buttons/${encodeURIComponent(custom_id)}`, { errorMessage: 'Failed to update button appearance' });
}
