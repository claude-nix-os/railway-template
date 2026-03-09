import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  StoredCredential,
  PasskeysStore,
  ChallengesStore,
  ChallengeEntry,
  SetupToken,
  SetupTokensStore,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DATA_DIR = process.env.CLAUDEOS_DATA_DIR || '/data';
const PASSKEYS_FILE = path.join(DATA_DIR, 'passkeys.json');
const CHALLENGES_FILE = path.join(DATA_DIR, 'passkeys_challenges.json');
const SETUP_TOKENS_FILE = path.join(DATA_DIR, 'passkeys_setup_tokens.json');

/** How long a challenge remains valid (5 minutes) */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** How long a setup token remains valid (5 minutes) */
const SETUP_TOKEN_TTL_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  File I/O Helpers                                                   */
/* ------------------------------------------------------------------ */

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  Credential Management                                              */
/* ------------------------------------------------------------------ */

export function loadCredentials(): StoredCredential[] {
  const store = readJsonFile<PasskeysStore>(PASSKEYS_FILE, { credentials: [] });
  return store.credentials;
}

export function saveCredentials(credentials: StoredCredential[]): void {
  const store: PasskeysStore = { credentials };
  writeJsonFile(PASSKEYS_FILE, store);
}

export function addCredential(credential: StoredCredential): void {
  const credentials = loadCredentials();
  credentials.push(credential);
  saveCredentials(credentials);
}

export function findCredentialById(id: string): StoredCredential | undefined {
  const credentials = loadCredentials();
  return credentials.find((c) => c.id === id);
}

export function updateCredentialCounter(id: string, newCounter: number): void {
  const credentials = loadCredentials();
  const index = credentials.findIndex((c) => c.id === id);
  if (index !== -1) {
    credentials[index].counter = newCounter;
    saveCredentials(credentials);
  }
}

export function deleteCredential(id: string): boolean {
  const credentials = loadCredentials();
  const filtered = credentials.filter((c) => c.id !== id);
  if (filtered.length === credentials.length) {
    return false;
  }
  saveCredentials(filtered);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Challenge Management                                               */
/* ------------------------------------------------------------------ */

export function loadChallenges(): ChallengesStore {
  return readJsonFile<ChallengesStore>(CHALLENGES_FILE, { challenges: {} });
}

function saveChallenges(store: ChallengesStore): void {
  writeJsonFile(CHALLENGES_FILE, store);
}

/**
 * Store a challenge with an auto-generated key.
 * Returns the key for later retrieval.
 */
export function storeChallenge(
  challenge: string,
  type: 'registration' | 'authentication',
  userId?: string,
): string {
  const store = loadChallenges();
  const key = crypto.randomUUID();
  const now = new Date();

  store.challenges[key] = {
    challenge,
    userId,
    type,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString(),
  };

  // Purge expired challenges
  purgeExpiredChallenges(store);
  saveChallenges(store);

  return key;
}

/**
 * Retrieve and consume a challenge (one-time use).
 * Returns the challenge entry if found and not expired, otherwise undefined.
 */
export function consumeChallenge(key: string): ChallengeEntry | undefined {
  const store = loadChallenges();
  const entry = store.challenges[key];

  if (!entry) {
    return undefined;
  }

  // Check expiration
  if (new Date(entry.expiresAt) < new Date()) {
    delete store.challenges[key];
    saveChallenges(store);
    return undefined;
  }

  // Consume (delete) the challenge
  delete store.challenges[key];
  saveChallenges(store);

  return entry;
}

/**
 * Find and consume a challenge by its actual challenge value.
 */
export function consumeChallengeByValue(
  challengeValue: string,
  type: 'registration' | 'authentication',
): ChallengeEntry | undefined {
  const store = loadChallenges();
  const now = new Date();

  for (const [key, entry] of Object.entries(store.challenges)) {
    if (entry.challenge === challengeValue && entry.type === type) {
      if (new Date(entry.expiresAt) < now) {
        delete store.challenges[key];
        saveChallenges(store);
        return undefined;
      }
      delete store.challenges[key];
      saveChallenges(store);
      return entry;
    }
  }

  return undefined;
}

function purgeExpiredChallenges(store: ChallengesStore): void {
  const now = new Date();
  for (const [key, entry] of Object.entries(store.challenges)) {
    if (new Date(entry.expiresAt) < now) {
      delete store.challenges[key];
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Setup Token Management                                             */
/* ------------------------------------------------------------------ */

export function loadSetupTokens(): SetupToken[] {
  const store = readJsonFile<SetupTokensStore>(SETUP_TOKENS_FILE, { tokens: [] });
  return store.tokens;
}

function saveSetupTokens(tokens: SetupToken[]): void {
  const store: SetupTokensStore = { tokens };
  writeJsonFile(SETUP_TOKENS_FILE, store);
}

export function createSetupToken(): SetupToken {
  const tokens = loadSetupTokens();
  const now = new Date();

  // Purge expired and used tokens
  const active = tokens.filter(
    (t) => !t.used && new Date(t.expiresAt) > now,
  );

  const token: SetupToken = {
    token: crypto.randomUUID(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SETUP_TOKEN_TTL_MS).toISOString(),
    used: false,
  };

  active.push(token);
  saveSetupTokens(active);

  return token;
}

export function validateSetupToken(tokenValue: string): boolean {
  const tokens = loadSetupTokens();
  const now = new Date();

  const token = tokens.find(
    (t) => t.token === tokenValue && !t.used && new Date(t.expiresAt) > now,
  );

  if (!token) {
    return false;
  }

  // Mark as used
  token.used = true;
  saveSetupTokens(tokens);

  return true;
}

/* ------------------------------------------------------------------ */
/*  JWT Helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Get the JWT secret from environment or generate a deterministic one.
 * In production, CLAUDEOS_JWT_SECRET should be set.
 */
export function getJwtSecret(): string {
  return process.env.CLAUDEOS_JWT_SECRET || 'claudeos-dev-secret-change-me';
}

/**
 * Create a JWT token. Uses the jose library if available in the kernel,
 * otherwise falls back to a simple implementation.
 */
export async function createJWT(payload: Record<string, unknown>): Promise<string> {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(getJwtSecret());

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .setIssuer('claudeos')
    .setSubject('passkey-auth')
    .sign(secret);

  return jwt;
}

/**
 * Verify a JWT token and return its payload.
 */
export async function verifyJWT(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(getJwtSecret());

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'claudeos',
      subject: 'passkey-auth',
    });

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from an Authorization header value.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

/**
 * Get the relying party ID from hostname.
 * Defaults to 'localhost' for development.
 */
export function getRpId(request: Request): string {
  const url = new URL(request.url);
  return url.hostname;
}

/**
 * Get the expected origin from a request.
 */
export function getExpectedOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

/**
 * Convert a Uint8Array to base64url string.
 */
export function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return Buffer.from(arr).toString('base64url');
}

/**
 * Convert a base64url string to Uint8Array.
 */
export function base64UrlToUint8Array(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64url'));
}
