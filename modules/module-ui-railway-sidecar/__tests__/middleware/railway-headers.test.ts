import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectRailwayConfig,
  getClientIp,
  getProtocol,
  getHost,
  getPublicUrl,
  buildCorsHeaders,
  buildCookieOptions,
  applyRailwayHeaders,
} from '../../src/middleware/railway-headers';

const originalEnv = { ...process.env };

function setEnv(overrides: Record<string, string> = {}) {
  for (const key of ['RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_ENVIRONMENT', 'RAILWAY_SERVICE_ID', 'RAILWAY_ENVIRONMENT_ID', 'PORT']) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
}

function makeHeaders(entries: Record<string, string> = {}): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(entries)) {
    headers.set(key, value);
  }
  return headers;
}

describe('Railway Headers Middleware', () => {
  afterEach(() => {
    for (const key of ['RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_ENVIRONMENT', 'RAILWAY_SERVICE_ID', 'RAILWAY_ENVIRONMENT_ID', 'PORT']) {
      delete process.env[key];
    }
  });

  describe('detectRailwayConfig', () => {
    it('returns local config when no Railway env vars are set', () => {
      setEnv({});
      const config = detectRailwayConfig();
      expect(config.publicUrl).toBeNull();
      expect(config.publicDomain).toBeNull();
      expect(config.port).toBe(3000);
      expect(config.environment).toBe('development');
      expect(config.sslTerminated).toBe(false);
      expect(config.behindProxy).toBe(false);
      expect(config.cookieSecure).toBe(false);
      expect(config.cookieSameSite).toBe('lax');
    });

    it('detects Railway environment from RAILWAY_PUBLIC_DOMAIN', () => {
      setEnv({
        RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app',
        PORT: '8080',
        RAILWAY_ENVIRONMENT: 'production',
      });
      const config = detectRailwayConfig();
      expect(config.publicUrl).toBe('https://myapp.up.railway.app');
      expect(config.publicDomain).toBe('myapp.up.railway.app');
      expect(config.port).toBe(8080);
      expect(config.environment).toBe('production');
      expect(config.sslTerminated).toBe(true);
      expect(config.behindProxy).toBe(true);
      expect(config.cookieSecure).toBe(true);
      expect(config.cookieSameSite).toBe('none');
    });

    it('detects Railway from RAILWAY_SERVICE_ID alone', () => {
      setEnv({ RAILWAY_SERVICE_ID: 'svc-123' });
      const config = detectRailwayConfig();
      expect(config.serviceId).toBe('svc-123');
      expect(config.behindProxy).toBe(true);
      expect(config.sslTerminated).toBe(true);
    });

    it('includes Railway domain in CORS origins', () => {
      setEnv({ RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app' });
      const config = detectRailwayConfig();
      expect(config.corsOrigins).toContain('https://myapp.up.railway.app');
      expect(config.corsOrigins).toContain('http://localhost:3000');
    });
  });

  describe('getClientIp', () => {
    it('returns first IP from x-forwarded-for', () => {
      const headers = makeHeaders({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIp(headers)).toBe('1.2.3.4');
    });

    it('returns x-real-ip if no x-forwarded-for', () => {
      const headers = makeHeaders({ 'x-real-ip': '10.0.0.1' });
      expect(getClientIp(headers)).toBe('10.0.0.1');
    });

    it('returns 127.0.0.1 as fallback', () => {
      const headers = makeHeaders();
      expect(getClientIp(headers)).toBe('127.0.0.1');
    });
  });

  describe('getProtocol', () => {
    it('returns https when x-forwarded-proto is https', () => {
      const headers = makeHeaders({ 'x-forwarded-proto': 'https' });
      expect(getProtocol(headers)).toBe('https');
    });

    it('returns http when x-forwarded-proto is http', () => {
      const headers = makeHeaders({ 'x-forwarded-proto': 'http' });
      expect(getProtocol(headers)).toBe('http');
    });

    it('returns http as default', () => {
      const headers = makeHeaders();
      expect(getProtocol(headers)).toBe('http');
    });
  });

  describe('getHost', () => {
    it('returns x-forwarded-host when present', () => {
      const headers = makeHeaders({ 'x-forwarded-host': 'myapp.up.railway.app' });
      expect(getHost(headers)).toBe('myapp.up.railway.app');
    });

    it('falls back to host header', () => {
      const headers = makeHeaders({ 'host': 'localhost:3000' });
      expect(getHost(headers)).toBe('localhost:3000');
    });

    it('returns fallback when no host headers', () => {
      const headers = makeHeaders();
      expect(getHost(headers, 'default-host')).toBe('default-host');
    });
  });

  describe('getPublicUrl', () => {
    it('builds full URL from proxy headers', () => {
      const headers = makeHeaders({
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'myapp.up.railway.app',
      });
      expect(getPublicUrl(headers, '/api/test')).toBe('https://myapp.up.railway.app/api/test');
    });

    it('uses defaults when no proxy headers', () => {
      const headers = makeHeaders({ 'host': 'localhost:3000' });
      expect(getPublicUrl(headers)).toBe('http://localhost:3000/');
    });
  });

  describe('buildCorsHeaders', () => {
    it('returns empty headers when no origin', () => {
      setEnv({ RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app' });
      const config = detectRailwayConfig();
      const headers = buildCorsHeaders(config, null);
      expect(Object.keys(headers)).toHaveLength(0);
    });

    it('allows matching origin', () => {
      setEnv({ RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app' });
      const config = detectRailwayConfig();
      const headers = buildCorsHeaders(config, 'https://myapp.up.railway.app');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://myapp.up.railway.app');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('allows localhost origin', () => {
      setEnv({});
      const config = detectRailwayConfig();
      const headers = buildCorsHeaders(config, 'http://localhost:3000');
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });

    it('rejects unknown origins', () => {
      setEnv({});
      const config = detectRailwayConfig();
      const headers = buildCorsHeaders(config, 'https://evil.com');
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('buildCookieOptions', () => {
    it('builds local cookie options', () => {
      setEnv({});
      const config = detectRailwayConfig();
      const options = buildCookieOptions(config);
      expect(options).toContain('SameSite=Lax');
      expect(options).toContain('HttpOnly');
      expect(options).toContain('Path=/');
      expect(options).not.toContain('Secure');
    });

    it('builds Railway cookie options with Secure', () => {
      setEnv({ RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app' });
      const config = detectRailwayConfig();
      const options = buildCookieOptions(config);
      expect(options).toContain('Secure');
      expect(options).toContain('SameSite=None');
      expect(options).toContain('HttpOnly');
    });
  });

  describe('applyRailwayHeaders', () => {
    it('adds HSTS and powered-by headers when behind Railway proxy', () => {
      setEnv({ RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app' });
      const config = detectRailwayConfig();
      const requestHeaders = makeHeaders({ origin: 'https://myapp.up.railway.app' });
      const headers = applyRailwayHeaders(config, requestHeaders);

      expect(headers['X-Powered-By']).toBe('ClaudeOS');
      expect(headers['Strict-Transport-Security']).toContain('max-age=');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://myapp.up.railway.app');
    });

    it('does not add HSTS in local mode', () => {
      setEnv({});
      const config = detectRailwayConfig();
      const requestHeaders = makeHeaders();
      const headers = applyRailwayHeaders(config, requestHeaders);

      expect(headers['Strict-Transport-Security']).toBeUndefined();
      expect(headers['X-Powered-By']).toBeUndefined();
    });
  });
});
