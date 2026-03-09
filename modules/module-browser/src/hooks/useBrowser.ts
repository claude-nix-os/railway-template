/**
 * React hook for interacting with the Browser API
 *
 * Provides a convenient interface for managing browser sessions
 * from client-side components.
 */

import { useState, useCallback } from 'react';
import type {
  BrowserSession,
  BrowserSessionConfig,
  CreateSessionResponse,
  ListSessionsResponse,
  NavigateResponse,
  ScreenshotResponse,
} from '../types';

interface UseBrowserOptions {
  apiUrl?: string;
  authToken?: string;
}

export function useBrowser({
  apiUrl = '/api/browser',
  authToken,
}: UseBrowserOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback(() => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }, [authToken]);

  /**
   * Create a new browser session
   */
  const createSession = useCallback(
    async (config?: BrowserSessionConfig): Promise<BrowserSession | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/sessions`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ config }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.statusText}`);
        }

        const data: CreateSessionResponse = await response.json();
        return data.session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, getHeaders]
  );

  /**
   * List all browser sessions
   */
  const listSessions = useCallback(async (): Promise<BrowserSession[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/sessions`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.statusText}`);
      }

      const data: ListSessionsResponse = await response.json();
      return data.sessions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getHeaders]);

  /**
   * Get a specific session
   */
  const getSession = useCallback(
    async (sessionId: string): Promise<BrowserSession | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
          headers: getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to get session: ${response.statusText}`);
        }

        const data = await response.json();
        return data.session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, getHeaders]
  );

  /**
   * Navigate to a URL
   */
  const navigate = useCallback(
    async (
      sessionId: string,
      url: string,
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
    ): Promise<NavigateResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}/navigate`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ url, waitUntil }),
        });

        if (!response.ok) {
          throw new Error(`Failed to navigate: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, getHeaders]
  );

  /**
   * Capture a screenshot
   */
  const screenshot = useCallback(
    async (
      sessionId: string,
      fullPage: boolean = false
    ): Promise<ScreenshotResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}/screenshot`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ fullPage }),
        });

        if (!response.ok) {
          throw new Error(`Failed to capture screenshot: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, getHeaders]
  );

  /**
   * Click an element
   */
  const click = useCallback(
    async (
      sessionId: string,
      selector: string,
      button: 'left' | 'right' | 'middle' = 'left'
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}/click`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ selector, button }),
        });

        if (!response.ok) {
          throw new Error(`Failed to click: ${response.statusText}`);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, getHeaders]
  );

  /**
   * Type text into an element
   */
  const type = useCallback(
    async (
      sessionId: string,
      selector: string,
      text: string,
      delay?: number
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}/type`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ selector, text, delay }),
        });

        if (!response.ok) {
          throw new Error(`Failed to type: ${response.statusText}`);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, getHeaders]
  );

  /**
   * Close a session
   */
  const closeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to close session: ${response.statusText}`);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, getHeaders]
  );

  return {
    loading,
    error,
    createSession,
    listSessions,
    getSession,
    navigate,
    screenshot,
    click,
    type,
    closeSession,
  };
}
