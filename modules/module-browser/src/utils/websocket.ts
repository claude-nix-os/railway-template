import type { WsScreenshotMessage, WsInteractionMessage } from '../types';

/**
 * WebSocket utility for broadcasting browser events
 *
 * This module provides helper functions for sending WebSocket messages
 * to connected clients. In production, integrate with your WebSocket server.
 */

// Global WebSocket broadcast function (to be injected by the ClaudeOS runtime)
let broadcastFn: ((message: unknown) => void) | null = null;

/**
 * Set the broadcast function (called by ClaudeOS runtime on module load)
 */
export function setBroadcastFunction(fn: (message: unknown) => void): void {
  broadcastFn = fn;
}

/**
 * Broadcast a screenshot update
 */
export function broadcastScreenshot(message: WsScreenshotMessage): void {
  if (broadcastFn) {
    broadcastFn(message);
  } else {
    console.warn('[WebSocket] Broadcast function not set, cannot send screenshot update');
  }
}

/**
 * Broadcast an interaction event
 */
export function broadcastInteraction(message: WsInteractionMessage): void {
  if (broadcastFn) {
    broadcastFn(message);
  } else {
    console.warn('[WebSocket] Broadcast function not set, cannot send interaction event');
  }
}
