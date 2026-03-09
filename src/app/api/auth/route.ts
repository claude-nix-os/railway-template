/**
 * ClaudeOS v3 - Core Auth API Route
 *
 * POST /api/auth - Exchange auth token for JWT
 * GET /api/auth - Verify current JWT
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 },
      );
    }

    // Verify against the auth token
    if (token !== globalThis.claudeOS?.AUTH_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 },
      );
    }

    // Create JWT
    const jwt = await globalThis.claudeOS.createJWT();

    return NextResponse.json({ jwt });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const valid = await globalThis.claudeOS?.verifyToken(token);

  if (!valid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
