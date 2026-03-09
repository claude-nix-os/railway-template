import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRailwayEnvironment,
  getDeploymentStatus,
  getDashboardUrl,
  getRailwayEnvVars,
  handleStatus,
  handleInfo,
  handleLogs,
  handleRailwayRoute,
} from '../../src/api/railway/handler';

// Store original env
const originalEnv = { ...process.env };

function setRailwayEnv(overrides: Record<string, string> = {}) {
  // Clear all RAILWAY_ vars first
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('RAILWAY_')) {
      delete process.env[key];
    }
  }
  // Set new values
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
}

describe('Railway API Handler', () => {
  beforeEach(() => {
    // Reset env between tests
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('RAILWAY_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('RAILWAY_')) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      if (key.startsWith('RAILWAY_')) {
        process.env[key] = value;
      }
    }
  });

  describe('getRailwayEnvironment', () => {
    it('returns isRailway: false when no RAILWAY_ vars are set', () => {
      const env = getRailwayEnvironment();
      expect(env.isRailway).toBe(false);
      expect(env.projectId).toBeNull();
      expect(env.serviceId).toBeNull();
    });

    it('returns isRailway: true when RAILWAY_PROJECT_ID is set', () => {
      setRailwayEnv({ RAILWAY_PROJECT_ID: 'proj-123' });
      const env = getRailwayEnvironment();
      expect(env.isRailway).toBe(true);
      expect(env.projectId).toBe('proj-123');
    });

    it('returns isRailway: true when RAILWAY_ENVIRONMENT is set', () => {
      setRailwayEnv({ RAILWAY_ENVIRONMENT: 'production' });
      const env = getRailwayEnvironment();
      expect(env.isRailway).toBe(true);
      expect(env.environmentName).toBe('production');
    });

    it('returns all Railway env vars when fully configured', () => {
      setRailwayEnv({
        RAILWAY_PROJECT_ID: 'proj-123',
        RAILWAY_SERVICE_ID: 'svc-456',
        RAILWAY_ENVIRONMENT_ID: 'env-789',
        RAILWAY_ENVIRONMENT: 'production',
        RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app',
        RAILWAY_DEPLOYMENT_ID: 'dep-abc',
        RAILWAY_STATIC_URL: 'https://static.railway.app',
        RAILWAY_REGION: 'us-west1',
      });
      const env = getRailwayEnvironment();
      expect(env).toEqual({
        isRailway: true,
        projectId: 'proj-123',
        serviceId: 'svc-456',
        environmentId: 'env-789',
        environmentName: 'production',
        publicDomain: 'myapp.up.railway.app',
        deploymentId: 'dep-abc',
        staticUrl: 'https://static.railway.app',
        region: 'us-west1',
      });
    });
  });

  describe('getDeploymentStatus', () => {
    it('returns unknown when not on Railway', () => {
      const env = getRailwayEnvironment();
      expect(getDeploymentStatus(env)).toBe('unknown');
    });

    it('returns healthy when deploymentId and publicDomain are set', () => {
      setRailwayEnv({
        RAILWAY_PROJECT_ID: 'proj-123',
        RAILWAY_DEPLOYMENT_ID: 'dep-abc',
        RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app',
      });
      const env = getRailwayEnvironment();
      expect(getDeploymentStatus(env)).toBe('healthy');
    });

    it('returns deploying when only deploymentId is set', () => {
      setRailwayEnv({
        RAILWAY_PROJECT_ID: 'proj-123',
        RAILWAY_DEPLOYMENT_ID: 'dep-abc',
      });
      const env = getRailwayEnvironment();
      expect(getDeploymentStatus(env)).toBe('deploying');
    });

    it('returns unknown when on Railway but no deployment info', () => {
      setRailwayEnv({ RAILWAY_PROJECT_ID: 'proj-123' });
      const env = getRailwayEnvironment();
      expect(getDeploymentStatus(env)).toBe('unknown');
    });
  });

  describe('getDashboardUrl', () => {
    it('returns null when no project ID', () => {
      const env = getRailwayEnvironment();
      expect(getDashboardUrl(env)).toBeNull();
    });

    it('returns project URL when only project ID is set', () => {
      setRailwayEnv({ RAILWAY_PROJECT_ID: 'proj-123' });
      const env = getRailwayEnvironment();
      expect(getDashboardUrl(env)).toBe('https://railway.com/project/proj-123');
    });

    it('returns service URL when both project and service IDs are set', () => {
      setRailwayEnv({
        RAILWAY_PROJECT_ID: 'proj-123',
        RAILWAY_SERVICE_ID: 'svc-456',
      });
      const env = getRailwayEnvironment();
      expect(getDashboardUrl(env)).toBe('https://railway.com/project/proj-123/service/svc-456');
    });
  });

  describe('getRailwayEnvVars', () => {
    it('returns empty array when no RAILWAY_ vars are set', () => {
      const vars = getRailwayEnvVars();
      expect(vars).toEqual([]);
    });

    it('returns RAILWAY_ env vars sorted alphabetically', () => {
      setRailwayEnv({
        RAILWAY_ENVIRONMENT: 'production',
        RAILWAY_PROJECT_ID: 'proj-123',
      });
      const vars = getRailwayEnvVars();
      expect(vars.length).toBe(2);
      expect(vars[0].key).toBe('RAILWAY_ENVIRONMENT');
      expect(vars[1].key).toBe('RAILWAY_PROJECT_ID');
    });

    it('masks sensitive values', () => {
      setRailwayEnv({
        RAILWAY_TOKEN: 'super-secret-token-value',
        RAILWAY_ENVIRONMENT: 'production',
      });
      const vars = getRailwayEnvVars();
      const tokenVar = vars.find(v => v.key === 'RAILWAY_TOKEN');
      const envVar = vars.find(v => v.key === 'RAILWAY_ENVIRONMENT');

      expect(tokenVar).toBeDefined();
      expect(tokenVar!.masked).toBe(true);
      expect(tokenVar!.value).not.toBe('super-secret-token-value');
      expect(tokenVar!.value).toMatch(/\*+alue$/);

      expect(envVar).toBeDefined();
      expect(envVar!.masked).toBe(false);
      expect(envVar!.value).toBe('production');
    });
  });

  describe('handleStatus', () => {
    it('returns status for non-Railway environment', () => {
      const result = handleStatus();
      expect(result).toEqual({
        isRailway: false,
        status: 'unknown',
      });
    });

    it('returns healthy status for fully configured Railway', () => {
      setRailwayEnv({
        RAILWAY_PROJECT_ID: 'proj-123',
        RAILWAY_DEPLOYMENT_ID: 'dep-abc',
        RAILWAY_PUBLIC_DOMAIN: 'myapp.up.railway.app',
      });
      const result = handleStatus();
      expect(result).toEqual({
        isRailway: true,
        status: 'healthy',
      });
    });
  });

  describe('handleInfo', () => {
    it('returns full info for configured Railway environment', () => {
      setRailwayEnv({
        RAILWAY_PROJECT_ID: 'proj-123',
        RAILWAY_SERVICE_ID: 'svc-456',
        RAILWAY_ENVIRONMENT: 'production',
      });
      const result = handleInfo();
      expect(result.environment.isRailway).toBe(true);
      expect(result.environment.projectId).toBe('proj-123');
      expect(result.dashboardUrl).toBe('https://railway.com/project/proj-123/service/svc-456');
      expect(Array.isArray(result.envVars)).toBe(true);
    });
  });

  describe('handleLogs', () => {
    it('throws when RAILWAY_TOKEN is not set', async () => {
      const params = new URLSearchParams();
      await expect(handleLogs(params)).rejects.toThrow('RAILWAY_TOKEN environment variable is required');
    });

    it('throws when no deployment ID is available', async () => {
      process.env.RAILWAY_TOKEN = 'test-token';
      const params = new URLSearchParams();
      await expect(handleLogs(params)).rejects.toThrow('No deployment ID available');
      delete process.env.RAILWAY_TOKEN;
    });
  });

  describe('handleRailwayRoute', () => {
    it('returns 405 for non-GET methods', async () => {
      const request = new Request('http://localhost/api/railway/status', { method: 'POST' });
      const response = await handleRailwayRoute(request, 'status');
      expect(response.status).toBe(405);
      const body = await response.json();
      expect(body.error).toBe('Method not allowed');
    });

    it('handles /status endpoint', async () => {
      const request = new Request('http://localhost/api/railway/status');
      const response = await handleRailwayRoute(request, 'status');
      expect(response.status).toBe(200);
      const body = await response.json() as { isRailway: boolean; status: string };
      expect(body).toHaveProperty('isRailway');
      expect(body).toHaveProperty('status');
    });

    it('handles /info endpoint', async () => {
      setRailwayEnv({ RAILWAY_PROJECT_ID: 'proj-123' });
      const request = new Request('http://localhost/api/railway/info');
      const response = await handleRailwayRoute(request, 'info');
      expect(response.status).toBe(200);
      const body = await response.json() as { environment: { projectId: string } };
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('envVars');
      expect(body).toHaveProperty('dashboardUrl');
    });

    it('returns 404 for unknown endpoints', async () => {
      const request = new Request('http://localhost/api/railway/unknown');
      const response = await handleRailwayRoute(request, 'unknown');
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('Unknown endpoint');
    });

    it('returns 403 when RAILWAY_TOKEN is missing for logs', async () => {
      const request = new Request('http://localhost/api/railway/logs');
      const response = await handleRailwayRoute(request, 'logs');
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('RAILWAY_TOKEN');
    });
  });
});
