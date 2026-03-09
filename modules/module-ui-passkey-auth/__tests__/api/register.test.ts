import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';

const TEST_DATA_DIR = '/tmp/claudeos-passkey-test-api-register';

vi.stubEnv('CLAUDEOS_DATA_DIR', TEST_DATA_DIR);
vi.stubEnv('CLAUDEOS_JWT_SECRET', 'test-jwt-secret-for-testing');

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'test-challenge-base64url',
    rp: { name: 'ClaudeOS', id: 'localhost' },
    user: {
      id: 'dXNlci1pZA',
      name: 'ClaudeOS User',
      displayName: 'ClaudeOS User',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: [],
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  }),
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        id: 'new-credential-id',
        publicKey: new Uint8Array([1, 2, 3, 4, 5]),
        counter: 0,
      },
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
    },
  }),
}));

// We need to create a minimal NextRequest-like object
function createRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

describe('Registration API', () => {
  beforeEach(() => {
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

  describe('POST /api/passkeys/register/options', () => {
    it('should generate registration options', async () => {
      const { POST } = await import('../../src/api/passkeys/register-options');
      const request = createRequest('http://localhost:3000/api/passkeys/register/options', {
        method: 'POST',
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.challenge).toBe('test-challenge-base64url');
      expect(data.rp.name).toBe('ClaudeOS');
      expect(data.pubKeyCredParams).toHaveLength(2);
    });

    it('should store the challenge for later verification', async () => {
      const { POST } = await import('../../src/api/passkeys/register-options');
      const request = createRequest('http://localhost:3000/api/passkeys/register/options', {
        method: 'POST',
      });

      await POST(request as any);

      // Verify challenge was stored
      const challengesPath = `${TEST_DATA_DIR}/passkeys_challenges.json`;
      expect(fs.existsSync(challengesPath)).toBe(true);

      const stored = JSON.parse(fs.readFileSync(challengesPath, 'utf-8'));
      const challenges = Object.values(stored.challenges) as any[];
      expect(challenges).toHaveLength(1);
      expect(challenges[0].challenge).toBe('test-challenge-base64url');
      expect(challenges[0].type).toBe('registration');
    });
  });

  describe('POST /api/passkeys/register/verify', () => {
    it('should verify a registration response and store credential', async () => {
      // First, store a challenge
      const { storeChallenge } = await import('../../src/lib/passkeys');
      storeChallenge('test-challenge-base64url', 'registration', 'user-1');

      const { POST } = await import('../../src/api/passkeys/register-verify');
      const request = createRequest('http://localhost:3000/api/passkeys/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          response: {
            id: 'new-credential-id',
            rawId: 'new-credential-id',
            response: {
              clientDataJSON: 'base64url-encoded',
              attestationObject: 'base64url-encoded',
            },
            type: 'public-key',
            authenticatorAttachment: 'platform',
            clientExtensionResults: {},
          },
          challenge: 'test-challenge-base64url',
          label: 'My Laptop',
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.verified).toBe(true);
      expect(data.credential).toBeDefined();
      expect(data.credential.id).toBe('new-credential-id');
      expect(data.credential.label).toBe('My Laptop');
    });

    it('should reject request with missing fields', async () => {
      const { POST } = await import('../../src/api/passkeys/register-verify');
      const request = createRequest('http://localhost:3000/api/passkeys/register/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject request with invalid/expired challenge', async () => {
      const { POST } = await import('../../src/api/passkeys/register-verify');
      const request = createRequest('http://localhost:3000/api/passkeys/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          response: {
            id: 'cred-id',
            rawId: 'cred-id',
            response: {},
            type: 'public-key',
          },
          challenge: 'non-existent-challenge',
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Invalid or expired challenge');
    });
  });
});
