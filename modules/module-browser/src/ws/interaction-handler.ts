import type { WsInteractionMessage } from '../types';

/**
 * WebSocket handler for browser:interaction messages
 *
 * This handler broadcasts real-time interaction events (clicks, typing, navigation)
 * to connected clients for live collaboration and monitoring.
 */
export async function handleInteraction(
  message: WsInteractionMessage,
  ws: WebSocket,
  broadcast: (message: unknown) => void
): Promise<void> {
  console.log('[WS:interaction]', {
    sessionId: message.sessionId,
    action: message.action,
    timestamp: message.timestamp,
  });

  // Broadcast interaction event to all connected clients
  broadcast(message);
}
