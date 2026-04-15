import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function normalizePanelResponseJson(raw: string): string {
  // Preserve Discord snowflake precision by keeping welcome_channel as a string.
  return raw.replace(/("welcome_channel"\s*:\s*)(\d{15,})/g, '$1"$2"');
}

function normalizePanelRequestJson(raw: string): string {
  // Backend expects numeric/null; convert quoted numeric snowflakes to raw numbers.
  return raw.replace(/("welcome_channel"\s*:\s*)"(\d{15,})"/g, '$1$2');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> },
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/panel`, {
      method: 'GET',
      headers: { Authorization: token || '', 'Content-Type': 'application/json' },
    });
    const raw = await response.text();
    const normalized = normalizePanelResponseJson(raw);
    return new NextResponse(normalized, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API proxy error (GET /server/{id}/panel):', error);
    return NextResponse.json({ error: 'Failed to fetch panel' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> },
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const rawBody = await request.text();
    const normalizedBody = normalizePanelRequestJson(rawBody);
    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/panel`, {
      method: 'PUT',
      headers: { Authorization: token || '', 'Content-Type': 'application/json' },
      body: normalizedBody,
    });
    const raw = await response.text();
    const normalized = normalizePanelResponseJson(raw);
    return new NextResponse(normalized, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API proxy error (PUT /server/{id}/panel):', error);
    return NextResponse.json({ error: 'Failed to update panel' }, { status: 500 });
  }
}
