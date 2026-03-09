import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import {
  consumeChallengeByValue,
  addCredential,
  getRpId,
  getExpectedOrigin,
  uint8ArrayToBase64Url,
} from '../../lib/passkeys';
import type { StoredCredential } from '../../types';

/**
 * POST /api/passkeys/register/verify
 *
 * Verifies a WebAuthn registration response and stores the new credential.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      response: RegistrationResponseJSON;
      challenge: string;
      label?: string;
    };

    if (!body.response || !body.challenge) {
      return NextResponse.json(
        { error: 'Missing required fields: response, challenge' },
        { status: 400 },
      );
    }

    // Consume the stored challenge
    const challengeEntry = consumeChallengeByValue(body.challenge, 'registration');
    if (!challengeEntry) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge' },
        { status: 400 },
      );
    }

    const rpId = getRpId(request);
    const expectedOrigin = getExpectedOrigin(request);

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challengeEntry.challenge,
      expectedOrigin,
      expectedRPID: rpId,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 },
      );
    }

    const { credential } = verification.registrationInfo;

    const storedCredential: StoredCredential = {
      id: credential.id,
      publicKey: uint8ArrayToBase64Url(credential.publicKey),
      counter: credential.counter,
      createdAt: new Date().toISOString(),
      label: body.label || undefined,
    };

    addCredential(storedCredential);

    return NextResponse.json({
      verified: true,
      credential: {
        id: storedCredential.id,
        createdAt: storedCredential.createdAt,
        label: storedCredential.label,
      },
    });
  } catch (error) {
    console.error('[passkey-auth] Registration verify error:', error);
    return NextResponse.json(
      { error: 'Registration verification failed' },
      { status: 500 },
    );
  }
}
