import React, { useState, useCallback } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

type AuthStatus = 'idle' | 'checking' | 'authenticating' | 'success' | 'error' | 'no-passkeys';

interface PasskeyLoginProps {
  onSuccess?: (token: string) => void;
  onFallback?: () => void;
  className?: string;
}

/**
 * PasskeyLogin - "Sign in with Passkey" button for the login page.
 *
 * Renders an animated fingerprint/key icon button that initiates
 * the WebAuthn authentication flow. Falls back to token auth if
 * no passkeys are registered.
 */
export default function PasskeyLogin({ onSuccess, onFallback, className }: PasskeyLoginProps) {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePasskeyAuth = useCallback(async () => {
    setStatus('checking');
    setErrorMessage('');

    try {
      // Step 1: Get authentication options
      const optionsRes = await fetch('/api/passkeys/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (optionsRes.status === 404) {
        setStatus('no-passkeys');
        onFallback?.();
        return;
      }

      if (!optionsRes.ok) {
        throw new Error('Failed to get authentication options');
      }

      const options = await optionsRes.json();
      setStatus('authenticating');

      // Step 2: Start the browser WebAuthn ceremony
      const authResponse = await startAuthentication({ optionsJSON: options });

      // Step 3: Verify with the server
      const verifyRes = await fetch('/api/passkeys/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: authResponse,
          challenge: options.challenge,
        }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Authentication failed');
      }

      const result = await verifyRes.json();

      if (result.verified && result.token) {
        setStatus('success');
        onSuccess?.(result.token);
      } else {
        throw new Error('Authentication not verified');
      }
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Authentication failed';

      // Handle user cancellation gracefully
      if (message.includes('cancelled') || message.includes('canceled') || message.includes('AbortError')) {
        setErrorMessage('Authentication cancelled');
        setTimeout(() => {
          setStatus('idle');
          setErrorMessage('');
        }, 2000);
        return;
      }

      setErrorMessage(message);
    }
  }, [onSuccess, onFallback]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <button
        onClick={handlePasskeyAuth}
        disabled={status === 'checking' || status === 'authenticating' || status === 'success'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 500,
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backgroundColor:
            status === 'success'
              ? 'rgba(34, 197, 94, 0.2)'
              : status === 'error'
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(255, 255, 255, 0.08)',
          color:
            status === 'success'
              ? '#22c55e'
              : status === 'error'
                ? '#ef4444'
                : 'inherit',
          cursor:
            status === 'checking' || status === 'authenticating' || status === 'success'
              ? 'not-allowed'
              : 'pointer',
          opacity: status === 'checking' || status === 'authenticating' ? 0.7 : 1,
          transition: 'all 0.2s ease',
          width: '100%',
          maxWidth: '320px',
        }}
        aria-label="Sign in with Passkey"
      >
        {/* Animated fingerprint/key icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation:
              status === 'checking' || status === 'authenticating'
                ? 'passkey-pulse 1.5s ease-in-out infinite'
                : 'none',
          }}
        >
          {/* Key icon */}
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>

        <span>
          {status === 'idle' && 'Sign in with Passkey'}
          {status === 'checking' && 'Checking...'}
          {status === 'authenticating' && 'Waiting for passkey...'}
          {status === 'success' && 'Authenticated'}
          {status === 'error' && 'Authentication Failed'}
          {status === 'no-passkeys' && 'No Passkeys Found'}
        </span>
      </button>

      {status === 'error' && errorMessage && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#ef4444', margin: '0 0 8px 0' }}>
            {errorMessage}
          </p>
          <button
            onClick={handleRetry}
            style={{
              fontSize: '12px',
              color: '#888',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {status === 'no-passkeys' && (
        <p style={{ fontSize: '12px', color: '#888', margin: 0, textAlign: 'center' }}>
          No passkeys registered. Use token authentication or register a passkey in settings.
        </p>
      )}

      {/* CSS animation for the pulse effect */}
      <style>{`
        @keyframes passkey-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
