import { NextRequest, NextResponse } from 'next/server';
import {
  loadCredentials,
  extractBearerToken,
  verifyJWT,
} from '@/lib/passkeys';
import type { PasskeyCheckResponse } from '@/types/passkey';

/**
 * GET /api/passkeys/check
 *
 * Returns whether passkeys are registered and how many.
 * Requires Bearer JWT authentication.
 */
export async function GET(request: NextRequest) {
  // Verify JWT
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 },
    );
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 },
    );
  }

  const credentials = loadCredentials();

  const response: PasskeyCheckResponse = {
    hasPasskeys: credentials.length > 0,
    count: credentials.length,
  };

  return NextResponse.json(response);
}
