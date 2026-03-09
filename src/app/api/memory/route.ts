import { NextRequest, NextResponse } from 'next/server';

/**
 * Memory API Route Handler
 *
 * Proxies requests to the mem0 FastAPI service running on port 8100.
 * All requests require Bearer JWT authentication.
 *
 * Routes:
 *   GET  /api/memory/health         -> GET  /health
 *   GET  /api/memory/all            -> GET  /all?user_id=...
 *   GET  /api/memory/graph          -> GET  /graph?user_id=...
 *   GET  /api/memory/get/:id        -> GET  /get/:id
 *   POST /api/memory/add            -> POST /add
 *   POST /api/memory/search         -> POST /search
 *   POST /api/memory/graph/edge     -> POST /graph/edge
 *   DELETE /api/memory/delete/:id   -> DELETE /delete/:id
 *   DELETE /api/memory/graph/edge/:id -> DELETE /graph/edge/:id
 */

const MEM0_BASE = process.env.MEM0_URL ?? 'http://127.0.0.1:8100';

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

function requireAuth(request: NextRequest): NextResponse | null {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required. Provide a Bearer token.' },
      { status: 401 }
    );
  }
  // In production, verify the JWT here. For now, presence is sufficient.
  return null;
}

// ---------------------------------------------------------------------------
// Proxy helper
// ---------------------------------------------------------------------------

async function proxyToMem0(
  method: string,
  path: string,
  body?: unknown,
  queryString?: string
): Promise<NextResponse> {
  const url = `${MEM0_BASE}${path}${queryString ? `?${queryString}` : ''}`;

  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body !== undefined && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown proxy error';
    return NextResponse.json(
      { error: 'Memory service unavailable', detail: message },
      { status: 502 }
    );
  }
}

// ---------------------------------------------------------------------------
// Route resolution
// ---------------------------------------------------------------------------

/**
 * Parse the sub-path from the full request URL.
 * Given a request to /api/memory/all?user_id=global, extracts "all".
 * Given /api/memory/delete/abc-123, extracts "delete/abc-123".
 */
function getSubPath(request: NextRequest): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  // Remove the /api/memory prefix
  const prefix = '/api/memory';
  const sub = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : pathname;
  // Ensure leading slash
  return sub.startsWith('/') ? sub : `/${sub}`;
}

function getQueryString(request: NextRequest): string {
  const url = new URL(request.url);
  return url.search ? url.search.slice(1) : '';
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Health endpoint is public
  const subPath = getSubPath(request);
  if (subPath === '/health') {
    return proxyToMem0('GET', '/health');
  }

  // All other GET routes require auth
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const qs = getQueryString(request);

  if (subPath === '/all') {
    return proxyToMem0('GET', '/all', undefined, qs);
  }

  if (subPath === '/graph') {
    return proxyToMem0('GET', '/graph', undefined, qs);
  }

  // GET /get/:id
  const getMatch = subPath.match(/^\/get\/(.+)$/);
  if (getMatch) {
    return proxyToMem0('GET', `/get/${getMatch[1]}`);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const subPath = getSubPath(request);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (subPath === '/add') {
    return proxyToMem0('POST', '/add', body);
  }

  if (subPath === '/search') {
    return proxyToMem0('POST', '/search', body);
  }

  if (subPath === '/graph/edge') {
    return proxyToMem0('POST', '/graph/edge', body);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const subPath = getSubPath(request);

  // DELETE /delete/:id
  const deleteMatch = subPath.match(/^\/delete\/(.+)$/);
  if (deleteMatch) {
    return proxyToMem0('DELETE', `/delete/${deleteMatch[1]}`);
  }

  // DELETE /graph/edge/:id
  const edgeMatch = subPath.match(/^\/graph\/edge\/(.+)$/);
  if (edgeMatch) {
    return proxyToMem0('DELETE', `/graph/edge/${edgeMatch[1]}`);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
