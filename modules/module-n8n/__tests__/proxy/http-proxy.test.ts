import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rewriteHtml,
  isRootAssetPath,
  resolveUpstreamPath,
  buildUpstreamHeaders,
  stripSecurityHeaders,
  rewriteLocationHeader,
  N8N_PREFIX,
} from '../../src/proxy/http-proxy';
import { IncomingMessage } from 'http';

/**
 * Tests for the n8n HTTP proxy module.
 *
 * These tests cover the proxy's URL rewriting, header manipulation,
 * and HTML content rewriting without requiring a running n8n instance.
 */

describe('HTTP Proxy', () => {
  describe('isRootAssetPath', () => {
    it('should match known root asset prefixes', () => {
      expect(isRootAssetPath('/assets/main.js')).toBe(true);
      expect(isRootAssetPath('/static/css/style.css')).toBe(true);
      expect(isRootAssetPath('/rest/settings')).toBe(true);
      expect(isRootAssetPath('/types/workflow.d.ts')).toBe(true);
      expect(isRootAssetPath('/icons/node-icon.svg')).toBe(true);
      expect(isRootAssetPath('/schemas/credential.json')).toBe(true);
    });

    it('should not match non-asset paths', () => {
      expect(isRootAssetPath('/n8n/workflows')).toBe(false);
      expect(isRootAssetPath('/api/n8n')).toBe(false);
      expect(isRootAssetPath('/')).toBe(false);
      expect(isRootAssetPath('/some-other-path')).toBe(false);
    });

    it('should not match partial prefix matches', () => {
      expect(isRootAssetPath('/asset')).toBe(false);
      expect(isRootAssetPath('/statically')).toBe(false);
    });
  });

  describe('resolveUpstreamPath', () => {
    it('should strip the /n8n prefix', () => {
      expect(resolveUpstreamPath('/n8n/workflow/1')).toBe('/workflow/1');
      expect(resolveUpstreamPath('/n8n/rest/settings')).toBe('/rest/settings');
      expect(resolveUpstreamPath('/n8n/')).toBe('/');
    });

    it('should return / for bare /n8n', () => {
      expect(resolveUpstreamPath('/n8n')).toBe('/');
    });

    it('should pass root-level asset paths through unchanged', () => {
      expect(resolveUpstreamPath('/assets/main.js')).toBe('/assets/main.js');
      expect(resolveUpstreamPath('/rest/settings')).toBe('/rest/settings');
    });

    it('should preserve query strings', () => {
      expect(resolveUpstreamPath('/n8n/rest/workflows?limit=10')).toBe(
        '/rest/workflows?limit=10',
      );
    });
  });

  describe('rewriteHtml', () => {
    it('should rewrite href attributes to include /n8n/ prefix', () => {
      const input = '<link href="/assets/style.css" rel="stylesheet">';
      const output = rewriteHtml(input);
      expect(output).toContain('href="/n8n/assets/style.css"');
    });

    it('should rewrite src attributes to include /n8n/ prefix', () => {
      const input = '<script src="/assets/main.js"></script>';
      const output = rewriteHtml(input);
      expect(output).toContain('src="/n8n/assets/main.js"');
    });

    it('should not double-prefix paths already containing /n8n/', () => {
      const input = '<a href="/n8n/workflow/1">Link</a>';
      const output = rewriteHtml(input);
      expect(output).toContain('href="/n8n/workflow/1"');
      expect(output).not.toContain('/n8n/n8n/');
    });

    it('should rewrite fetch paths for /rest/ endpoints', () => {
      const input = 'fetch("/rest/settings")';
      const output = rewriteHtml(input);
      expect(output).toContain('"/n8n/rest/settings"');
    });

    it('should handle multiple attributes in one line', () => {
      const input = '<link href="/static/a.css"><script src="/assets/b.js"></script>';
      const output = rewriteHtml(input);
      expect(output).toContain('href="/n8n/static/a.css"');
      expect(output).toContain('src="/n8n/assets/b.js"');
    });

    it('should not modify external URLs', () => {
      const input = '<a href="https://example.com">External</a>';
      const output = rewriteHtml(input);
      expect(output).toBe(input);
    });

    it('should handle empty input', () => {
      expect(rewriteHtml('')).toBe('');
    });
  });

  describe('buildUpstreamHeaders', () => {
    it('should set host to n8n internal address', () => {
      const req = createMockRequest({
        host: 'claudeos.example.com',
        'content-type': 'text/html',
      });

      const headers = buildUpstreamHeaders(req, true);
      expect(headers['host']).toBe('127.0.0.1:5678');
    });

    it('should strip hop-by-hop headers', () => {
      const req = createMockRequest({
        host: 'example.com',
        connection: 'keep-alive',
        'keep-alive': 'timeout=5',
        'transfer-encoding': 'chunked',
        'proxy-authorization': 'Basic abc',
      });

      const headers = buildUpstreamHeaders(req, true);
      expect(headers['connection']).toBeUndefined();
      expect(headers['keep-alive']).toBeUndefined();
      expect(headers['transfer-encoding']).toBeUndefined();
      expect(headers['proxy-authorization']).toBeUndefined();
    });

    it('should set accept-encoding to identity when stripping prefix', () => {
      const req = createMockRequest({
        host: 'example.com',
        'accept-encoding': 'gzip, deflate',
      });

      const headers = buildUpstreamHeaders(req, true);
      expect(headers['accept-encoding']).toBe('identity');
    });

    it('should preserve accept-encoding when not stripping prefix', () => {
      const req = createMockRequest({
        host: 'example.com',
        'accept-encoding': 'gzip, deflate',
      });

      const headers = buildUpstreamHeaders(req, false);
      expect(headers['accept-encoding']).toBe('gzip, deflate');
    });

    it('should forward standard headers', () => {
      const req = createMockRequest({
        host: 'example.com',
        'content-type': 'application/json',
        'x-custom-header': 'value',
      });

      const headers = buildUpstreamHeaders(req, false);
      expect(headers['content-type']).toBe('application/json');
      expect(headers['x-custom-header']).toBe('value');
    });
  });

  describe('stripSecurityHeaders', () => {
    it('should remove CSP header', () => {
      const headers = {
        'content-security-policy': "default-src 'self'",
        'content-type': 'text/html',
      };

      const result = stripSecurityHeaders(headers);
      expect(result['content-security-policy']).toBeUndefined();
      expect(result['content-type']).toBe('text/html');
    });

    it('should remove X-Frame-Options header', () => {
      const headers = {
        'x-frame-options': 'DENY',
        'content-type': 'text/html',
      };

      const result = stripSecurityHeaders(headers);
      expect(result['x-frame-options']).toBeUndefined();
    });

    it('should remove content-encoding for HTML rewriting', () => {
      const headers = {
        'content-encoding': 'gzip',
        'content-type': 'text/html',
      };

      const result = stripSecurityHeaders(headers);
      expect(result['content-encoding']).toBeUndefined();
    });

    it('should remove transfer-encoding', () => {
      const headers = {
        'transfer-encoding': 'chunked',
        'content-type': 'text/html',
      };

      const result = stripSecurityHeaders(headers);
      expect(result['transfer-encoding']).toBeUndefined();
    });

    it('should preserve non-security headers', () => {
      const headers = {
        'content-type': 'text/html',
        'cache-control': 'no-cache',
        'x-custom': 'value',
      };

      const result = stripSecurityHeaders(headers);
      expect(result['content-type']).toBe('text/html');
      expect(result['cache-control']).toBe('no-cache');
      expect(result['x-custom']).toBe('value');
    });
  });

  describe('rewriteLocationHeader', () => {
    it('should add /n8n prefix to absolute paths', () => {
      expect(rewriteLocationHeader('/login')).toBe('/n8n/login');
      expect(rewriteLocationHeader('/workflow/1')).toBe('/n8n/workflow/1');
      expect(rewriteLocationHeader('/')).toBe('/n8n/');
    });

    it('should not double-prefix paths already containing /n8n/', () => {
      expect(rewriteLocationHeader('/n8n/workflow/1')).toBe('/n8n/workflow/1');
      expect(rewriteLocationHeader('/n8n/')).toBe('/n8n/');
    });

    it('should not modify full URLs', () => {
      expect(rewriteLocationHeader('https://example.com/path')).toBe(
        'https://example.com/path',
      );
    });

    it('should not modify relative paths', () => {
      expect(rewriteLocationHeader('workflow/1')).toBe('workflow/1');
    });
  });

  describe('N8N_PREFIX constant', () => {
    it('should be /n8n', () => {
      expect(N8N_PREFIX).toBe('/n8n');
    });
  });
});

/**
 * Helper to create a mock IncomingMessage with the given headers.
 */
function createMockRequest(
  headers: Record<string, string>,
): IncomingMessage {
  return {
    headers,
    method: 'GET',
    url: '/',
  } as unknown as IncomingMessage;
}
