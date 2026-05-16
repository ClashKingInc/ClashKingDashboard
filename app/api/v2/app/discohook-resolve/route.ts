import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set(['discohook.app', 'share.discohook.app']);

function isAllowedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const shareUrl = request.nextUrl.searchParams.get('url');

  if (!shareUrl || !isAllowedUrl(shareUrl)) {
    return NextResponse.json({ error: 'Invalid or disallowed URL' }, { status: 400 });
  }

  try {
    // discohook.app/?share=<id> — call the v1 share API directly (the page URL is a SPA, returns HTML)
    const parsedUrl = new URL(shareUrl);
    const shareId = parsedUrl.hostname === 'discohook.app' ? parsedUrl.searchParams.get('share') : null;
    if (shareId) {
      const apiRes = await fetch(`https://discohook.app/api/v1/share/${shareId}`, {
        headers: { 'User-Agent': 'ClashKingDashboard/1.0' },
      });
      if (!apiRes.ok) {
        return NextResponse.json({ error: 'Discohook share not found' }, { status: 422 });
      }
      const data = await apiRes.json();
      // API returns { data: { messages: [...] } } — unwrap the inner data object
      return NextResponse.json({ payload: data?.data ?? data });
    }

    const response = await fetch(shareUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'ClashKingDashboard/1.0' },
    });

    // Case 1: redirect landed on a ?data= URL
    const finalUrl = response.url;
    const dataMatch = /[?&]data=([^&\s]+)/.exec(finalUrl);
    if (dataMatch) {
      return NextResponse.json({ resolvedUrl: finalUrl });
    }

    // Case 2: API returned JSON directly (Discohook share API)
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json({ payload: data?.data ?? data });
    }

    return NextResponse.json({ error: 'Could not extract data from Discohook share link' }, { status: 422 });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve Discohook share link' }, { status: 500 });
  }
}
