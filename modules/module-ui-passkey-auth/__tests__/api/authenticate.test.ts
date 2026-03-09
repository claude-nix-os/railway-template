import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';

const TEST_DATA_DIR = '/tmp/claudeos-passkey-test-api-auth';

vi.stubEnv('CLAUDEOS_DATA_DIR', TEST_DATA_DIR);
vi.stubEnv('CLAUDEOS_JWT_SECRET', 'test-jwt-secret-for-testing');

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: 'auth-test-challenge',
    timeout: 60000,
    rpId: 'localhost',
    allowCredentials: [
      {
        id: 'stored-credential-id',
        type: 'public-key',
        transports: ['internal'],
      },
    ],
    userVerification: 'preferred',
  }),
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: {
      newCounter: 1,
      credentialID: 'stored-credential-id',
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
    },
  }),
}));

function createRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

describe('Authentication API', () => {
  beforeEach(async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe('POST /api/passkeys/authenticate/options', () => {
    it('should return 404 when no passkeys are registered', async () => {
      const { POST } = await import('../../src/api/passkeys/authenticate-options');
      const request = createRequest('http://localhost:3000/api/passkeys/authenticate/options', {
        method: 'POST',
      });

      const response = await POST(request as any);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toContain('No passkeys registered');
    });

    it('should generate authentication options when passkeys exist', async () => {
      // Add a credential first
      const { addCredential } = await import('../../src/lib/passkeys');
      addCredential({
        id: 'stored-credential-id',
        publicKey: 'dGVzdC1wdWJsaWMta2V5',
        counter: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const { POST } = await import('../../src/api/passkeys/authenticate-options');
      const request = createRequest('http://localhost:3000/api/passkeys/authenticate/options', {
        method: 'POST',
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.challenge).toBe('auth-test-challenge');
      expect(data.allowCredentials).toBeDefined();
    });

    it('should store the authentication challenge', async () => {
      const { addCredential } = await import('../../src/lib/passkeys');
      addCredential({
        id: 'stored-credential-id',
        publicKey: 'dGVzdC1wdWJsaWMta2V5',
        counter: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const { POST } = await import('../../src/api/passkeys/authenticate-options');
      const request = createRequest('http://localhost:3000/api/passkeys/authenticate/options', {
        method: 'POST',
      });

      await POST(request as any);

      // Verify challenge was stored
      const challengesPath = `${TEST_DATA_DIR}/passkeys_challenges.json`;
      expect(fs.existsSync(challengesPath)).toBe(true);

      const stored = JSON.parse(fs.readFileSync(challengesPath, 'utf-8'));
      const challenges = Object.values(stored.challenges) as any[];
      expect(challenges.length).toBeGreaterThan(0);
      expect(challenges.some((c: any) => c.type === 'authentication')).toBe(true);
    });
  });

  describe('POST /api/passkeys/authenticate/verify', () => {
    it('should verify authentication and return a JWT', async () => {
      // Setup: add credential and store challenge
      const { addCredential, storeChallenge } = await import('../../src/lib/passkeys');

      addCredential({
        id: 'stored-credential-id',
        publicKey: 'dGVzdC1wdWJsaWMta2V5',
        counter: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      storeChallenge('auth-test-challenge', 'authentication');

      const { POST } = await import('../../src/api/passkeys/authenticate-verify');
      const request = createRequest('http://localhost:3000/api/passkeys/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({
          response: {
            id: 'stored-credential-id',
            rawId: 'stored-credential-id',
            response: {
              authenticatorData: 'base64url-data',
              clientDataJSON: 'base64url-data',
              signature: 'base64url-sig',
            },
            type: 'public-key',
            clientExtensionResults: {},
          },
          challenge: 'auth-test-challenge',
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.verified).toBe(true);
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.split('.')).toHaveLength(3); // JWT format
    });

    it('should reject request with missing fields', async () => {
      const { POST } = await import('../../src/api/passkeys/authenticate-verify');
      const request = createRequest('http://localhost:3000/api/passkeys/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject request with invalid challenge', async () => {
      const { addCredential } = await import('../../src/lib/passkeys');
      addCredential({
        id: 'stored-credential-id',
        publicKey: 'dGVzdC1wdWJsaWMta2V5',
        counter: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const { POST } = await import('../../src/api/passkeys/authenticate-verify');
      const request = createRequest('http://localhost:3000/api/passkeys/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({
          response: {
            id: 'stored-credential-id',
            rawId: 'stored-credential-id',
            response: {},
            type: 'public-key',
          },
          challenge: 'wrong-challenge',
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Invalid or expired challenge');
    });

    it('should update counter after successful authentication', async () => {
      const { addCredential, storeChallenge, findCredentialById } = await import('../../src/lib/passkeys');

      addCredential({
        id: 'stored-credential-id',
        publicKey: 'dGVzdC1wdWJsaWMta2V5',
        counter: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      storeChallenge('auth-test-challenge', 'authentication');

      const { POST } = await import('../../src/api/passkeys/authenticate-verify');
      const request = createRequest('http://localhost:3000/api/passkeys/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({
          response: {
            id: 'stored-credential-id',
            rawId: 'stored-credential-id',
            response: {
              authenticatorData: 'base64url-data',
              clientDataJSON: 'base64url-data',
              signature: 'base64url-sig',
            },
            type: 'public-key',
            clientExtensionResults: {},
          },
          challenge: 'auth-test-challenge',
        }),
      });

      await POST(request as any);

      // Counter should be updated to 1 (from mock)
      const cred = findCredentialById('stored-credential-id');
      expect(cred?.counter).toBe(1);
    });
  });
});
