import type { WsScreenshotMessage } from '../types';

/**
 * WebSocket handler for browser:screenshot messages
 *
 * This handler broadcasts screenshot updates to connected clients.
 * When a screenshot is captured (either manually or via interval),
 * this message is sent to notify clients.
 */
export async function handleScreenshot(
  message: WsScreenshotMessage,
  ws: WebSocket,
  broadcast: (message: unknown) => void
): Promise<void> {
  console.log('[WS:screenshot]', {
    sessionId: message.sessionId,
    screenshotId: message.screenshot.id,
  });

  // Broadcast screenshot update to all connected clients
  broadcast(message);
}
