import { exec } from 'child_process';
import { promisify } from 'util';
import type { DiffResponse, DiffFile, DiffHunk, DiffLine, GitStatusResponse, GitStatusEntry } from '../../types';

const execAsync = promisify(exec);

/** Default workspace path for git operations */
const DEFAULT_WORKSPACE = '/data/workspace';

/**
 * Execute a git command in the workspace directory.
 */
async function gitExec(command: string, cwd: string = DEFAULT_WORKSPACE): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${command}`, {
      cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      timeout: 30000,
    });
    return stdout;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'stdout' in error) {
      // Git may return non-zero exit code for empty diffs
      return (error as { stdout: string }).stdout ?? '';
    }
    throw error;
  }
}

/**
 * Parse git diff output into structured format.
 */
function parseDiff(rawDiff: string): DiffResponse {
  const files: DiffFile[] = [];
  const hunks: Record<string, DiffHunk[]> = {};
  let totalAdditions = 0;
  let totalDeletions = 0;

  if (!rawDiff.trim()) {
    return { files, hunks, summary: { totalAdditions: 0, totalDeletions: 0, filesChanged: 0 } };
  }

  // Split into file sections
  const fileSections = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split('\n');
    if (lines.length === 0) continue;

    // Parse file path from the first line: "a/path b/path"
    const headerMatch = lines[0].match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const filePath = headerMatch[2];
    let fileAdditions = 0;
    let fileDeletions = 0;

    // Determine file status
    let status: DiffFile['status'] = 'modified';
    if (section.includes('new file mode')) status = 'added';
    else if (section.includes('deleted file mode')) status = 'deleted';
    else if (section.includes('rename from')) status = 'renamed';

    // Parse hunks
    const fileHunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLine = 0;
    let newLine = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Hunk header: @@ -old,count +new,count @@
      const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      if (hunkMatch) {
        if (currentHunk) fileHunks.push(currentHunk);
        oldLine = parseInt(hunkMatch[1], 10);
        newLine = parseInt(hunkMatch[2], 10);
        currentHunk = {
          header: line,
          lines: [],
        };
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'addition',
          content: line.substring(1),
          oldLineNumber: null,
          newLineNumber: newLine++,
        });
        fileAdditions++;
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'deletion',
          content: line.substring(1),
          oldLineNumber: oldLine++,
          newLineNumber: null,
        });
        fileDeletions++;
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }

    if (currentHunk) fileHunks.push(currentHunk);

    files.push({
      path: filePath,
      status,
      additions: fileAdditions,
      deletions: fileDeletions,
    });

    hunks[filePath] = fileHunks;
    totalAdditions += fileAdditions;
    totalDeletions += fileDeletions;
  }

  return {
    files,
    hunks,
    summary: {
      totalAdditions,
      totalDeletions,
      filesChanged: files.length,
    },
  };
}

/**
 * Parse git status output into structured format.
 */
function parseGitStatus(rawStatus: string, branchOutput: string): GitStatusResponse {
  const entries: GitStatusEntry[] = [];
  const lines = rawStatus.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    if (line.length < 4) continue;

    const indexStatus = line[0];
    const workTreeStatus = line[1];
    const path = line.substring(3).trim();

    let status: GitStatusEntry['status'] = 'modified';
    let staged = false;

    // Index status (staged)
    if (indexStatus === 'A') { status = 'added'; staged = true; }
    else if (indexStatus === 'M') { status = 'modified'; staged = true; }
    else if (indexStatus === 'D') { status = 'deleted'; staged = true; }
    else if (indexStatus === 'R') { status = 'renamed'; staged = true; }

    // Working tree status (unstaged)
    if (workTreeStatus === 'M') { status = 'modified'; staged = false; }
    else if (workTreeStatus === 'D') { status = 'deleted'; staged = false; }

    // Untracked
    if (indexStatus === '?' && workTreeStatus === '?') {
      status = 'untracked';
      staged = false;
    }

    entries.push({ path, status, staged });
  }

  // Parse branch name
  const branchMatch = branchOutput.trim().match(/^(?:ref: refs\/heads\/|)(.+)/);
  const branch = branchMatch?.[1] ?? 'unknown';

  return {
    entries,
    branch,
    clean: entries.length === 0,
  };
}

/**
 * Handle GET /api/workspace
 *
 * Query params:
 *   action - "diff" for git diff, "status" for git status
 *   path   - Workspace path (defaults to /data/workspace)
 */
export async function handleWorkspaceRoute(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') ?? 'status';
    const workspacePath = url.searchParams.get('path') ?? DEFAULT_WORKSPACE;

    switch (action) {
      case 'diff': {
        const rawDiff = await gitExec('diff HEAD', workspacePath);
        const result = parseDiff(rawDiff);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        const [rawStatus, branchOutput] = await Promise.all([
          gitExec('status --porcelain', workspacePath),
          gitExec('rev-parse --abbrev-ref HEAD', workspacePath),
        ]);
        const result = parseGitStatus(rawStatus, branchOutput);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
