import { cookies } from 'next/headers';

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('claude_os_token')?.value || null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  try {
    return await globalThis.claudeOS?.verifyToken(token);
  } catch {
    return false;
  }
}

export function requireAuth(
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const valid = await globalThis.claudeOS?.verifyToken(token);
    if (!valid) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    return handler(req);
  };
}
