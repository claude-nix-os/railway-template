import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserSessionManager } from '../../src/services/BrowserSessionManager';
import type { BrowserSessionConfig } from '../../src/types';

describe('BrowserSessionManager', () => {
  let manager: BrowserSessionManager;

  beforeAll(async () => {
    // Use a test directory
    manager = new BrowserSessionManager('/tmp/test-browser-sessions');
    await manager.initialize();
  });

  afterAll(async () => {
    await manager.shutdown();
  });

  it('should create a new browser session', async () => {
    const config: BrowserSessionConfig = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      screenshotInterval: 0,
    };

    const session = await manager.createSession(config);

    expect(session.id).toBeDefined();
    expect(session.state).toBe('active');
    expect(session.config.viewport).toEqual({ width: 1280, height: 720 });
    expect(session.currentUrl).toBeNull();
    expect(session.screenshotCount).toBe(0);

    // Cleanup
    await manager.closeSession(session.id);
  });

  it('should navigate to a URL', async () => {
    const session = await manager.createSession();

    await manager.navigate(session.id, 'https://example.com', 'load');

    const updatedSession = manager.getSession(session.id);
    expect(updatedSession?.currentUrl).toBe('https://example.com');

    // Cleanup
    await manager.closeSession(session.id);
  });

  it('should capture a screenshot', async () => {
    const session = await manager.createSession();
    await manager.navigate(session.id, 'https://example.com');

    const screenshot = await manager.captureScreenshot(session.id, false);

    expect(screenshot.id).toBeDefined();
    expect(screenshot.sessionId).toBe(session.id);
    expect(screenshot.filePath).toContain('.png');
    expect(screenshot.width).toBeGreaterThan(0);
    expect(screenshot.height).toBeGreaterThan(0);

    const updatedSession = manager.getSession(session.id);
    expect(updatedSession?.screenshotCount).toBe(1);

    // Cleanup
    await manager.closeSession(session.id);
  });

  it('should list all sessions', async () => {
    const session1 = await manager.createSession();
    const session2 = await manager.createSession();

    const sessions = manager.getAllSessions();

    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.find(s => s.id === session1.id)).toBeDefined();
    expect(sessions.find(s => s.id === session2.id)).toBeDefined();

    // Cleanup
    await manager.closeSession(session1.id);
    await manager.closeSession(session2.id);
  });

  it('should take and release control', async () => {
    const session = await manager.createSession();
    const userId = 'test-user-123';

    // Take control
    manager.takeControl(session.id, userId);
    let updatedSession = manager.getSession(session.id);
    expect(updatedSession?.controlledBy).toBe(userId);

    // Release control
    manager.releaseControl(session.id, userId);
    updatedSession = manager.getSession(session.id);
    expect(updatedSession?.controlledBy).toBeUndefined();

    // Cleanup
    await manager.closeSession(session.id);
  });

  it('should prevent multiple users from taking control', async () => {
    const session = await manager.createSession();

    manager.takeControl(session.id, 'user-1');

    expect(() => {
      manager.takeControl(session.id, 'user-2');
    }).toThrow();

    // Cleanup
    await manager.closeSession(session.id);
  });

  it('should close a session', async () => {
    const session = await manager.createSession();

    await manager.closeSession(session.id);

    const closedSession = manager.getSession(session.id);
    expect(closedSession).toBeNull();
  });
});
