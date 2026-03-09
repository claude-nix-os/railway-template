import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname } from 'path';

const N8N_INTERNAL_URL = 'http://127.0.0.1:5678';
const OWNER_EMAIL = 'admin@claudeos.local';
const API_KEY_LABEL = 'ClaudeOS Internal';
const API_KEY_SCOPES = ['workflow:read', 'workflow:list', 'execution:read', 'execution:list'];

/**
 * Get the path where the n8n API key is stored.
 */
function getApiKeyPath(): string {
  return (process.env.DATA_DIR || '/data') + '/n8n/.api_key';
}

/**
 * Build the owner password from the auth token.
 * Format: ClaudeOS{first 8 chars of AUTH_TOKEN}!
 */
function getOwnerPassword(): string {
  const authToken = process.env.CLAUDE_OS_AUTH_TOKEN || '';
  return `ClaudeOS${authToken.substring(0, 8)}!`;
}

/**
 * Wait for n8n to become healthy by polling its health endpoint.
 */
async function waitForHealth(
  maxAttempts: number = 60,
  intervalMs: number = 2000,
): Promise<boolean> {
  console.log('[n8n-bootstrap] Waiting for n8n to become healthy...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${N8N_INTERNAL_URL}/healthz`);
      if (res.ok) {
        console.log(`[n8n-bootstrap] n8n is healthy (attempt ${attempt})`);
        return true;
      }
    } catch {
      // n8n not ready yet
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  console.error('[n8n-bootstrap] n8n did not become healthy in time');
  return false;
}

/**
 * Create the n8n owner account. This is the initial setup step for a fresh n8n instance.
 */
async function createOwnerAccount(): Promise<boolean> {
  const password = getOwnerPassword();

  console.log('[n8n-bootstrap] Creating owner account...');

  try {
    const res = await fetch(`${N8N_INTERNAL_URL}/rest/owner/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        firstName: 'Claude',
        lastName: 'OS',
        password,
      }),
    });

    if (res.ok) {
      console.log('[n8n-bootstrap] Owner account created successfully');
      return true;
    }

    // 400 usually means owner already exists
    const body = await res.text();
    if (res.status === 400 || body.includes('already')) {
      console.log('[n8n-bootstrap] Owner account already exists');
      return true;
    }

    console.error(`[n8n-bootstrap] Failed to create owner: ${res.status} ${body}`);
    return false;
  } catch (err) {
    console.error('[n8n-bootstrap] Error creating owner:', err);
    return false;
  }
}

/**
 * Login to n8n with the owner credentials and return the session cookie.
 */
async function login(): Promise<string | null> {
  const password = getOwnerPassword();

  console.log('[n8n-bootstrap] Logging in to n8n...');

  try {
    const res = await fetch(`${N8N_INTERNAL_URL}/rest/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrLdapLoginId: OWNER_EMAIL,
        password,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[n8n-bootstrap] Login failed: ${res.status} ${body}`);
      return null;
    }

    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) {
      console.error('[n8n-bootstrap] No session cookie in login response');
      return null;
    }

    const cookie = setCookie.split(';')[0];
    console.log('[n8n-bootstrap] Login successful');
    return cookie;
  } catch (err) {
    console.error('[n8n-bootstrap] Login error:', err);
    return null;
  }
}

/**
 * Create an API key using the authenticated session and return the raw key.
 */
async function createApiKey(cookie: string): Promise<string | null> {
  console.log('[n8n-bootstrap] Creating API key...');

  try {
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year

    const res = await fetch(`${N8N_INTERNAL_URL}/rest/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        label: API_KEY_LABEL,
        scopes: API_KEY_SCOPES,
        expiresAt,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[n8n-bootstrap] API key creation failed: ${res.status} ${body}`);
      return null;
    }

    const data = await res.json();
    const rawKey = data?.data?.rawApiKey;

    if (!rawKey) {
      console.error('[n8n-bootstrap] No rawApiKey in response:', JSON.stringify(data));
      return null;
    }

    console.log('[n8n-bootstrap] API key created successfully');
    return rawKey;
  } catch (err) {
    console.error('[n8n-bootstrap] API key creation error:', err);
    return null;
  }
}

/**
 * Save the API key to disk with restricted permissions (0600).
 */
function saveApiKey(rawKey: string): boolean {
  const keyPath = getApiKeyPath();

  try {
    const keyDir = dirname(keyPath);
    if (!existsSync(keyDir)) {
      mkdirSync(keyDir, { recursive: true });
    }

    writeFileSync(keyPath, rawKey, { mode: 0o600 });
    console.log(`[n8n-bootstrap] API key saved to ${keyPath}`);
    return true;
  } catch (err) {
    console.error('[n8n-bootstrap] Failed to save API key:', err);
    return false;
  }
}

/**
 * Run the full n8n bootstrap sequence:
 * 1. Wait for n8n health check
 * 2. Create owner account
 * 3. Login with owner credentials
 * 4. Create API key
 * 5. Save raw key to disk
 */
export async function bootstrapN8n(): Promise<boolean> {
  const apiKeyPath = getApiKeyPath();

  // Skip if API key already exists
  if (existsSync(apiKeyPath)) {
    try {
      const existingKey = readFileSync(apiKeyPath, 'utf-8').trim();
      if (existingKey.length > 0) {
        console.log('[n8n-bootstrap] API key already exists, skipping bootstrap');
        return true;
      }
    } catch {
      // File exists but can't be read, proceed with bootstrap
    }
  }

  // Step 1: Wait for n8n to be healthy
  const healthy = await waitForHealth();
  if (!healthy) {
    return false;
  }

  // Step 2: Create owner account (idempotent - will succeed if already exists)
  const ownerCreated = await createOwnerAccount();
  if (!ownerCreated) {
    return false;
  }

  // Step 3: Login
  const cookie = await login();
  if (!cookie) {
    return false;
  }

  // Step 4: Create API key
  const rawKey = await createApiKey(cookie);
  if (!rawKey) {
    return false;
  }

  // Step 5: Save to disk
  const saved = saveApiKey(rawKey);
  if (!saved) {
    return false;
  }

  console.log('[n8n-bootstrap] Bootstrap completed successfully');
  return true;
}

// Allow running directly as a script
if (typeof require !== 'undefined' && require.main === module) {
  bootstrapN8n()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('[n8n-bootstrap] Fatal error:', err);
      process.exit(1);
    });
}

export {
  waitForHealth,
  createOwnerAccount,
  login,
  createApiKey,
  saveApiKey,
  getApiKeyPath,
  getOwnerPassword,
};
