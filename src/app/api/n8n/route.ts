import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';

const N8N_INTERNAL_URL = 'http://127.0.0.1:5678';

/** Cached n8n API key */
let cachedApiKey: string | null = null;

/** Whether a bootstrap attempt has been made this session */
let bootstrapAttempted = false;

/**
 * Get the file path for the stored n8n API key.
 */
function getApiKeyPath(): string {
  return (process.env.DATA_DIR || '/data') + '/n8n/.api_key';
}

/**
 * Read the n8n API key from disk, using a cached value if available.
 */
function getApiKey(): string | null {
  if (cachedApiKey) return cachedApiKey;
  try {
    cachedApiKey = readFileSync(getApiKeyPath(), 'utf-8').trim();
    return cachedApiKey;
  } catch {
    return null;
  }
}

/**
 * Clear the cached API key so it is re-read from disk on next request.
 */
function clearApiKeyCache(): void {
  cachedApiKey = null;
  bootstrapAttempted = false;
}

/**
 * Verify the incoming request has valid Bearer JWT authentication.
 */
async function verifyAuth(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  try {
    return await (globalThis as Record<string, unknown> as {
      claudeOS: { verifyToken: (token: string) => Promise<boolean> };
    }).claudeOS.verifyToken(auth.slice(7));
  } catch {
    return false;
  }
}

/**
 * Bootstrap the API key by logging in and creating one if none exists.
 */
async function bootstrapApiKey(): Promise<string | null> {
  if (bootstrapAttempted) return null;
  bootstrapAttempted = true;

  const authToken = process.env.CLAUDE_OS_AUTH_TOKEN || '';
  const password = `ClaudeOS${authToken.substring(0, 8)}!`;

  try {
    // Login to n8n
    const loginRes = await fetch(`${N8N_INTERNAL_URL}/rest/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrLdapLoginId: 'admin@claudeos.local',
        password,
      }),
    });

    if (!loginRes.ok) return null;

    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) return null;
    const cookie = setCookie.split(';')[0];

    // Create API key
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const apiKeyRes = await fetch(`${N8N_INTERNAL_URL}/rest/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        label: 'ClaudeOS Internal',
        scopes: ['workflow:read', 'workflow:list', 'execution:read', 'execution:list'],
        expiresAt,
      }),
    });

    if (!apiKeyRes.ok) return null;

    const data = await apiKeyRes.json();
    const rawKey = data?.data?.rawApiKey;
    if (rawKey) {
      const { writeFileSync } = await import('fs');
      writeFileSync(getApiKeyPath(), rawKey, { mode: 0o600 });
      cachedApiKey = rawKey;
      console.log('[n8n-api] Bootstrapped API key successfully');
      return rawKey;
    }
  } catch (err) {
    console.error('[n8n-api] Bootstrap attempt failed:', err);
  }

  console.warn('[n8n-api] Could not bootstrap API key');
  return null;
}

/**
 * Make an authenticated request to the n8n internal API.
 * Automatically handles 401 retry by clearing the cached key.
 */
async function n8nFetch(path: string): Promise<Record<string, unknown>> {
  let apiKey = getApiKey();

  // If no API key file exists, try to bootstrap one
  if (!apiKey) {
    apiKey = await bootstrapApiKey();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['X-N8N-API-KEY'] = apiKey;
  }

  const res = await fetch(`${N8N_INTERNAL_URL}${path}`, { headers });

  // On 401, clear cache and retry once with a fresh key
  if (res.status === 401 && apiKey) {
    clearApiKeyCache();
    const newKey = getApiKey() || (await bootstrapApiKey());
    if (newKey) {
      headers['X-N8N-API-KEY'] = newKey;
      const retryRes = await fetch(`${N8N_INTERNAL_URL}${path}`, { headers });
      if (!retryRes.ok) {
        return { error: `n8n returned ${retryRes.status}`, status: retryRes.status };
      }
      return retryRes.json();
    }
  }

  if (!res.ok) {
    return { error: `n8n returned ${res.status}`, status: res.status };
  }

  return res.json();
}

/**
 * GET /api/n8n?resource=workflows|executions
 *
 * Proxies requests to the n8n internal REST API, authenticated via API key.
 * The client must provide a valid Bearer JWT token.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await verifyAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resource = req.nextUrl.searchParams.get('resource');

  try {
    switch (resource) {
      case 'workflows': {
        const data = await n8nFetch('/api/v1/workflows');
        return NextResponse.json(data);
      }
      case 'executions': {
        const data = await n8nFetch('/api/v1/executions?limit=20&includeData=false');
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'n8n service unavailable', details: String(err) },
      { status: 502 },
    );
  }
}
