import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { request as httpRequest } from 'http';
import { N8N_HOST, N8N_PORT } from './http-proxy';

/**
 * Proxy WebSocket upgrade requests to n8n's WebSocket endpoint.
 *
 * n8n uses WebSockets for real-time push updates (workflow executions,
 * status changes, etc.). This handler intercepts HTTP upgrade requests
 * targeting the /n8n path and forwards them to n8n's internal WS server.
 */
export function handleN8nWebSocketUpgrade(
  req: IncomingMessage,
  clientSocket: Socket,
  head: Buffer,
): boolean {
  const url = req.url || '';

  // Only handle WebSocket upgrades for /n8n paths
  if (!url.startsWith('/n8n')) {
    return false;
  }

  // Strip the /n8n prefix for upstream
  const upstreamPath = url.slice(4) || '/';

  // Build forwarded headers, preserving WebSocket-specific ones
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (key.toLowerCase() === 'host') {
      headers[key] = `${N8N_HOST}:${N8N_PORT}`;
      continue;
    }
    headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  const proxyReq = httpRequest({
    hostname: N8N_HOST,
    port: N8N_PORT,
    path: upstreamPath,
    method: 'GET',
    headers,
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    // Send the 101 Switching Protocols response to the client
    const responseHeaders = buildUpgradeResponse(proxyRes);
    clientSocket.write(responseHeaders);

    // Forward any buffered data
    if (proxyHead && proxyHead.length > 0) {
      clientSocket.write(proxyHead);
    }
    if (head && head.length > 0) {
      proxySocket.write(head);
    }

    // Bi-directional pipe
    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);

    // Clean up on close
    proxySocket.on('error', (err) => {
      console.error('[n8n-ws] Upstream socket error:', err.message);
      clientSocket.destroy();
    });

    clientSocket.on('error', (err) => {
      console.error('[n8n-ws] Client socket error:', err.message);
      proxySocket.destroy();
    });

    proxySocket.on('close', () => {
      clientSocket.destroy();
    });

    clientSocket.on('close', () => {
      proxySocket.destroy();
    });
  });

  proxyReq.on('error', (err) => {
    console.error('[n8n-ws] Proxy connection error:', err.message);
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.destroy();
  });

  // Handle case where upstream doesn't upgrade (responds with normal HTTP)
  proxyReq.on('response', (res) => {
    const statusCode = res.statusCode || 502;
    console.warn(`[n8n-ws] Upstream did not upgrade, status: ${statusCode}`);

    // Drain the response
    res.resume();

    clientSocket.write(`HTTP/1.1 ${statusCode} ${res.statusMessage || 'Error'}\r\n\r\n`);
    clientSocket.destroy();
  });

  proxyReq.end();

  return true;
}

/**
 * Build the HTTP 101 Switching Protocols response string from the upstream
 * proxy response, forwarding all relevant headers.
 */
function buildUpgradeResponse(proxyRes: IncomingMessage): string {
  let response = `HTTP/1.1 101 Switching Protocols\r\n`;

  for (const [key, value] of Object.entries(proxyRes.headers)) {
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      response += `${key}: ${v}\r\n`;
    }
  }

  response += '\r\n';
  return response;
}
