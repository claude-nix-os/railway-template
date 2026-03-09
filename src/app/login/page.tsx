'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import PasskeyLogin from '@/components/panels/PasskeyLogin';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTokenAuth, setShowTokenAuth] = useState(false);
  const setJwtToken = useUIStore((s) => s.setJwtToken);
  const isAuthenticated = useUIStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    // Check for stored JWT
    const stored = typeof window !== 'undefined' ? localStorage.getItem('claude_os_jwt') : null;
    if (stored) {
      setJwtToken(stored);
    }
  }, [setJwtToken]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handlePasskeySuccess = (jwt: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('claude_os_jwt', jwt);
    }
    setJwtToken(jwt);
    router.push('/');
  };

  const handlePasskeyFallback = () => {
    // Passkey auth not available, show token input
    setShowTokenAuth(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Authentication failed');
        return;
      }

      const data = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem('claude_os_jwt', data.jwt);
      }
      setJwtToken(data.jwt);
      router.push('/');
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-surface-0">
      <div className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-accent" />
          <h1 className="text-xl font-semibold text-text-primary">
            ClaudeOS
          </h1>
          <p className="text-sm text-text-secondary text-center">
            {showTokenAuth ? 'Enter your access token to continue' : 'Sign in to continue'}
          </p>

          {!showTokenAuth ? (
            <div className="w-full space-y-4">
              {/* Passkey authentication (primary method) */}
              <PasskeyLogin
                onSuccess={handlePasskeySuccess}
                onFallback={handlePasskeyFallback}
                className="w-full"
              />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border-default" />
                <span className="text-xs text-text-tertiary">OR</span>
                <div className="flex-1 h-px bg-border-default" />
              </div>

              {/* Token auth option */}
              <button
                onClick={() => setShowTokenAuth(true)}
                className="w-full py-3 px-4 bg-surface-2 hover:bg-surface-3
                           border border-border-default rounded-lg
                           text-text-secondary hover:text-text-primary text-sm
                           transition-colors"
              >
                Use Access Token
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Access token"
                className="w-full px-4 py-3 bg-surface-2 border border-border-default rounded-lg
                           text-text-primary placeholder:text-text-tertiary
                           focus:outline-none focus:border-accent
                           transition-colors"
                autoFocus
                disabled={loading}
              />

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full py-3 bg-accent hover:bg-accent-hover
                           disabled:opacity-50 disabled:cursor-not-allowed
                           text-white font-medium rounded-lg
                           transition-colors"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              {/* Back to passkey option */}
              <button
                type="button"
                onClick={() => {
                  setShowTokenAuth(false);
                  setError('');
                  setToken('');
                }}
                className="w-full py-2 text-text-tertiary hover:text-text-secondary text-sm
                           transition-colors"
              >
                ← Back to Passkey
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
