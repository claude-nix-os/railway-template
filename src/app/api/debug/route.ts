/**
 * Debug/Diagnostics API Route
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const valid = await globalThis.claudeOS?.verifyToken(token);
  if (!valid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const registry = globalThis.claudeOS?.registry;

  return NextResponse.json({
    version: '3.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    sessions: globalThis.claudeOS?.sessions?.size ?? 0,
    activeProcesses: globalThis.claudeOS?.activeProcesses?.size ?? 0,
    modules: registry ? Object.keys(registry.modules).length : 0,
    dataDir: globalThis.claudeOS?.DATA_DIR,
    workspaceDir: globalThis.claudeOS?.WORKSPACE_DIR,
    nodeVersion: process.version,
    platform: process.platform,
  });
}
