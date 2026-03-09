/**
 * Tests for the memory API route handler.
 *
 * These tests verify the proxy handler correctly routes requests,
 * enforces authentication, and handles error cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../../src/api/memory/handler';

// ---------------------------------------------------------------------------
// Mock fetch for proxied requests
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function mockFetchResponse(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response);
}

function createRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
): NextRequest {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: new Headers(options.headers ?? {}),
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock;
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Authentication tests
// ---------------------------------------------------------------------------

describe('Authentication', () => {
  it('allows unauthenticated access to health endpoint', async () => {
    mockFetchResponse({ status: 'ok', count: 5 });

    const req = createRequest('http://localhost:3000/api/memory/health');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.count).toBe(5);
  });

  it('rejects unauthenticated GET /all', async () => {
    const req = createRequest('http://localhost:3000/api/memory/all');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('Authentication required');
  });

  it('rejects unauthenticated POST /add', async () => {
    const req = createRequest('http://localhost:3000/api/memory/add', {
      method: 'POST',
      body: { text: 'test' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated DELETE /delete/123', async () => {
    const req = createRequest('http://localhost:3000/api/memory/delete/123', {
      method: 'DELETE',
    });
    const res = await DELETE(req);

    expect(res.status).toBe(401);
  });

  it('accepts valid Bearer token', async () => {
    mockFetchResponse([]);

    const req = createRequest('http://localhost:3000/api/memory/all', {
      headers: { Authorization: 'Bearer valid-jwt-token-123' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('rejects malformed auth header', async () => {
    const req = createRequest('http://localhost:3000/api/memory/all', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET routes
// ---------------------------------------------------------------------------

describe('GET routes', () => {
  const authHeaders = { Authorization: 'Bearer test-token' };

  it('proxies GET /all with query params', async () => {
    const memories = [{ id: '1', text: 'hello', user_id: 'global' }];
    mockFetchResponse(memories);

    const req = createRequest(
      'http://localhost:3000/api/memory/all?user_id=alice',
      { headers: authHeaders }
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(memories);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/all?user_id=alice'),
      expect.any(Object)
    );
  });

  it('proxies GET /graph', async () => {
    const graph = { nodes: [], edges: [] };
    mockFetchResponse(graph);

    const req = createRequest('http://localhost:3000/api/memory/graph', {
      headers: authHeaders,
    });
    const res = await GET(req);
    const data = await res.json();

    expect(data).toEqual(graph);
  });

  it('proxies GET /get/:id', async () => {
    const memory = { id: 'abc-123', text: 'found it' };
    mockFetchResponse(memory);

    const req = createRequest(
      'http://localhost:3000/api/memory/get/abc-123',
      { headers: authHeaders }
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.id).toBe('abc-123');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/get/abc-123'),
      expect.any(Object)
    );
  });

  it('returns 404 for unknown GET paths', async () => {
    const req = createRequest(
      'http://localhost:3000/api/memory/unknown',
      { headers: authHeaders }
    );
    const res = await GET(req);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST routes
// ---------------------------------------------------------------------------

describe('POST routes', () => {
  const authHeaders = { Authorization: 'Bearer test-token' };

  it('proxies POST /add', async () => {
    const created = {
      id: 'new-id',
      text: 'New memory',
      user_id: 'global',
      metadata: {},
    };
    mockFetchResponse(created, 201);

    const req = createRequest('http://localhost:3000/api/memory/add', {
      method: 'POST',
      headers: authHeaders,
      body: { text: 'New memory' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.text).toBe('New memory');
  });

  it('proxies POST /search', async () => {
    const results = [{ id: '1', text: 'Match', score: 0.95 }];
    mockFetchResponse(results);

    const req = createRequest('http://localhost:3000/api/memory/search', {
      method: 'POST',
      headers: authHeaders,
      body: { query: 'test query', limit: 5 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data).toEqual(results);
  });

  it('proxies POST /graph/edge', async () => {
    const edge = { id: 'e1', source_id: 'a', target_id: 'b', relation: 'link' };
    mockFetchResponse(edge, 201);

    const req = createRequest(
      'http://localhost:3000/api/memory/graph/edge',
      {
        method: 'POST',
        headers: authHeaders,
        body: { source_id: 'a', target_id: 'b', relation: 'link' },
      }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(data.relation).toBe('link');
  });

  it('returns 404 for unknown POST paths', async () => {
    const req = createRequest(
      'http://localhost:3000/api/memory/unknown',
      {
        method: 'POST',
        headers: authHeaders,
        body: {},
      }
    );
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('handles invalid JSON body', async () => {
    // Create a request with invalid body by mocking request.json()
    const req = createRequest('http://localhost:3000/api/memory/add', {
      method: 'POST',
      headers: authHeaders,
    });
    // Override json() to throw
    vi.spyOn(req, 'json').mockRejectedValueOnce(new Error('Invalid JSON'));

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });
});

// ---------------------------------------------------------------------------
// DELETE routes
// ---------------------------------------------------------------------------

describe('DELETE routes', () => {
  const authHeaders = { Authorization: 'Bearer test-token' };

  it('proxies DELETE /delete/:id', async () => {
    mockFetchResponse({ deleted: true, id: 'mem-1' });

    const req = createRequest(
      'http://localhost:3000/api/memory/delete/mem-1',
      { method: 'DELETE', headers: authHeaders }
    );
    const res = await DELETE(req);
    const data = await res.json();

    expect(data.deleted).toBe(true);
    expect(data.id).toBe('mem-1');
  });

  it('proxies DELETE /graph/edge/:id', async () => {
    mockFetchResponse({ deleted: true, id: 'edge-1' });

    const req = createRequest(
      'http://localhost:3000/api/memory/graph/edge/edge-1',
      { method: 'DELETE', headers: authHeaders }
    );
    const res = await DELETE(req);
    const data = await res.json();

    expect(data.deleted).toBe(true);
  });

  it('returns 404 for unknown DELETE paths', async () => {
    const req = createRequest(
      'http://localhost:3000/api/memory/unknown',
      { method: 'DELETE', headers: authHeaders }
    );
    const res = await DELETE(req);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Error handling', () => {
  const authHeaders = { Authorization: 'Bearer test-token' };

  it('returns 502 when mem0 service is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Connection refused'));

    const req = createRequest('http://localhost:3000/api/memory/all', {
      headers: authHeaders,
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toBe('Memory service unavailable');
    expect(data.detail).toContain('Connection refused');
  });

  it('forwards error status from mem0', async () => {
    mockFetchResponse({ detail: 'Memory not found' }, 404);

    const req = createRequest(
      'http://localhost:3000/api/memory/get/nonexistent',
      { headers: authHeaders }
    );
    const res = await GET(req);

    expect(res.status).toBe(404);
  });
});
