/**
 * Claude Code Auth/API Key Management Route
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

async function requireAuth(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const valid = await globalThis.claudeOS?.verifyToken(token);
  if (!valid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  return null;
}

export async function GET(request: Request) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const dataDir = globalThis.claudeOS?.DATA_DIR || '/data';
  const credsFile = path.join(dataDir, '.claude', '.credentials.json');

  let hasCredentials = false;
  try {
    const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
    hasCredentials = !!(creds.claudeAiOauth?.accessToken || process.env.CLAUDE_CODE_OAUTH_TOKEN);
  } catch {
    hasCredentials = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
  }

  return NextResponse.json({
    hasCredentials,
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    hasOAuth: hasCredentials,
  });
}

export async function POST(request: Request) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { apiKey, oauthToken } = body;

    const dataDir = globalThis.claudeOS?.DATA_DIR || '/data';

    if (apiKey) {
      const envFile = path.join(dataDir, '.env');
      let content = '';
      try { content = fs.readFileSync(envFile, 'utf-8'); } catch { /* */ }
      content = content.split('\n').filter(l => !l.startsWith('ANTHROPIC_API_KEY=')).join('\n');
      content += `\nANTHROPIC_API_KEY=${apiKey}\n`;
      fs.writeFileSync(envFile, content.trim() + '\n', { mode: 0o600 });
      process.env.ANTHROPIC_API_KEY = apiKey;
    }

    if (oauthToken) {
      const credsDir = path.join(dataDir, '.claude');
      fs.mkdirSync(credsDir, { recursive: true });
      const credsFile = path.join(credsDir, '.credentials.json');
      let creds: Record<string, unknown> = {};
      try { creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8')); } catch { /* */ }
      creds.claudeAiOauth = { accessToken: oauthToken };
      fs.writeFileSync(credsFile, JSON.stringify(creds, null, 2), { mode: 0o600 });
      process.env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken;
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
