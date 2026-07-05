import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(request: NextRequest) {
  return proxyApiRequest(request, `/v2/internal/bot/info`, { errorMessage: 'Failed to fetch bot info' });
}
