import React, { useState, useEffect, useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import type { PasskeyListItem, SetupTokenResponse } from '@/types/passkey';

type RegistrationStatus = 'idle' | 'loading' | 'registering' | 'success' | 'error';

interface PasskeySettingsProps {
  token?: string;
  className?: string;
}

/**
 * PasskeySettings - Manage passkeys in the Settings page.
 *
 * Provides:
 * - List of registered passkeys with delete buttons
 * - "Register New Passkey" button
 * - Setup token generator for remote registration
 */
export default function PasskeySettings({ token, className }: PasskeySettingsProps) {
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [setupToken, setSetupToken] = useState<SetupTokenResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  // Load passkeys on mount
  const loadPasskeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/passkeys', {
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error('Failed to load passkeys');
      }

      const data = await res.json();
      setPasskeys(data.passkeys || []);
    } catch (error) {
      console.error('[passkey-settings] Failed to load passkeys:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  // Register a new passkey
  const handleRegister = useCallback(async () => {
    setRegistrationStatus('loading');
    setErrorMessage('');

    try {
      // Step 1: Get registration options
      const optionsRes = await fetch('/api/passkeys/register/options', {
        method: 'POST',
        headers: authHeaders,
      });

      if (!optionsRes.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsRes.json();
      setRegistrationStatus('registering');

      // Step 2: Start the browser WebAuthn ceremony
      const regResponse = await startRegistration({ optionsJSON: options });

      // Step 3: Verify with the server
      const verifyRes = await fetch('/api/passkeys/register/verify', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          response: regResponse,
          challenge: options.challenge,
          label: newLabel || undefined,
        }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await verifyRes.json();

      if (result.verified) {
        setRegistrationStatus('success');
        setNewLabel('');
        // Refresh the list
        await loadPasskeys();
        // Reset status after a moment
        setTimeout(() => setRegistrationStatus('idle'), 3000);
      } else {
        throw new Error('Registration not verified');
      }
    } catch (error) {
      setRegistrationStatus('error');
      const message = error instanceof Error ? error.message : 'Registration failed';

      if (message.includes('cancelled') || message.includes('canceled') || message.includes('AbortError')) {
        setErrorMessage('Registration cancelled');
      } else {
        setErrorMessage(message);
      }
    }
  }, [token, newLabel, loadPasskeys]);

  // Delete a passkey
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this passkey? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);

    try {
      const res = await fetch('/api/passkeys', {
        method: 'DELETE',
        headers: authHeaders,
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete passkey');
      }

      // Refresh the list
      await loadPasskeys();
    } catch (error) {
      console.error('[passkey-settings] Failed to delete passkey:', error);
    } finally {
      setDeletingId(null);
    }
  }, [token, loadPasskeys]);

  // Generate a setup token
  const handleGenerateSetupToken = useCallback(async () => {
    try {
      const res = await fetch('/api/passkeys/setup-token', {
        method: 'POST',
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error('Failed to generate setup token');
      }

      const data: SetupTokenResponse = await res.json();
      setSetupToken(data);
    } catch (error) {
      console.error('[passkey-settings] Failed to generate setup token:', error);
    }
  }, [token]);

  const formatDate = (isoString: string): string => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={className} style={{ padding: '16px', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Passkey Authentication
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
          Manage WebAuthn passkeys for passwordless authentication.
        </p>
      </div>

      {/* Registered Passkeys */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 500, color: '#ccc' }}>
          Registered Passkeys
        </h3>

        {loading ? (
          <p style={{ fontSize: '13px', color: '#666' }}>Loading passkeys...</p>
        ) : passkeys.length === 0 ? (
          <div
            style={{
              padding: '20px',
              borderRadius: '8px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#888' }}>
              No passkeys registered
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
              Register a passkey below for passwordless login.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {passkeys.map((passkey) => (
              <li
                key={passkey.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  marginBottom: '6px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {/* Key icon */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}
                    >
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                    {passkey.label || 'Passkey'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                    Created {formatDate(passkey.createdAt)} &middot; ID: {passkey.id.slice(0, 12)}...
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(passkey.id)}
                  disabled={deletingId === passkey.id}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    cursor: deletingId === passkey.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === passkey.id ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {deletingId === passkey.id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Register New Passkey */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 500, color: '#ccc' }}>
          Register New Passkey
        </h3>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Passkey label (optional)"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleRegister}
            disabled={registrationStatus === 'loading' || registrationStatus === 'registering'}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor:
                registrationStatus === 'success'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(99, 102, 241, 0.15)',
              color:
                registrationStatus === 'success'
                  ? '#22c55e'
                  : '#818cf8',
              cursor:
                registrationStatus === 'loading' || registrationStatus === 'registering'
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                registrationStatus === 'loading' || registrationStatus === 'registering'
                  ? 0.7
                  : 1,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {registrationStatus === 'idle' && 'Register Passkey'}
            {registrationStatus === 'loading' && 'Preparing...'}
            {registrationStatus === 'registering' && 'Touch your authenticator...'}
            {registrationStatus === 'success' && 'Registered!'}
            {registrationStatus === 'error' && 'Failed'}
          </button>
        </div>

        {registrationStatus === 'error' && errorMessage && (
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#ef4444' }}>
            {errorMessage}
          </p>
        )}
      </div>

      {/* Setup Token */}
      <div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 500, color: '#ccc' }}>
          Remote Registration
        </h3>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888' }}>
          Generate a one-time token to register a passkey from another device.
        </p>

        <button
          onClick={handleGenerateSetupToken}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          Generate Setup Token
        </button>

        {setupToken && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
              Setup Token (valid for 5 minutes):
            </div>
            <code
              style={{
                display: 'block',
                padding: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                userSelect: 'all',
              }}
            >
              {setupToken.setupToken}
            </code>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>
              Expires: {formatDate(setupToken.expiresAt)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
