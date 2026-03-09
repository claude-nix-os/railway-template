import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import {
  loadCredentials,
  storeChallenge,
  getRpId,
} from '@/lib/passkeys';

/**
 * POST /api/passkeys/authenticate/options
 *
 * Generates WebAuthn authentication options for signing in with a passkey.
 */
export async function POST(request: NextRequest) {
  try {
    const credentials = loadCredentials();

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'No passkeys registered' },
        { status: 404 },
      );
    }

    const rpId = getRpId(request);

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: credentials.map((cred) => ({
        id: cred.id,
        transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'],
      })),
      userVerification: 'preferred',
    });

    // Store the challenge for verification
    storeChallenge(options.challenge, 'authentication');

    return NextResponse.json(options);
  } catch (error) {
    console.error('[passkey-auth] Authentication options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 },
    );
  }
}
