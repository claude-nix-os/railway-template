/**
 * Browser Sessions Component
 *
 * Optional UI component for viewing and managing browser sessions.
 * This component can be registered as a panel in the module definition.
 *
 * Note: This requires @claude-nix-os/module-ui to be installed.
 */

import React, { useState, useEffect } from 'react';
import type { BrowserSession } from '../types';

interface BrowserSessionsProps {
  apiUrl?: string;
}

export function BrowserSessions({ apiUrl = '/api/browser' }: BrowserSessionsProps) {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadSessions() {
    try {
      const response = await fetch(`${apiUrl}/sessions`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    try {
      const response = await fetch(`${apiUrl}/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
            screenshotInterval: 5000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function closeSession(sessionId: string) {
    try {
      const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to close session: ${response.statusText}`);
      }

      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  function getToken(): string {
    // In production, get the token from your auth system
    return 'dummy-token';
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-gray-500">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Browser Sessions</h2>
        <button
          onClick={createSession}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Session
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-gray-500">No active sessions</div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div
              key={session.id}
              className="p-4 border border-gray-300 rounded bg-white shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{session.id}</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      session.state === 'active'
                        ? 'bg-green-100 text-green-800'
                        : session.state === 'idle'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {session.state}
                  </span>
                  <button
                    onClick={() => closeSession(session.id)}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">URL:</span>{' '}
                  {session.currentUrl || 'No page loaded'}
                </div>
                <div>
                  <span className="font-medium">Screenshots:</span>{' '}
                  {session.screenshotCount}
                </div>
                <div>
                  <span className="font-medium">Resolution:</span>{' '}
                  {session.config.viewport?.width}x{session.config.viewport?.height}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(session.createdAt).toLocaleString()}
                </div>
                {session.controlledBy && (
                  <div>
                    <span className="font-medium">Controlled by:</span>{' '}
                    {session.controlledBy}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
