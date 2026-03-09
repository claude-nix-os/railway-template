import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import {
  consumeChallengeByValue,
  findCredentialById,
  updateCredentialCounter,
  getRpId,
  getExpectedOrigin,
  base64UrlToUint8Array,
  createJWT,
} from '@/lib/passkeys';

/**
 * POST /api/passkeys/authenticate/verify
 *
 * Verifies a WebAuthn authentication response and issues a JWT on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      response: AuthenticationResponseJSON;
      challenge: string;
    };

    if (!body.response || !body.challenge) {
      return NextResponse.json(
        { error: 'Missing required fields: response, challenge' },
        { status: 400 },
      );
    }

    // Consume the stored challenge
    const challengeEntry = consumeChallengeByValue(body.challenge, 'authentication');
    if (!challengeEntry) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge' },
        { status: 400 },
      );
    }

    // Find the credential being used
    const credentialId = body.response.id;
    const storedCredential = findCredentialById(credentialId);

    if (!storedCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 400 },
      );
    }

    const rpId = getRpId(request);
    const expectedOrigin = getExpectedOrigin(request);

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challengeEntry.challenge,
      expectedOrigin,
      expectedRPID: rpId,
      credential: {
        id: storedCredential.id,
        publicKey: base64UrlToUint8Array(storedCredential.publicKey),
        counter: storedCredential.counter,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 401 },
      );
    }

    // Update the counter to prevent replay attacks
    updateCredentialCounter(
      storedCredential.id,
      verification.authenticationInfo.newCounter,
    );

    // Issue a JWT
    const token = await createJWT({
      credentialId: storedCredential.id,
      authMethod: 'passkey',
    });

    return NextResponse.json({
      verified: true,
      token,
    });
  } catch (error) {
    console.error('[passkey-auth] Authentication verify error:', error);
    return NextResponse.json(
      { error: 'Authentication verification failed' },
      { status: 500 },
    );
  }
}
