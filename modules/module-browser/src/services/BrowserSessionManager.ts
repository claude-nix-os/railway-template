import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import type {
  BrowserSession,
  BrowserSessionConfig,
  SessionState,
  Screenshot,
} from '../types';

/**
 * Manages Playwright browser sessions with screenshot capture
 */
export class BrowserSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private dataDir: string;
  private browser: Browser | null = null;

  constructor(dataDir: string = '/data/browser-sessions') {
    this.dataDir = dataDir;
  }

  /**
   * Initialize the browser session manager
   */
  async initialize(): Promise<void> {
    console.log('[BrowserSessionManager] Initializing...');

    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });

    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    console.log('[BrowserSessionManager] Initialized successfully');
  }

  /**
   * Shutdown the browser session manager
   */
  async shutdown(): Promise<void> {
    console.log('[BrowserSessionManager] Shutting down...');

    // Close all sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      await this.closeSession(id);
    }

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    console.log('[BrowserSessionManager] Shutdown complete');
  }

  /**
   * Create a new browser session
   */
  async createSession(config: BrowserSessionConfig = {}): Promise<BrowserSession> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const sessionId = this.generateSessionId();
    const sessionDir = path.join(this.dataDir, sessionId);
    const screenshotsDir = path.join(sessionDir, 'screenshots');

    // Create session directories
    await fs.mkdir(screenshotsDir, { recursive: true });

    // Create browser context with config
    const context = await this.browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 },
      userAgent: config.userAgent,
      recordVideo: config.recordVideo ? {
        dir: path.join(sessionDir, 'videos'),
        size: config.viewport || { width: 1920, height: 1080 },
      } : undefined,
    });

    // Create page
    const page = await context.newPage();

    const now = new Date().toISOString();
    const session: BrowserSession = {
      id: sessionId,
      state: 'active',
      config: {
        headless: config.headless ?? true,
        viewport: config.viewport || { width: 1920, height: 1080 },
        screenshotInterval: config.screenshotInterval ?? 0,
        userAgent: config.userAgent,
        recordVideo: config.recordVideo ?? false,
      },
      currentUrl: null,
      createdAt: now,
      lastActivityAt: now,
      screenshotCount: 0,
    };

    // Store session data
    const sessionData: SessionData = {
      session,
      context,
      page,
      screenshotsDir,
      screenshotIntervalId: null,
    };

    this.sessions.set(sessionId, sessionData);

    // Start screenshot interval if configured
    if (session.config.screenshotInterval && session.config.screenshotInterval > 0) {
      this.startScreenshotInterval(sessionId);
    }

    // Save session metadata
    await this.saveSessionMetadata(sessionId);

    console.log(`[BrowserSessionManager] Created session ${sessionId}`);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): BrowserSession | null {
    const sessionData = this.sessions.get(sessionId);
    return sessionData ? sessionData.session : null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values()).map(sd => sd.session);
  }

  /**
   * Navigate to URL
   */
  async navigate(
    sessionId: string,
    url: string,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load'
  ): Promise<void> {
    const sessionData = this.getSessionData(sessionId);

    await sessionData.page.goto(url, { waitUntil });

    sessionData.session.currentUrl = url;
    sessionData.session.lastActivityAt = new Date().toISOString();

    await this.saveSessionMetadata(sessionId);
  }

  /**
   * Capture screenshot
   */
  async captureScreenshot(
    sessionId: string,
    fullPage: boolean = false
  ): Promise<Screenshot> {
    const sessionData = this.getSessionData(sessionId);

    const screenshotId = this.generateScreenshotId();
    const filename = `${screenshotId}.png`;
    const filepath = path.join(sessionData.screenshotsDir, filename);

    await sessionData.page.screenshot({
      path: filepath,
      fullPage,
    });

    const viewport = sessionData.page.viewportSize() || { width: 1920, height: 1080 };

    const screenshot: Screenshot = {
      id: screenshotId,
      sessionId,
      timestamp: new Date().toISOString(),
      url: sessionData.session.currentUrl || '',
      filePath: filepath,
      width: viewport.width,
      height: viewport.height,
    };

    sessionData.session.screenshotCount++;
    sessionData.session.lastActivityAt = screenshot.timestamp;

    await this.saveSessionMetadata(sessionId);

    return screenshot;
  }

  /**
   * Click element
   */
  async click(
    sessionId: string,
    selector: string,
    button: 'left' | 'right' | 'middle' = 'left',
    clickCount: number = 1
  ): Promise<void> {
    const sessionData = this.getSessionData(sessionId);

    await sessionData.page.click(selector, { button, clickCount });

    sessionData.session.lastActivityAt = new Date().toISOString();
    await this.saveSessionMetadata(sessionId);
  }

  /**
   * Type text
   */
  async type(
    sessionId: string,
    selector: string,
    text: string,
    delay: number = 0
  ): Promise<void> {
    const sessionData = this.getSessionData(sessionId);

    await sessionData.page.type(selector, text, { delay });

    sessionData.session.lastActivityAt = new Date().toISOString();
    await this.saveSessionMetadata(sessionId);
  }

  /**
   * Take control of session
   */
  takeControl(sessionId: string, userId: string): void {
    const sessionData = this.getSessionData(sessionId);

    if (sessionData.session.controlledBy && sessionData.session.controlledBy !== userId) {
      throw new Error(`Session is controlled by user ${sessionData.session.controlledBy}`);
    }

    sessionData.session.controlledBy = userId;
  }

  /**
   * Release control of session
   */
  releaseControl(sessionId: string, userId: string): void {
    const sessionData = this.getSessionData(sessionId);

    if (sessionData.session.controlledBy !== userId) {
      throw new Error('You do not have control of this session');
    }

    sessionData.session.controlledBy = undefined;
  }

  /**
   * Close session
   */
  async closeSession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);

    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Stop screenshot interval
    if (sessionData.screenshotIntervalId) {
      clearInterval(sessionData.screenshotIntervalId);
    }

    // Close browser context
    await sessionData.context.close();

    // Update session state
    sessionData.session.state = 'closed';
    await this.saveSessionMetadata(sessionId);

    // Remove from active sessions
    this.sessions.delete(sessionId);

    console.log(`[BrowserSessionManager] Closed session ${sessionId}`);
  }

  /**
   * Get session data (throws if not found)
   */
  private getSessionData(sessionId: string): SessionData {
    const sessionData = this.sessions.get(sessionId);

    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (sessionData.session.state === 'closed') {
      throw new Error(`Session ${sessionId} is closed`);
    }

    return sessionData;
  }

  /**
   * Start screenshot interval
   */
  private startScreenshotInterval(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);

    if (!sessionData) return;

    const interval = sessionData.session.config.screenshotInterval;

    if (!interval || interval <= 0) return;

    sessionData.screenshotIntervalId = setInterval(async () => {
      try {
        await this.captureScreenshot(sessionId, false);
      } catch (error) {
        console.error(`[BrowserSessionManager] Screenshot interval error for session ${sessionId}:`, error);
      }
    }, interval);
  }

  /**
   * Save session metadata to disk
   */
  private async saveSessionMetadata(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);

    if (!sessionData) return;

    const metadataPath = path.join(this.dataDir, sessionId, 'metadata.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(sessionData.session, null, 2),
      'utf-8'
    );
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate unique screenshot ID
   */
  private generateScreenshotId(): string {
    return `screenshot_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Internal session data
 */
interface SessionData {
  session: BrowserSession;
  context: BrowserContext;
  page: Page;
  screenshotsDir: string;
  screenshotIntervalId: NodeJS.Timeout | null;
}
