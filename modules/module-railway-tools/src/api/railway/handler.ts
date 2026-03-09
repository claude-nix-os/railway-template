import type {
  RailwayEnvironment,
  RailwayStatusResponse,
  RailwayInfoResponse,
  RailwayLogsResponse,
  RailwayEnvVar,
  RailwayDeploymentStatus,
  RailwayLogEntry,
} from '../../types';

/** Sensitive env var prefixes/names that should be masked */
const SENSITIVE_PATTERNS = [
  'TOKEN', 'SECRET', 'PASSWORD', 'KEY', 'PRIVATE',
  'CREDENTIAL', 'AUTH', 'API_KEY', 'ACCESS_KEY',
];

/** Check if an env var key looks sensitive */
function isSensitive(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_PATTERNS.some(pattern => upper.includes(pattern));
}

/** Mask a value, showing only the last 4 chars */
function maskValue(value: string): string {
  if (value.length <= 4) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

/** Extract Railway environment info from process.env */
export function getRailwayEnvironment(): RailwayEnvironment {
  const env = process.env;
  const isRailway = !!(env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID || env.RAILWAY_ENVIRONMENT);

  return {
    isRailway,
    projectId: env.RAILWAY_PROJECT_ID ?? null,
    serviceId: env.RAILWAY_SERVICE_ID ?? null,
    environmentId: env.RAILWAY_ENVIRONMENT_ID ?? null,
    environmentName: env.RAILWAY_ENVIRONMENT ?? null,
    publicDomain: env.RAILWAY_PUBLIC_DOMAIN ?? null,
    deploymentId: env.RAILWAY_DEPLOYMENT_ID ?? null,
    staticUrl: env.RAILWAY_STATIC_URL ?? null,
    region: env.RAILWAY_REGION ?? null,
  };
}

/** Determine deployment status based on available info */
export function getDeploymentStatus(railwayEnv: RailwayEnvironment): RailwayDeploymentStatus {
  if (!railwayEnv.isRailway) return 'unknown';
  if (railwayEnv.deploymentId && railwayEnv.publicDomain) return 'healthy';
  if (railwayEnv.deploymentId) return 'deploying';
  return 'unknown';
}

/** Construct Railway dashboard URL */
export function getDashboardUrl(railwayEnv: RailwayEnvironment): string | null {
  if (!railwayEnv.projectId) return null;
  let url = `https://railway.com/project/${railwayEnv.projectId}`;
  if (railwayEnv.serviceId) {
    url += `/service/${railwayEnv.serviceId}`;
  }
  return url;
}

/** Collect RAILWAY_* env vars with masking */
export function getRailwayEnvVars(): RailwayEnvVar[] {
  const vars: RailwayEnvVar[] = [];
  const env = process.env;

  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('RAILWAY_') && value !== undefined) {
      const sensitive = isSensitive(key);
      vars.push({
        key,
        value: sensitive ? maskValue(value) : value,
        masked: sensitive,
      });
    }
  }

  return vars.sort((a, b) => a.key.localeCompare(b.key));
}

/** Parse Railway API log response into structured entries */
function parseLogEntries(rawLogs: Array<{ timestamp?: string; message?: string; severity?: string }>): RailwayLogEntry[] {
  return rawLogs.map(entry => ({
    timestamp: entry.timestamp ?? new Date().toISOString(),
    message: entry.message ?? '',
    severity: (['info', 'warn', 'error', 'debug'].includes(entry.severity ?? '')
      ? entry.severity as RailwayLogEntry['severity']
      : 'info'),
  }));
}

/** Fetch deployment logs from Railway API */
async function fetchRailwayLogs(
  token: string,
  deploymentId: string,
  limit: number = 100,
): Promise<{ logs: RailwayLogEntry[]; hasMore: boolean }> {
  const query = `
    query DeploymentLogs($deploymentId: String!, $limit: Int) {
      deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
        timestamp
        message
        severity
      }
    }
  `;

  const response = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { deploymentId, limit },
    }),
  });

  if (!response.ok) {
    throw new Error(`Railway API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as {
    data?: { deploymentLogs?: Array<{ timestamp?: string; message?: string; severity?: string }> };
    errors?: Array<{ message: string }>;
  };

  if (data.errors?.length) {
    throw new Error(`Railway API error: ${data.errors[0].message}`);
  }

  const rawLogs = data.data?.deploymentLogs ?? [];
  return {
    logs: parseLogEntries(rawLogs),
    hasMore: rawLogs.length >= limit,
  };
}

/** Handle GET /api/railway/status */
export function handleStatus(): RailwayStatusResponse {
  const railwayEnv = getRailwayEnvironment();
  return {
    isRailway: railwayEnv.isRailway,
    status: getDeploymentStatus(railwayEnv),
  };
}

/** Handle GET /api/railway/info */
export function handleInfo(): RailwayInfoResponse {
  const railwayEnv = getRailwayEnvironment();
  return {
    environment: railwayEnv,
    envVars: getRailwayEnvVars(),
    dashboardUrl: getDashboardUrl(railwayEnv),
  };
}

/** Handle GET /api/railway/logs */
export async function handleLogs(searchParams: URLSearchParams): Promise<RailwayLogsResponse> {
  const token = process.env.RAILWAY_TOKEN;
  if (!token) {
    throw new Error('RAILWAY_TOKEN environment variable is required for log access');
  }

  const railwayEnv = getRailwayEnvironment();
  const deploymentId = searchParams.get('deploymentId') ?? railwayEnv.deploymentId;

  if (!deploymentId) {
    throw new Error('No deployment ID available. Provide ?deploymentId= or ensure RAILWAY_DEPLOYMENT_ID is set');
  }

  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10) || 100),
    500,
  );

  return fetchRailwayLogs(token, deploymentId, limit);
}

/** Main route handler for /api/railway/* */
export async function handleRailwayRoute(
  request: Request,
  subpath: string,
): Promise<Response> {
  try {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);

    switch (subpath) {
      case 'status': {
        const result = handleStatus();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'info': {
        const result = handleInfo();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'logs': {
        const result = await handleLogs(url.searchParams);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown endpoint: ${subpath}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('required') ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
