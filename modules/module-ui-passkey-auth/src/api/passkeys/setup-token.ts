import { NextRequest, NextResponse } from 'next/server';
import {
  extractBearerToken,
  verifyJWT,
  createSetupToken,
} from '../../lib/passkeys';
import type { SetupTokenResponse } from '../../types';

/**
 * POST /api/passkeys/setup-token
 *
 * Generates a one-time setup token for registering new passkeys.
 * The token is valid for 5 minutes and can be used on a different device.
 * Requires Bearer JWT authentication.
 */
export async function POST(request: NextRequest) {
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

  const setupToken = createSetupToken();

  const response: SetupTokenResponse = {
    setupToken: setupToken.token,
    expiresAt: setupToken.expiresAt,
  };

  return NextResponse.json(response, { status: 201 });
}
