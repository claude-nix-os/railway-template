'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setJwtToken, isAuthenticated } = useUIStore();
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
            Enter your access token to continue
          </p>

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
          </form>
        </div>
      </div>
    </div>
  );
}
