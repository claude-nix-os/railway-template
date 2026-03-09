/**
 * ClaudeOS v3 - Session API Route (single session)
 *
 * GET /api/sessions/:id - Get session details
 * PATCH /api/sessions/:id - Update session
 * DELETE /api/sessions/:id - Delete session
 */

import { NextResponse } from 'next/server';

async function requireAuth(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const valid = await globalThis.claudeOS?.verifyToken(token);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const session = globalThis.claudeOS?.sessions.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const session = globalThis.claudeOS?.sessions.get(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  try {
    const body = await request.json();

    if (body.title !== undefined) {
      session.title = body.title;
    }
    if (body.status === 'archived') {
      globalThis.claudeOS?.archiveSession(id);
    }

    session.updatedAt = new Date().toISOString();

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const exists = globalThis.claudeOS?.sessions.has(id);

  if (!exists) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  globalThis.claudeOS?.deleteSession(id);

  return NextResponse.json({ deleted: true });
}
