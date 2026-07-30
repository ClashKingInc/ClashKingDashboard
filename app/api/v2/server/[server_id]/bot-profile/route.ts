import { NextRequest } from "next/server";
import { proxyApiRequest } from "@/lib/api-proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ server_id: string }> }) {
  const { server_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/bot-profile`);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ server_id: string }> }) {
  const { server_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/bot-profile`, { method: "PATCH", body: await request.json() });
}
