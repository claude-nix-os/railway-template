/**
 * Tasks API Route - Task CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleTasksRoute } from '@/modules/file-explorer/tasks-api';

async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const valid = await globalThis.claudeOS?.verifyToken(token);
  if (!valid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  return null;
}

export async function GET(request: NextRequest) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;
  return handleTasksRoute(request);
}

export async function POST(request: NextRequest) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;
  return handleTasksRoute(request);
}

export async function PATCH(request: NextRequest) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;
  return handleTasksRoute(request);
}

export async function DELETE(request: NextRequest) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;
  return handleTasksRoute(request);
}
