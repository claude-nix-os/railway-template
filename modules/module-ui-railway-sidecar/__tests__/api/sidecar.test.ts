import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  handleHealth,
  handleConfig,
  handleSidecarRoute,
  handleRootHealthCheck,
  resetConfigCache,
} from '../../src/api/sidecar/handler';

function setEnv(overrides: Record<string, string> = {}) {
  for (const key of ['RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_ENVIRONMENT', 'RAILWAY_SERVICE_ID', 'RAILWAY_ENVIRONMENT_ID', 'PORT']) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
}

describe('Sidecar API Handler', () => {
  beforeEach(() => {
    resetConfigCache();
  });

  afterEach(() => {
    for (const key of ['RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_ENVIRONMENT', 'RAILWAY_SERVICE_ID', 'RAILWAY_ENVIRONMENT_ID', 'PORT']) {
      delete process.env[key];
    }
    resetConfigCache();
  });

  describe('handleHealth', () => {
    it('returns ok status with timestamp and uptime', () => {
      const result = handleHealth();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBe('1.0.0');
    });

    it('returns environment from Railway env var', () => {
      setEnv({ RAILWAY_ENVIRONMENT: 'production' });
      const result = handleHealth();
      expect(result.environment).toBe('production');
    });

    it('defaults to development when no Railway env', () => {
      setEnv({});
      const result = handleHealth();
      expect(result.environment).toBe('development');
    });
  });

  describe('handleConfig', () => {
    it('returns config with railwayDetected false in local mode', () => {
      setEnv({});
      const result = handleConfig();
      expect(result.railwayDetected).toBe(false);
      expect(result.config.publicUrl).toBeNull();
      expect(result.config.sslTerminated).toBe(false);
    });

    it('returns config with railwayDetected true on Railway', () => {
      setEnv({
        RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app',
        RAILWAY_ENVIRONMENT: 'production',
        PORT: '8080',
      });
      const result = handleConfig();
      expect(result.railwayDetected).toBe(true);
      expect(result.config.publicUrl).toBe('https://myapp.up.railway.app');
      expect(result.config.publicDomain).toBe('myapp.up.railway.app');
      expect(result.config.port).toBe(8080);
      expect(result.config.environment).toBe('production');
      expect(result.config.sslTerminated).toBe(true);
      expect(result.config.behindProxy).toBe(true);
    });
  });

  describe('handleSidecarRoute', () => {
    it('handles CORS preflight OPTIONS request', async () => {
      const request = new Request('http://localhost/api/sidecar/health', {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' },
      });
      const response = await handleSidecarRoute(request, 'health');
      expect(response.status).toBe(204);
    });

    it('returns 405 for non-GET methods', async () => {
      const request = new Request('http://localhost/api/sidecar/health', { method: 'POST' });
      const response = await handleSidecarRoute(request, 'health');
      expect(response.status).toBe(405);
      const body = await response.json();
      expect(body.error).toBe('Method not allowed');
    });

    it('handles /health endpoint', async () => {
      const request = new Request('http://localhost/api/sidecar/health');
      const response = await handleSidecarRoute(request, 'health');
      expect(response.status).toBe(200);
      const body = await response.json() as { status: string; timestamp: string; uptime: number };
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
    });

    it('handles /config endpoint', async () => {
      setEnv({ RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app' });
      const request = new Request('http://localhost/api/sidecar/config');
      const response = await handleSidecarRoute(request, 'config');
      expect(response.status).toBe(200);
      const body = await response.json() as { config: { publicDomain: string }; railwayDetected: boolean };
      expect(body.railwayDetected).toBe(true);
      expect(body.config.publicDomain).toBe('myapp.up.railway.app');
    });

    it('returns 404 for unknown endpoints', async () => {
      const request = new Request('http://localhost/api/sidecar/unknown');
      const response = await handleSidecarRoute(request, 'unknown');
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('Unknown endpoint');
    });

    it('includes CORS headers from Railway proxy', async () => {
      setEnv({ RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app' });
      const request = new Request('http://localhost/api/sidecar/health', {
        headers: { origin: 'https://myapp.up.railway.app' },
      });
      const response = await handleSidecarRoute(request, 'health');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://myapp.up.railway.app');
      expect(response.headers.get('X-Powered-By')).toBe('ClaudeOS');
    });
  });

  describe('handleRootHealthCheck', () => {
    it('returns 200 with ok status', () => {
      const response = handleRootHealthCheck();
      expect(response.status).toBe(200);
    });

    it('returns JSON content type', async () => {
      const response = handleRootHealthCheck();
      expect(response.headers.get('Content-Type')).toBe('application/json');
      const body = await response.json();
      expect(body).toEqual({ status: 'ok' });
    });
  });
});
