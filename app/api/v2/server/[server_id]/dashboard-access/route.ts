import { NextRequest } from "next/server";
import { proxyApiRequest } from "@/lib/api-proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ server_id: string }> }) {
  const { server_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/dashboard-access`);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ server_id: string }> }) {
  const { server_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/dashboard-access`, { method: "PUT", body: await request.json() });
}
