/**
 * ClaudeOS v3 - Sessions API Route
 *
 * GET /api/sessions - List all sessions
 * POST /api/sessions - Create a new session
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

  return null; // Auth OK
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const sessions = globalThis.claudeOS?.sessions;
  if (!sessions) {
    return NextResponse.json({ sessions: [] });
  }

  const list = Array.from(sessions.values()).map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    unread: s.unread,
    messageCount: s.messages.length,
    lastMessage: s.messages[s.messages.length - 1]?.content.slice(0, 100),
  }));

  // Sort by updatedAt descending
  list.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return NextResponse.json({ sessions: list });
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const title = body.title as string | undefined;

    const session = globalThis.claudeOS?.createSession(title);
    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 },
      );
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
