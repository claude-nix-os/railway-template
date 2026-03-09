import { NextRequest, NextResponse } from 'next/server';
import { BrowserSessionManager } from '../../services/BrowserSessionManager';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  NavigateRequest,
  NavigateResponse,
  ScreenshotRequest,
  ScreenshotResponse,
  ClickRequest,
  ClickResponse,
  TypeRequest,
  TypeResponse,
  ControlRequest,
  ControlResponse,
} from '../../types';

// Singleton instance
let sessionManager: BrowserSessionManager | null = null;

/**
 * Get or create the browser session manager singleton
 */
async function getSessionManager(): Promise<BrowserSessionManager> {
  if (!sessionManager) {
    const dataDir = process.env.BROWSER_DATA_DIR || '/data/browser-sessions';
    sessionManager = new BrowserSessionManager(dataDir);
    await sessionManager.initialize();
  }
  return sessionManager;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

function requireAuth(request: NextRequest): NextResponse | null {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required. Provide a Bearer token.' },
      { status: 401 }
    );
  }
  return null;
}

// Extract user ID from token (simplified - in production, decode JWT)
function getUserId(request: NextRequest): string {
  const token = extractToken(request);
  // In production, decode the JWT to get the real user ID
  return token ? 'user-' + token.substring(0, 8) : 'anonymous';
}

// ---------------------------------------------------------------------------
// Route parsing helpers
// ---------------------------------------------------------------------------

function getSubPath(request: NextRequest): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const prefix = '/api/browser';
  const sub = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : pathname;
  return sub.startsWith('/') ? sub : `/${sub}`;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/browser/sessions - List all sessions
 * GET /api/browser/sessions/{id} - Get session details
 */
export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const manager = await getSessionManager();
    const subPath = getSubPath(request);

    // GET /api/browser/sessions - List all
    if (subPath === '/sessions') {
      const sessions = manager.getAllSessions();
      const response: ListSessionsResponse = { sessions };
      return NextResponse.json(response);
    }

    // GET /api/browser/sessions/{id} - Get one
    const sessionMatch = subPath.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      const session = manager.getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('[Browser API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/browser/sessions - Create new session
 * POST /api/browser/sessions/{id}/navigate - Navigate to URL
 * POST /api/browser/sessions/{id}/screenshot - Capture screenshot
 * POST /api/browser/sessions/{id}/click - Click element
 * POST /api/browser/sessions/{id}/type - Type text
 * POST /api/browser/sessions/{id}/control - Take/release control
 */
export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const manager = await getSessionManager();
    const subPath = getSubPath(request);
    const userId = getUserId(request);

    // POST /api/browser/sessions - Create new session
    if (subPath === '/sessions') {
      let body: CreateSessionRequest = {};
      try {
        body = await request.json();
      } catch {
        // Empty body is OK
      }

      const session = await manager.createSession(body.config);
      const response: CreateSessionResponse = { session };
      return NextResponse.json(response, { status: 201 });
    }

    // POST /api/browser/sessions/{id}/navigate
    const navigateMatch = subPath.match(/^\/sessions\/([^\/]+)\/navigate$/);
    if (navigateMatch) {
      const sessionId = navigateMatch[1];
      const body: NavigateRequest = await request.json();

      if (!body.url) {
        return NextResponse.json(
          { error: 'url is required' },
          { status: 400 }
        );
      }

      await manager.navigate(sessionId, body.url, body.waitUntil);

      // Capture screenshot after navigation
      const screenshot = await manager.captureScreenshot(sessionId, false);

      const response: NavigateResponse = {
        success: true,
        url: body.url,
        screenshot,
      };

      return NextResponse.json(response);
    }

    // POST /api/browser/sessions/{id}/screenshot
    const screenshotMatch = subPath.match(/^\/sessions\/([^\/]+)\/screenshot$/);
    if (screenshotMatch) {
      const sessionId = screenshotMatch[1];
      let body: ScreenshotRequest = {};
      try {
        body = await request.json();
      } catch {
        // Empty body is OK
      }

      const screenshot = await manager.captureScreenshot(
        sessionId,
        body.fullPage ?? false
      );

      const response: ScreenshotResponse = { screenshot };
      return NextResponse.json(response);
    }

    // POST /api/browser/sessions/{id}/click
    const clickMatch = subPath.match(/^\/sessions\/([^\/]+)\/click$/);
    if (clickMatch) {
      const sessionId = clickMatch[1];
      const body: ClickRequest = await request.json();

      if (!body.selector) {
        return NextResponse.json(
          { error: 'selector is required' },
          { status: 400 }
        );
      }

      await manager.click(
        sessionId,
        body.selector,
        body.button,
        body.clickCount
      );

      // Capture screenshot after click
      const screenshot = await manager.captureScreenshot(sessionId, false);

      const response: ClickResponse = {
        success: true,
        screenshot,
      };

      return NextResponse.json(response);
    }

    // POST /api/browser/sessions/{id}/type
    const typeMatch = subPath.match(/^\/sessions\/([^\/]+)\/type$/);
    if (typeMatch) {
      const sessionId = typeMatch[1];
      const body: TypeRequest = await request.json();

      if (!body.selector || !body.text) {
        return NextResponse.json(
          { error: 'selector and text are required' },
          { status: 400 }
        );
      }

      await manager.type(
        sessionId,
        body.selector,
        body.text,
        body.delay
      );

      // Capture screenshot after typing
      const screenshot = await manager.captureScreenshot(sessionId, false);

      const response: TypeResponse = {
        success: true,
        screenshot,
      };

      return NextResponse.json(response);
    }

    // POST /api/browser/sessions/{id}/control
    const controlMatch = subPath.match(/^\/sessions\/([^\/]+)\/control$/);
    if (controlMatch) {
      const sessionId = controlMatch[1];
      const body: ControlRequest = await request.json();

      if (!body.action) {
        return NextResponse.json(
          { error: 'action is required (take or release)' },
          { status: 400 }
        );
      }

      if (body.action === 'take') {
        manager.takeControl(sessionId, body.userId || userId);
      } else if (body.action === 'release') {
        manager.releaseControl(sessionId, body.userId || userId);
      } else {
        return NextResponse.json(
          { error: 'action must be "take" or "release"' },
          { status: 400 }
        );
      }

      const session = manager.getSession(sessionId);
      const response: ControlResponse = {
        success: true,
        controlledBy: session?.controlledBy,
      };

      return NextResponse.json(response);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('[Browser API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/browser/sessions/{id} - Close session
 */
export async function DELETE(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const manager = await getSessionManager();
    const subPath = getSubPath(request);

    // DELETE /api/browser/sessions/{id}
    const sessionMatch = subPath.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      await manager.closeSession(sessionId);

      return NextResponse.json({
        success: true,
        message: 'Session closed',
      });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('[Browser API] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Cleanup on module unload
 */
export async function cleanup(): Promise<void> {
  if (sessionManager) {
    await sessionManager.shutdown();
    sessionManager = null;
  }
}
