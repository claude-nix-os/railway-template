import type { HealthCheckResponse, SidecarConfigResponse, SidecarConfig } from '../../types';
import { detectRailwayConfig, applyRailwayHeaders } from '../../middleware/railway-headers';

/** Module start time for uptime calculation */
const startTime = Date.now();

/** Cached sidecar configuration */
let cachedConfig: SidecarConfig | null = null;

/** Get or create the sidecar config (cached after first call) */
export function getSidecarConfig(): SidecarConfig {
  if (!cachedConfig) {
    cachedConfig = detectRailwayConfig();
  }
  return cachedConfig;
}

/** Reset cached config (useful for testing) */
export function resetConfigCache(): void {
  cachedConfig = null;
}

/** Handle GET /api/sidecar/health */
export function handleHealth(): HealthCheckResponse {
  const config = getSidecarConfig();
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    environment: config.environment,
    version: '1.0.0',
  };
}

/** Handle GET /api/sidecar/config */
export function handleConfig(): SidecarConfigResponse {
  const config = getSidecarConfig();
  const railwayDetected = !!(config.publicDomain || config.serviceId);

  return {
    config,
    railwayDetected,
  };
}

/** Main route handler for /api/sidecar/* */
export async function handleSidecarRoute(
  request: Request,
  subpath: string,
): Promise<Response> {
  const config = getSidecarConfig();
  const proxyHeaders = applyRailwayHeaders(config, request.headers);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...proxyHeaders,
        'Content-Length': '0',
      },
    });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...proxyHeaders },
    });
  }

  try {
    switch (subpath) {
      case 'health': {
        const result = handleHealth();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...proxyHeaders },
        });
      }

      case 'config': {
        const result = handleConfig();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...proxyHeaders },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown endpoint: ${subpath}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...proxyHeaders },
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...proxyHeaders },
    });
  }
}

/**
 * Root health check handler for Railway.
 * Railway expects a 200 at `/` for health checks.
 */
export function handleRootHealthCheck(): Response {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
