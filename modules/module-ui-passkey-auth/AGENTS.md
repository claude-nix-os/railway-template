# ClaudeOS Passkey Auth Module

This module adds WebAuthn passkey authentication to ClaudeOS.

## Architecture

- **WebAuthn**: Uses @simplewebauthn/server and @simplewebauthn/browser for the full FIDO2/WebAuthn ceremony
- **Storage**: Credentials, challenges, and setup tokens stored as JSON in /data/
- **Auth**: JWT tokens issued on successful passkey authentication using jose
- **UI**: React components for login and settings integration

## Key Patterns

- API route handlers follow Next.js App Router conventions (NextRequest/NextResponse)
- Challenges are one-time use and expire after 5 minutes
- Setup tokens allow registering passkeys from remote devices
- All management endpoints require Bearer JWT authentication
- Credential counter is updated on each authentication to prevent replay attacks

## Data Files

- `/data/passkeys.json` - Stored credentials (id, publicKey, counter, label)
- `/data/passkeys_challenges.json` - Temporary WebAuthn challenges
- `/data/passkeys_setup_tokens.json` - One-time setup tokens

## Testing

- Vitest with jsdom environment
- Tests located in `__tests__/` mirroring `src/` structure
- @simplewebauthn/server is mocked in API tests
- Lib helpers tested with real filesystem (temp directory)

## Environment Variables

- `CLAUDEOS_DATA_DIR` - Data directory path (default: /data)
- `CLAUDEOS_JWT_SECRET` - JWT signing secret (required in production)
