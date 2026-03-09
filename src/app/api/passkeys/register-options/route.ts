import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import {
  loadCredentials,
  storeChallenge,
  getRpId,
  uint8ArrayToBase64Url,
} from '@/lib/passkeys';

/**
 * POST /api/passkeys/register/options
 *
 * Generates WebAuthn registration options for creating a new passkey.
 * Optionally accepts a setupToken for remote registration.
 */
export async function POST(request: NextRequest) {
  try {
    const rpId = getRpId(request);
    const existingCredentials = loadCredentials();

    // Generate a random user ID for this registration
    const userId = new Uint8Array(32);
    crypto.getRandomValues(userId);

    const options = await generateRegistrationOptions({
      rpName: 'ClaudeOS',
      rpID: rpId,
      userName: 'ClaudeOS User',
      userDisplayName: 'ClaudeOS User',
      userID: userId,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.id,
        transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    });

    // Store the challenge for verification
    storeChallenge(
      options.challenge,
      'registration',
      uint8ArrayToBase64Url(userId),
    );

    return NextResponse.json(options);
  } catch (error) {
    console.error('[passkey-auth] Registration options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 },
    );
  }
}
