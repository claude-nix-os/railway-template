#!/usr/bin/env ts-node

/**
 * CLI utility for testing the browser module
 *
 * Usage:
 *   ts-node scripts/test-browser.ts create
 *   ts-node scripts/test-browser.ts navigate <sessionId> <url>
 *   ts-node scripts/test-browser.ts screenshot <sessionId>
 *   ts-node scripts/test-browser.ts list
 *   ts-node scripts/test-browser.ts close <sessionId>
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api/browser';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'test-token';

async function request(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<any> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Request failed: ${response.status} ${error}`);
  }

  return await response.json();
}

async function createSession() {
  console.log('Creating browser session...');
  const result = await request('/sessions', 'POST', {
    config: {
      headless: true,
      viewport: { width: 1920, height: 1080 },
      screenshotInterval: 0,
    },
  });

  console.log('Session created:');
  console.log(JSON.stringify(result.session, null, 2));
  console.log(`\nSession ID: ${result.session.id}`);
}

async function listSessions() {
  console.log('Listing browser sessions...');
  const result = await request('/sessions');

  console.log(`Found ${result.sessions.length} sessions:\n`);
  for (const session of result.sessions) {
    console.log(`ID: ${session.id}`);
    console.log(`State: ${session.state}`);
    console.log(`URL: ${session.currentUrl || 'None'}`);
    console.log(`Screenshots: ${session.screenshotCount}`);
    console.log('---');
  }
}

async function navigateSession(sessionId: string, url: string) {
  console.log(`Navigating session ${sessionId} to ${url}...`);
  const result = await request(`/sessions/${sessionId}/navigate`, 'POST', {
    url,
    waitUntil: 'networkidle',
  });

  console.log('Navigation complete:');
  console.log(JSON.stringify(result, null, 2));
}

async function captureScreenshot(sessionId: string) {
  console.log(`Capturing screenshot for session ${sessionId}...`);
  const result = await request(`/sessions/${sessionId}/screenshot`, 'POST', {
    fullPage: true,
  });

  console.log('Screenshot captured:');
  console.log(JSON.stringify(result.screenshot, null, 2));
  console.log(`\nScreenshot saved to: ${result.screenshot.filePath}`);
}

async function closeSession(sessionId: string) {
  console.log(`Closing session ${sessionId}...`);
  const result = await request(`/sessions/${sessionId}`, 'DELETE');

  console.log('Session closed:');
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'create':
        await createSession();
        break;

      case 'list':
        await listSessions();
        break;

      case 'navigate':
        if (args.length < 2) {
          console.error('Usage: navigate <sessionId> <url>');
          process.exit(1);
        }
        await navigateSession(args[0], args[1]);
        break;

      case 'screenshot':
        if (args.length < 1) {
          console.error('Usage: screenshot <sessionId>');
          process.exit(1);
        }
        await captureScreenshot(args[0]);
        break;

      case 'close':
        if (args.length < 1) {
          console.error('Usage: close <sessionId>');
          process.exit(1);
        }
        await closeSession(args[0]);
        break;

      default:
        console.error('Unknown command:', command);
        console.error('\nAvailable commands:');
        console.error('  create');
        console.error('  list');
        console.error('  navigate <sessionId> <url>');
        console.error('  screenshot <sessionId>');
        console.error('  close <sessionId>');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
