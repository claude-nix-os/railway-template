import * as vscode from 'vscode';
import type {
  BrowserSession,
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  NavigateRequest,
  NavigateResponse,
  ScreenshotResponse,
  ControlRequest,
  ControlResponse,
} from '../types';

/**
 * HTTP client for Browser API endpoints
 * Handles all REST API calls to /api/browser/*
 */
export class BrowserApiClient {
  private apiUrl: string;
  private authToken: string | null = null;

  constructor(apiUrl?: string) {
    const config = vscode.workspace.getConfiguration('claudeos.browser');
    this.apiUrl = apiUrl || config.get<string>('apiUrl', 'http://localhost:3000/api/browser');
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * List all browser sessions
   */
  public async listSessions(): Promise<BrowserSession[]> {
    try {
      const response = await fetch(`${this.apiUrl}/sessions`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.status} ${response.statusText}`);
      }

      const data: ListSessionsResponse = await response.json();
      return data.sessions;
    } catch (error) {
      console.error('[BrowserApiClient] Error listing sessions:', error);
      throw error;
    }
  }

  /**
   * Get a specific browser session
   */
  public async getSession(sessionId: string): Promise<BrowserSession> {
    try {
      const response = await fetch(`${this.apiUrl}/sessions/${sessionId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get session: ${response.status} ${response.statusText}`);
      }

      const data: { session: BrowserSession } = await response.json();
      return data.session;
    } catch (error) {
      console.error('[BrowserApiClient] Error getting session:', error);
      throw error;
    }
  }

  /**
   * Create a new browser session
   */
  public async createSession(config?: CreateSessionRequest['config']): Promise<BrowserSession> {
    try {
      const body: CreateSessionRequest = config ? { config } : {};

      const response = await fetch(`${this.apiUrl}/sessions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
      }

      const data: CreateSessionResponse = await response.json();
      return data.session;
    } catch (error) {
      console.error('[BrowserApiClient] Error creating session:', error);
      throw error;
    }
  }

  /**
   * Close a browser session
   */
  public async closeSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to close session: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[BrowserApiClient] Error closing session:', error);
      throw error;
    }
  }

  /**
   * Navigate a browser session to a URL
   */
  public async navigate(sessionId: string, url: string, waitUntil?: NavigateRequest['waitUntil']): Promise<NavigateResponse> {
    try {
      const body: NavigateRequest = { url, waitUntil };

      const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/navigate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to navigate: ${response.status} ${response.statusText}`);
      }

      const data: NavigateResponse = await response.json();
      return data;
    } catch (error) {
      console.error('[BrowserApiClient] Error navigating:', error);
      throw error;
    }
  }

  /**
   * Capture a screenshot from a browser session
   */
  public async captureScreenshot(sessionId: string, fullPage: boolean = false): Promise<ScreenshotResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/screenshot`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ fullPage }),
      });

      if (!response.ok) {
        throw new Error(`Failed to capture screenshot: ${response.status} ${response.statusText}`);
      }

      const data: ScreenshotResponse = await response.json();
      return data;
    } catch (error) {
      console.error('[BrowserApiClient] Error capturing screenshot:', error);
      throw error;
    }
  }

  /**
   * Take control of a browser session
   */
  public async takeControl(sessionId: string, userId: string): Promise<ControlResponse> {
    try {
      const body: ControlRequest = { action: 'take', userId };

      const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/control`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to take control: ${response.status} ${response.statusText}`);
      }

      const data: ControlResponse = await response.json();
      return data;
    } catch (error) {
      console.error('[BrowserApiClient] Error taking control:', error);
      throw error;
    }
  }

  /**
   * Release control of a browser session
   */
  public async releaseControl(sessionId: string, userId: string): Promise<ControlResponse> {
    try {
      const body: ControlRequest = { action: 'release', userId };

      const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/control`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to release control: ${response.status} ${response.statusText}`);
      }

      const data: ControlResponse = await response.json();
      return data;
    } catch (error) {
      console.error('[BrowserApiClient] Error releasing control:', error);
      throw error;
    }
  }

  /**
   * Update API URL from configuration
   */
  public updateApiUrl(apiUrl: string): void {
    this.apiUrl = apiUrl;
  }
}
