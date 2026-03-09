import type { SidecarConfig } from '../types';

/**
 * Detect and build the sidecar configuration from Railway environment variables.
 * This is called once at startup and cached.
 */
export function detectRailwayConfig(): SidecarConfig {
  const env = process.env;
  const publicDomain = env.RAILWAY_PUBLIC_DOMAIN ?? null;
  const port = parseInt(env.PORT ?? '3000', 10);
  const environment = env.RAILWAY_ENVIRONMENT ?? 'development';
  const isRailway = !!(publicDomain || env.RAILWAY_ENVIRONMENT || env.RAILWAY_SERVICE_ID);

  // Railway terminates SSL at their edge proxy
  const sslTerminated = isRailway;
  const behindProxy = isRailway;

  // Build public URL
  const publicUrl = publicDomain ? `https://${publicDomain}` : null;

  // CORS: allow the Railway domain and localhost for development
  const corsOrigins: string[] = ['http://localhost:3000', 'http://localhost:3001'];
  if (publicUrl) {
    corsOrigins.push(publicUrl);
  }

  // Cookie settings: secure on Railway (SSL terminated), SameSite lax for cross-domain
  const cookieSecure = sslTerminated;
  const cookieSameSite: SidecarConfig['cookieSameSite'] = isRailway ? 'none' : 'lax';

  return {
    publicUrl,
    publicDomain,
    port,
    environment,
    sslTerminated,
    behindProxy,
    corsOrigins,
    cookieSecure,
    cookieSameSite,
    serviceId: env.RAILWAY_SERVICE_ID ?? null,
    environmentId: env.RAILWAY_ENVIRONMENT_ID ?? null,
  };
}

/**
 * Extract the real client IP from proxy headers.
 * Railway sets x-forwarded-for when proxying requests.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  return headers.get('x-real-ip') ?? '127.0.0.1';
}

/**
 * Determine the actual protocol (http/https) from proxy headers.
 * Railway terminates SSL, so the app sees HTTP but the client uses HTTPS.
 */
export function getProtocol(headers: Headers): 'http' | 'https' {
  const proto = headers.get('x-forwarded-proto');
  if (proto === 'https') return 'https';
  if (proto === 'http') return 'http';
  return 'http';
}

/**
 * Get the actual host from proxy headers.
 * Railway may set x-forwarded-host to the public domain.
 */
export function getHost(headers: Headers, fallback: string = 'localhost'): string {
  return headers.get('x-forwarded-host') ?? headers.get('host') ?? fallback;
}

/**
 * Build the full public URL from the request headers.
 * This reconstructs the URL as the client sees it (with HTTPS from Railway).
 */
export function getPublicUrl(headers: Headers, path: string = '/'): string {
  const protocol = getProtocol(headers);
  const host = getHost(headers);
  return `${protocol}://${host}${path}`;
}

/**
 * Build CORS headers for the response based on the sidecar config.
 */
export function buildCorsHeaders(config: SidecarConfig, requestOrigin: string | null): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!requestOrigin) {
    return headers;
  }

  // Check if the origin is allowed
  const isAllowed = config.corsOrigins.some(allowed => {
    if (allowed === requestOrigin) return true;
    // Allow subdomains of the Railway domain
    if (config.publicDomain && requestOrigin.endsWith(config.publicDomain)) return true;
    return false;
  });

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

/**
 * Build cookie options string for Set-Cookie headers.
 */
export function buildCookieOptions(config: SidecarConfig): string {
  const parts: string[] = [];
  if (config.cookieSecure) parts.push('Secure');
  parts.push(`SameSite=${config.cookieSameSite.charAt(0).toUpperCase() + config.cookieSameSite.slice(1)}`);
  parts.push('HttpOnly');
  parts.push('Path=/');
  return parts.join('; ');
}

/**
 * Apply Railway proxy headers middleware to a request.
 * Returns headers to add to the response.
 */
export function applyRailwayHeaders(
  config: SidecarConfig,
  requestHeaders: Headers,
): Record<string, string> {
  const responseHeaders: Record<string, string> = {};

  if (config.behindProxy) {
    // Trust proxy headers
    responseHeaders['X-Powered-By'] = 'ClaudeOS';

    // If behind Railway proxy, set HSTS since SSL is terminated there
    if (config.sslTerminated) {
      responseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }
  }

  // Apply CORS
  const origin = requestHeaders.get('origin');
  const corsHeaders = buildCorsHeaders(config, origin);
  Object.assign(responseHeaders, corsHeaders);

  return responseHeaders;
}
