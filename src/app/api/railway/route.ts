/**
 * Railway Tools API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleRailwayRoute } from '@/modules/railway-tools/railway-api';

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

  const url = new URL(request.url);
  const subpath = url.searchParams.get('action') ?? 'status';
  return handleRailwayRoute(request, subpath);
}
