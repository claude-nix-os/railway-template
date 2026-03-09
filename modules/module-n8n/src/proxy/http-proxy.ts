import { IncomingMessage, ServerResponse, request as httpRequest } from 'http';
import type { ProxyResponseMeta } from '../types';

const N8N_HOST = '127.0.0.1';
const N8N_PORT = 5678;
const N8N_PREFIX = '/n8n';

/**
 * Root-level asset prefixes that n8n's Vite-compiled JS loads via dynamic imports.
 * These must be proxied without any prefix stripping since n8n expects them at root.
 */
const ROOT_ASSET_PREFIXES = [
  '/assets/',
  '/static/',
  '/rest/',
  '/types/',
  '/icons/',
  '/schemas/',
];

/**
 * Check if a request URL matches one of n8n's root-level asset paths.
 */
export function isRootAssetPath(url: string): boolean {
  return ROOT_ASSET_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Handle the special `/n8n/static/base-path.js` request that tells n8n's
 * frontend what base path to use for routing and asset loading.
 */
export function handleBasePathJs(_req: IncomingMessage, res: ServerResponse): void {
  const body = 'window.BASE_PATH = "/n8n/";';
  res.writeHead(200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Content-Length': Buffer.byteLength(body).toString(),
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

/**
 * Rewrite HTML content to inject `/n8n/` prefix into absolute paths
 * so that n8n's frontend assets load correctly when served under /n8n/.
 */
export function rewriteHtml(html: string): string {
  let rewritten = html;

  // Rewrite href="/..." and src="/..." attributes (but not href="/n8n/..." etc.)
  rewritten = rewritten.replace(
    /((?:href|src|action)\s*=\s*["'])\/((?!n8n\/|\/)[^"']*)/gi,
    '$1/n8n/$2',
  );

  // Rewrite url(/...) in inline styles
  rewritten = rewritten.replace(
    /(url\(\s*["']?)\/((?!n8n\/)[^"')]*)/gi,
    '$1/n8n/$2',
  );

  // Rewrite fetch("/rest/...") and similar JS patterns
  rewritten = rewritten.replace(
    /(["'])\/(rest\/[^"']*)/g,
    '$1/n8n/$2',
  );

  return rewritten;
}

/**
 * Build the set of forwarded headers, removing hop-by-hop headers
 * and requesting uncompressed responses so we can rewrite HTML.
 */
export function buildUpstreamHeaders(
  req: IncomingMessage,
  stripPrefix: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const skipHeaders = new Set([
    'host',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'proxy-authorization',
    'proxy-authenticate',
  ]);

  for (const [key, value] of Object.entries(req.headers)) {
    if (skipHeaders.has(key.toLowerCase())) continue;
    if (value === undefined) continue;
    headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  // Request identity encoding so we get raw text for HTML rewriting
  if (stripPrefix) {
    headers['accept-encoding'] = 'identity';
  }

  headers['host'] = `${N8N_HOST}:${N8N_PORT}`;
  return headers;
}

/**
 * Strip security headers that prevent iframe embedding of n8n.
 */
export function stripSecurityHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const removeHeaders = new Set([
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'content-encoding',
    'transfer-encoding',
  ]);

  for (const [key, value] of Object.entries(headers)) {
    if (!removeHeaders.has(key.toLowerCase())) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Rewrite Location header values on redirects to include the /n8n/ prefix.
 */
export function rewriteLocationHeader(location: string): string {
  // If it's a relative path starting with / but not /n8n/, add the prefix
  if (location.startsWith('/') && !location.startsWith('/n8n/')) {
    return `/n8n${location}`;
  }
  return location;
}

/**
 * Determine the upstream path for n8n based on the incoming request URL.
 * Strips the /n8n prefix for proxied requests.
 */
export function resolveUpstreamPath(reqUrl: string): string {
  if (reqUrl.startsWith(N8N_PREFIX)) {
    const stripped = reqUrl.slice(N8N_PREFIX.length);
    return stripped || '/';
  }
  // Root-level asset paths are forwarded as-is
  return reqUrl;
}

/**
 * Proxy an HTTP request to the n8n upstream server.
 */
export function proxyHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const reqUrl = req.url || '/';

  // Special case: base-path.js override
  if (reqUrl === '/n8n/static/base-path.js') {
    handleBasePathJs(req, res);
    return;
  }

  const isN8nPrefixed = reqUrl.startsWith(N8N_PREFIX);
  const upstreamPath = resolveUpstreamPath(reqUrl);
  const headers = buildUpstreamHeaders(req, isN8nPrefixed);

  const proxyReq = httpRequest(
    {
      hostname: N8N_HOST,
      port: N8N_PORT,
      path: upstreamPath,
      method: req.method || 'GET',
      headers,
    },
    (proxyRes) => {
      handleProxyResponse(proxyRes, res, isN8nPrefixed);
    },
  );

  proxyReq.on('error', (err) => {
    console.error('[n8n-proxy] Upstream connection error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'n8n service unavailable' }));
    }
  });

  // Pipe the request body to the upstream
  req.pipe(proxyReq, { end: true });
}

/**
 * Handle the response from the n8n upstream and send it back to the client,
 * performing HTML rewriting and header manipulation as needed.
 */
function handleProxyResponse(
  proxyRes: IncomingMessage,
  clientRes: ServerResponse,
  isN8nPrefixed: boolean,
): void {
  const statusCode = proxyRes.statusCode || 502;
  const rawHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(proxyRes.headers)) {
    if (value === undefined) continue;
    rawHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  const responseHeaders = stripSecurityHeaders(rawHeaders);

  // Rewrite Location headers on redirects
  if (responseHeaders['location'] && statusCode >= 300 && statusCode < 400) {
    responseHeaders['location'] = rewriteLocationHeader(responseHeaders['location']);
  }

  const contentType = responseHeaders['content-type'] || '';
  const isHtml = contentType.includes('text/html');

  if (isHtml && isN8nPrefixed) {
    // Buffer the entire response to rewrite HTML
    const chunks: Buffer[] = [];
    proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');
      const rewritten = rewriteHtml(body);
      const rewrittenBuf = Buffer.from(rewritten, 'utf-8');

      responseHeaders['content-length'] = rewrittenBuf.length.toString();
      delete responseHeaders['content-encoding'];

      clientRes.writeHead(statusCode, responseHeaders);
      clientRes.end(rewrittenBuf);
    });
  } else {
    // Stream non-HTML responses directly
    clientRes.writeHead(statusCode, responseHeaders);
    proxyRes.pipe(clientRes, { end: true });
  }
}

/**
 * Middleware-style handler that checks if a request should be proxied to n8n
 * and handles it if so. Returns true if the request was handled.
 */
export function handleN8nProxy(req: IncomingMessage, res: ServerResponse): boolean {
  const url = req.url || '';

  // Handle /n8n/* prefixed paths
  if (url.startsWith(N8N_PREFIX)) {
    proxyHttpRequest(req, res);
    return true;
  }

  // Handle root-level asset paths that n8n needs
  if (isRootAssetPath(url)) {
    proxyHttpRequest(req, res);
    return true;
  }

  return false;
}

export { N8N_HOST, N8N_PORT, N8N_PREFIX };
