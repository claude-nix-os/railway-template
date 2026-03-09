import * as vscode from 'vscode';
import type { WsBrowserMessage } from '../types';

/**
 * WebSocket client for live browser screenshot updates
 * Subscribes to browser:screenshot events from the backend
 */
export class BrowserWebSocketClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(message: WsBrowserMessage) => void> = new Set();
  private statusHandler: ((connected: boolean) => void) | null = null;

  constructor(wsUrl?: string) {
    const config = vscode.workspace.getConfiguration('claudeos.browser');
    this.wsUrl = wsUrl || config.get<string>('wsUrl', 'ws://localhost:3000/ws');
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[BrowserWebSocketClient] Already connected');
      return;
    }

    try {
      console.log(`[BrowserWebSocketClient] Connecting to ${this.wsUrl}...`);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[BrowserWebSocketClient] Connected');
        this.reconnectAttempts = 0;
        this.notifyStatus(true);

        // Subscribe to browser events
        this.send({
          type: 'subscribe',
          channel: 'browser',
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsBrowserMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('[BrowserWebSocketClient] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[BrowserWebSocketClient] WebSocket error:', error);
        this.notifyStatus(false);
      };

      this.ws.onclose = () => {
        console.log('[BrowserWebSocketClient] Connection closed');
        this.ws = null;
        this.notifyStatus(false);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[BrowserWebSocketClient] Failed to connect:', error);
      this.notifyStatus(false);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.notifyStatus(false);
  }

  /**
   * Send a message to the WebSocket server
   */
  private send(message: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WsBrowserMessage): void {
    // Notify all registered handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('[BrowserWebSocketClient] Error in message handler:', error);
      }
    }
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[BrowserWebSocketClient] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[BrowserWebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Register a message handler
   */
  public onMessage(handler: (message: WsBrowserMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  /**
   * Unregister a message handler
   */
  public offMessage(handler: (message: WsBrowserMessage) => void): void {
    this.messageHandlers.delete(handler);
  }

  /**
   * Register a connection status handler
   */
  public onStatusChange(handler: (connected: boolean) => void): void {
    this.statusHandler = handler;
  }

  /**
   * Notify connection status change
   */
  private notifyStatus(connected: boolean): void {
    if (this.statusHandler) {
      this.statusHandler(connected);
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Update WebSocket URL from configuration
   */
  public updateWsUrl(wsUrl: string): void {
    const wasConnected = this.isConnected();
    this.disconnect();
    this.wsUrl = wsUrl;

    if (wasConnected) {
      this.connect();
    }
  }
}
