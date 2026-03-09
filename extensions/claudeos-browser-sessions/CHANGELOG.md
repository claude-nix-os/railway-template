# Changelog

All notable changes to the ClaudeOS Browser Sessions extension will be documented in this file.

## [1.0.0] - 2026-03-09

### Added
- Initial release of ClaudeOS Browser Sessions extension
- Grid view for displaying all browser sessions as thumbnails
- Detail view with large screenshot canvas and timeline
- Live screenshot updates via WebSocket
- Session control (take control / hand off control)
- Timeline scrubber with playback controls
- Color-coded action markers (navigate, click, type, screenshot)
- Session creation and deletion
- URL navigation
- Session export to JSON
- Auto-refresh configuration
- WebSocket auto-reconnect
- VS Code theme-aware styling
- Status bar integration
- Command palette integration

### Features
- Real-time browser session monitoring
- Interactive timeline with frame scrubbing
- Playback mode for reviewing session history
- Visual session state indicators (active/idle/closed)
- Control status tracking
- Connection status monitoring
- Screenshot caching and display

### Technical
- WebviewViewProvider implementation
- HTTP REST API client
- WebSocket client with reconnection logic
- Vanilla TypeScript webview (no React)
- esbuild bundling
- CSP-compliant with nonce-based scripts
- TypeScript strict mode
- Proper cleanup and disposal
