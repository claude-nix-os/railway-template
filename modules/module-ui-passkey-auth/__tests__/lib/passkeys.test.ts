import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { StoredCredential } from '../../src/types';

// Mock the data directory to use a temp directory
const TEST_DATA_DIR = '/tmp/claudeos-passkey-test-data';

vi.stubEnv('CLAUDEOS_DATA_DIR', TEST_DATA_DIR);
vi.stubEnv('CLAUDEOS_JWT_SECRET', 'test-jwt-secret-for-testing');

// Import after env vars are set
import {
  loadCredentials,
  saveCredentials,
  addCredential,
  findCredentialById,
  updateCredentialCounter,
  deleteCredential,
  storeChallenge,
  consumeChallenge,
  consumeChallengeByValue,
  createSetupToken,
  validateSetupToken,
  createJWT,
  verifyJWT,
  extractBearerToken,
  uint8ArrayToBase64Url,
  base64UrlToUint8Array,
} from '../../src/lib/passkeys';

describe('Passkeys Library', () => {
  beforeEach(() => {
    // Create clean test data directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  // -------------------------------------------------------------------
  // Credential Management
  // -------------------------------------------------------------------

  describe('Credential Management', () => {
    const testCredential: StoredCredential = {
      id: 'test-credential-id-1',
      publicKey: 'dGVzdC1wdWJsaWMta2V5',
      counter: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      label: 'Test Key',
    };

    it('should return empty array when no credentials exist', () => {
      const creds = loadCredentials();
      expect(creds).toEqual([]);
    });

    it('should save and load credentials', () => {
      saveCredentials([testCredential]);
      const loaded = loadCredentials();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual(testCredential);
    });

    it('should add a credential to existing list', () => {
      addCredential(testCredential);
      const loaded = loadCredentials();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-credential-id-1');

      const secondCred: StoredCredential = {
        ...testCredential,
        id: 'test-credential-id-2',
        label: 'Second Key',
      };
      addCredential(secondCred);
      const loadedAgain = loadCredentials();
      expect(loadedAgain).toHaveLength(2);
    });

    it('should find a credential by ID', () => {
      addCredential(testCredential);
      const found = findCredentialById('test-credential-id-1');
      expect(found).toBeDefined();
      expect(found!.id).toBe('test-credential-id-1');
    });

    it('should return undefined for unknown credential ID', () => {
      addCredential(testCredential);
      const found = findCredentialById('non-existent');
      expect(found).toBeUndefined();
    });

    it('should update credential counter', () => {
      addCredential(testCredential);
      updateCredentialCounter('test-credential-id-1', 5);
      const found = findCredentialById('test-credential-id-1');
      expect(found!.counter).toBe(5);
    });

    it('should not throw when updating non-existent credential counter', () => {
      expect(() => updateCredentialCounter('non-existent', 5)).not.toThrow();
    });

    it('should delete a credential', () => {
      addCredential(testCredential);
      const deleted = deleteCredential('test-credential-id-1');
      expect(deleted).toBe(true);
      const loaded = loadCredentials();
      expect(loaded).toHaveLength(0);
    });

    it('should return false when deleting non-existent credential', () => {
      const deleted = deleteCredential('non-existent');
      expect(deleted).toBe(false);
    });

    it('should handle credentials without labels', () => {
      const noLabelCred: StoredCredential = {
        id: 'no-label-cred',
        publicKey: 'dGVzdA',
        counter: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      addCredential(noLabelCred);
      const found = findCredentialById('no-label-cred');
      expect(found).toBeDefined();
      expect(found!.label).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // Challenge Management
  // -------------------------------------------------------------------

  describe('Challenge Management', () => {
    it('should store and consume a challenge by key', () => {
      const key = storeChallenge('test-challenge-value', 'registration', 'user-1');

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');

      const entry = consumeChallenge(key);
      expect(entry).toBeDefined();
      expect(entry!.challenge).toBe('test-challenge-value');
      expect(entry!.type).toBe('registration');
      expect(entry!.userId).toBe('user-1');
    });

    it('should consume a challenge only once (one-time use)', () => {
      const key = storeChallenge('one-time-challenge', 'authentication');

      const first = consumeChallenge(key);
      expect(first).toBeDefined();

      const second = consumeChallenge(key);
      expect(second).toBeUndefined();
    });

    it('should consume a challenge by value', () => {
      storeChallenge('find-by-value-challenge', 'registration');

      const entry = consumeChallengeByValue('find-by-value-challenge', 'registration');
      expect(entry).toBeDefined();
      expect(entry!.challenge).toBe('find-by-value-challenge');
    });

    it('should not find challenge with wrong type', () => {
      storeChallenge('typed-challenge', 'registration');

      const entry = consumeChallengeByValue('typed-challenge', 'authentication');
      expect(entry).toBeUndefined();
    });

    it('should return undefined for non-existent challenge key', () => {
      const entry = consumeChallenge('non-existent-key');
      expect(entry).toBeUndefined();
    });

    it('should return undefined for non-existent challenge value', () => {
      const entry = consumeChallengeByValue('non-existent', 'registration');
      expect(entry).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // Setup Token Management
  // -------------------------------------------------------------------

  describe('Setup Token Management', () => {
    it('should create a setup token', () => {
      const token = createSetupToken();

      expect(token).toBeDefined();
      expect(token.token).toBeDefined();
      expect(typeof token.token).toBe('string');
      expect(token.used).toBe(false);
      expect(token.createdAt).toBeDefined();
      expect(token.expiresAt).toBeDefined();

      // Token should expire in the future
      expect(new Date(token.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should validate a valid setup token', () => {
      const token = createSetupToken();
      const isValid = validateSetupToken(token.token);
      expect(isValid).toBe(true);
    });

    it('should mark token as used after validation', () => {
      const token = createSetupToken();

      const firstValidation = validateSetupToken(token.token);
      expect(firstValidation).toBe(true);

      // Second attempt should fail (already used)
      const secondValidation = validateSetupToken(token.token);
      expect(secondValidation).toBe(false);
    });

    it('should reject invalid token', () => {
      const isValid = validateSetupToken('non-existent-token');
      expect(isValid).toBe(false);
    });

    it('should create multiple tokens', () => {
      const token1 = createSetupToken();
      const token2 = createSetupToken();

      expect(token1.token).not.toBe(token2.token);

      // Both should be valid
      expect(validateSetupToken(token1.token)).toBe(true);
      expect(validateSetupToken(token2.token)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // JWT Helpers
  // -------------------------------------------------------------------

  describe('JWT Helpers', () => {
    it('should create and verify a JWT', async () => {
      const payload = { userId: 'test-user', role: 'admin' };
      const token = await createJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      const verified = await verifyJWT(token);
      expect(verified).not.toBeNull();
      expect(verified!.userId).toBe('test-user');
      expect(verified!.role).toBe('admin');
    });

    it('should reject an invalid JWT', async () => {
      const result = await verifyJWT('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should reject a tampered JWT', async () => {
      const token = await createJWT({ data: 'original' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      const result = await verifyJWT(tampered);
      expect(result).toBeNull();
    });

    it('should include iss and sub claims', async () => {
      const token = await createJWT({ test: true });
      const verified = await verifyJWT(token);
      expect(verified).not.toBeNull();
      expect(verified!.iss).toBe('claudeos');
      expect(verified!.sub).toBe('passkey-auth');
    });
  });

  // -------------------------------------------------------------------
  // extractBearerToken
  // -------------------------------------------------------------------

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      expect(extractBearerToken('Bearer abc123')).toBe('abc123');
    });

    it('should extract token with whitespace', () => {
      expect(extractBearerToken('Bearer  my-token ')).toBe('my-token');
    });

    it('should return null for null header', () => {
      expect(extractBearerToken(null)).toBeNull();
    });

    it('should return null for empty header', () => {
      expect(extractBearerToken('')).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      expect(extractBearerToken('Basic abc123')).toBeNull();
    });

    it('should return null for "Bearer" without a space', () => {
      expect(extractBearerToken('Bearerabc123')).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // Encoding Utilities
  // -------------------------------------------------------------------

  describe('Encoding Utilities', () => {
    it('should round-trip Uint8Array through base64url', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const encoded = uint8ArrayToBase64Url(original);
      const decoded = base64UrlToUint8Array(encoded);
      expect(decoded).toEqual(original);
    });

    it('should encode empty array', () => {
      const empty = new Uint8Array([]);
      const encoded = uint8ArrayToBase64Url(empty);
      const decoded = base64UrlToUint8Array(encoded);
      expect(decoded).toEqual(empty);
    });

    it('should produce URL-safe encoding', () => {
      // Use bytes that would produce +/= in standard base64
      const data = new Uint8Array([255, 254, 253, 252, 251, 250]);
      const encoded = uint8ArrayToBase64Url(data);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });
});
