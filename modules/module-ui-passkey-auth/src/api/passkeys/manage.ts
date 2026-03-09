import { NextRequest, NextResponse } from 'next/server';
import {
  loadCredentials,
  deleteCredential,
  extractBearerToken,
  verifyJWT,
} from '../../lib/passkeys';
import type { PasskeyListItem } from '../../types';

/**
 * GET /api/passkeys
 *
 * Lists all registered passkey credentials (id, createdAt, label only).
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

  const items: PasskeyListItem[] = credentials.map((cred) => ({
    id: cred.id,
    createdAt: cred.createdAt,
    label: cred.label,
  }));

  return NextResponse.json({ passkeys: items });
}

/**
 * DELETE /api/passkeys
 *
 * Deletes a passkey credential by id.
 * Requires Bearer JWT authentication.
 * Expects { id: string } in the request body.
 */
export async function DELETE(request: NextRequest) {
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

  try {
    const body = (await request.json()) as { id?: string };

    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 },
      );
    }

    const deleted = deleteCredential(body.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true, id: body.id });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
