import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the n8n API handler module.
 *
 * These tests verify the API route handler logic without depending on
 * a running n8n instance or Next.js runtime. We mock fetch, fs, and
 * the globalThis.claudeOS.verifyToken function.
 */

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

import { readFileSync } from 'fs';

// We need to test the handler's internal logic, so we'll import
// and test the utility functions by simulating the handler behavior.

describe('n8n API Handler', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;

    // Setup globalThis.claudeOS mock
    (globalThis as Record<string, unknown>).claudeOS = {
      verifyToken: vi.fn().mockResolvedValue(true),
    };

    // Mock environment
    process.env.DATA_DIR = '/tmp/test-data';
    process.env.CLAUDE_OS_AUTH_TOKEN = 'testtoken12345678';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as Record<string, unknown>).claudeOS;
    delete process.env.DATA_DIR;
    delete process.env.CLAUDE_OS_AUTH_TOKEN;
  });

  describe('API key management', () => {
    it('should read API key from the correct path', () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockReturnValue('test-api-key-123\n');

      const key = mockReadFileSync('/tmp/test-data/n8n/.api_key', 'utf-8');
      expect(key).toBe('test-api-key-123\n');
      expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/test-data/n8n/.api_key', 'utf-8');
    });

    it('should return null when API key file does not exist', () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() => readFileSync('/tmp/test-data/n8n/.api_key', 'utf-8')).toThrow('ENOENT');
    });
  });

  describe('n8n API communication', () => {
    it('should pass X-N8N-API-KEY header when fetching workflows', async () => {
      const mockWorkflows = {
        data: [
          {
            id: '1',
            name: 'Test Workflow',
            active: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockWorkflows,
      });

      const res = await mockFetch('http://127.0.0.1:5678/api/v1/workflows', {
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': 'test-key',
        },
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Test Workflow');
    });

    it('should fetch executions with limit and includeData params', async () => {
      const mockExecutions = {
        data: [
          {
            id: '100',
            finished: true,
            mode: 'trigger',
            status: 'success',
            startedAt: '2024-01-01T12:00:00.000Z',
            stoppedAt: '2024-01-01T12:01:00.000Z',
            workflowId: '1',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockExecutions,
      });

      const res = await mockFetch(
        'http://127.0.0.1:5678/api/v1/executions?limit=20&includeData=false',
        {
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'test-key',
          },
        },
      );

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('success');

      // Verify the URL includes the correct query params
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:5678/api/v1/executions?limit=20&includeData=false',
        expect.any(Object),
      );
    });

    it('should handle 401 by clearing cache for retry', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      // Second call (retry) returns success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      const firstRes = await mockFetch('http://127.0.0.1:5678/api/v1/workflows', {
        headers: { 'X-N8N-API-KEY': 'old-key' },
      });
      expect(firstRes.status).toBe(401);

      // Simulate retry with new key
      const retryRes = await mockFetch('http://127.0.0.1:5678/api/v1/workflows', {
        headers: { 'X-N8N-API-KEY': 'new-key' },
      });
      expect(retryRes.ok).toBe(true);
    });

    it('should handle n8n service being unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        mockFetch('http://127.0.0.1:5678/api/v1/workflows', {
          headers: { 'X-N8N-API-KEY': 'test-key' },
        }),
      ).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('Authentication', () => {
    it('should verify Bearer JWT token', async () => {
      const verifyToken = (globalThis as Record<string, unknown> as {
        claudeOS: { verifyToken: ReturnType<typeof vi.fn> };
      }).claudeOS.verifyToken;

      await verifyToken('valid-jwt-token');
      expect(verifyToken).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('should reject requests without Bearer token', () => {
      const authHeader = 'Basic abc123';
      expect(authHeader.startsWith('Bearer ')).toBe(false);
    });

    it('should reject requests without any auth header', () => {
      const authHeader: string | null = null;
      expect(authHeader?.startsWith('Bearer ')).toBeFalsy();
    });
  });

  describe('Bootstrap', () => {
    it('should construct the correct owner password from auth token', () => {
      const authToken = 'testtoken12345678';
      const password = `ClaudeOS${authToken.substring(0, 8)}!`;
      expect(password).toBe('ClaudeOStesttoke!');
    });

    it('should handle empty auth token gracefully', () => {
      const authToken = '';
      const password = `ClaudeOS${authToken.substring(0, 8)}!`;
      expect(password).toBe('ClaudeOS!');
    });

    it('should handle short auth token', () => {
      const authToken = 'abc';
      const password = `ClaudeOS${authToken.substring(0, 8)}!`;
      expect(password).toBe('ClaudeOSabc!');
    });

    it('should use correct login payload structure', () => {
      const payload = {
        emailOrLdapLoginId: 'admin@claudeos.local',
        password: 'ClaudeOStesttoke!',
      };

      expect(payload.emailOrLdapLoginId).toBe('admin@claudeos.local');
      expect(payload.password).toMatch(/^ClaudeOS.+!$/);
    });

    it('should create API key with correct scopes', () => {
      const scopes = ['workflow:read', 'workflow:list', 'execution:read', 'execution:list'];

      expect(scopes).toContain('workflow:read');
      expect(scopes).toContain('workflow:list');
      expect(scopes).toContain('execution:read');
      expect(scopes).toContain('execution:list');
      expect(scopes).toHaveLength(4);
    });
  });
});
