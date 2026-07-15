import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProxyOptions {
  /** Error message returned to the client when the upstream request throws. */
  errorMessage?: string;
  /** Extra headers set on the proxied response (e.g. Cache-Control). */
  responseHeaders?: Record<string, string>;
  /** Forward the incoming Authorization header upstream. Default: true. */
  forwardAuth?: boolean;
  /** Override the upstream base URL. Default: NEXT_PUBLIC_API_URL. */
  upstreamBase?: string;
}

/**
 * Convert an upstream fetch Response into a NextResponse, parsing the body
 * defensively: an empty body keeps its status, and a non-JSON body (e.g. an
 * HTML gateway error page) keeps its real status instead of crashing the
 * route handler and being masked as a 500.
 */
export async function upstreamJsonResponse(
  response: Response,
  responseHeaders?: Record<string, string>
): Promise<NextResponse> {
  const text = await response.text();
  if (!text) {
    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: `Upstream returned a non-JSON response (HTTP ${response.status})` },
      { status: response.status, headers: responseHeaders }
    );
  }

  return NextResponse.json(data, {
    status: response.status,
    headers: responseHeaders,
  });
}

/**
 * Forward an incoming API route request to the ClashKing backend.
 *
 * Handles the boilerplate shared by all proxy routes: query string and
 * Authorization forwarding, JSON/multipart body pass-through, safe response
 * parsing (a non-JSON upstream response such as an HTML gateway error page
 * keeps its real status instead of being masked as a 500), and network
 * error handling.
 */
export async function proxyApiRequest(
  request: NextRequest,
  upstreamPath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const {
    errorMessage = 'Upstream request failed',
    responseHeaders,
    forwardAuth = true,
    upstreamBase = API_BASE_URL,
  } = options;

  const url = new URL(`${upstreamBase}${upstreamPath}`);
  const incomingParams = request.nextUrl?.searchParams ?? new URL(request.url).searchParams;
  incomingParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers = new Headers();
  if (forwardAuth) {
    const token = request.headers.get('authorization');
    if (token) headers.set('Authorization', token);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      // Re-encoding the parsed FormData lets fetch set a fresh boundary
      init.body = await request.formData();
    } else {
      const body = await request.text();
      if (body) {
        init.body = body;
        headers.set('Content-Type', contentType || 'application/json');
      }
    }
  }

  try {
    const response = await fetch(url, init);
    return await upstreamJsonResponse(response, responseHeaders);
  } catch (error) {
    console.error(`API proxy error (${request.method} ${upstreamPath}):`, error);
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
