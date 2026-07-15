import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; reminder_id: string }> }
) {
  const { server_id, reminder_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/reminders/${reminder_id}`, { errorMessage: 'Failed to delete reminder' });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; reminder_id: string }> }
) {
  const { server_id, reminder_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/reminders/${reminder_id}`, { errorMessage: 'Failed to update reminder' });
}
