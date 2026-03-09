# Changelog

All notable changes to the ClaudeOS Browser Module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-03-09

### Added
- Initial release of Browser Module
- BrowserSessionManager service for managing Playwright browser sessions
- Support for creating multiple concurrent browser sessions
- Headless and headed browser modes
- Configurable viewport sizes
- Automatic screenshot capture at configurable intervals
- Screenshot storage to `/data/browser-sessions/{sessionId}/screenshots/`
- Session state tracking (active, idle, closed)
- Multi-user session control with locking mechanism
- REST API endpoints:
  - POST `/api/browser/sessions` - Create new session
  - GET `/api/browser/sessions` - List all sessions
  - GET `/api/browser/sessions/{id}` - Get session details
  - POST `/api/browser/sessions/{id}/navigate` - Navigate to URL
  - POST `/api/browser/sessions/{id}/screenshot` - Capture screenshot
  - POST `/api/browser/sessions/{id}/click` - Click element
  - POST `/api/browser/sessions/{id}/type` - Type text
  - POST `/api/browser/sessions/{id}/control` - Take/release control
  - DELETE `/api/browser/sessions/{id}` - Close session
- WebSocket handlers:
  - `browser:screenshot` - Stream screenshot updates
  - `browser:interaction` - Stream interaction events
- React hooks for client-side usage (`useBrowser`)
- Optional React component for session management (`BrowserSessions`)
- TypeScript type definitions for all APIs
- Comprehensive test suite
- CLI utility for testing (`scripts/test-browser.ts`)
- Documentation:
  - README with API documentation
  - EXAMPLES with usage patterns
  - AGENTS guide for AI agents
- Dependencies:
  - playwright ^1.41.0
  - playwright-extra ^4.3.6
  - puppeteer-extra-plugin-stealth ^2.11.2

### Features
- Session persistence with metadata storage
- Bearer token authentication on all routes
- Error handling and logging
- Graceful cleanup on module unload
- Support for video recording (optional)
- Custom user agent configuration
- Flexible wait conditions (load, domcontentloaded, networkidle)

### Development
- TypeScript configuration
- Vitest test setup
- ESLint ready (if configured)
- MIT License
