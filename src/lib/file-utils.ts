import { readdir, stat, readFile } from 'fs/promises';
import { join, resolve, extname, basename } from 'path';
import type { DirectoryEntry } from '../types';

/** Maximum file size for content reading (1MB) */
export const MAX_FILE_SIZE = 1024 * 1024;

/** File patterns that should be excluded from listings */
const EXCLUDED_PATTERNS = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.staging',
  'credentials.json',
  'serviceAccountKey.json',
  '.git',
  'node_modules',
];

/** Check if a filename should be excluded */
export function isExcluded(name: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => {
    if (pattern.startsWith('.')) {
      return name === pattern || name.startsWith(pattern + '.');
    }
    return name === pattern;
  });
}

/**
 * Validate and normalize a file path to prevent directory traversal.
 * Returns the resolved absolute path or null if invalid.
 */
export function validatePath(requestedPath: string, basePath: string = '/'): string | null {
  const resolved = resolve(basePath, requestedPath);

  // Ensure the resolved path is within the base path
  if (!resolved.startsWith(resolve(basePath))) {
    return null;
  }

  return resolved;
}

/**
 * Get the file icon identifier based on file extension.
 */
export function getFileIcon(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const name = basename(filename).toLowerCase();

  // Special filenames
  const nameMap: Record<string, string> = {
    'package.json': 'nodejs',
    'tsconfig.json': 'typescript',
    'dockerfile': 'docker',
    'docker-compose.yml': 'docker',
    'docker-compose.yaml': 'docker',
    '.gitignore': 'git',
    'readme.md': 'markdown',
    'license': 'certificate',
    'makefile': 'settings',
  };

  if (nameMap[name]) return nameMap[name];

  // Extension mapping
  const extMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'react',
    '.js': 'javascript',
    '.jsx': 'react',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.scss': 'sass',
    '.html': 'html',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'header',
    '.sh': 'terminal',
    '.bash': 'terminal',
    '.zsh': 'terminal',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.toml': 'settings',
    '.sql': 'database',
    '.graphql': 'graphql',
    '.svg': 'image',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.ico': 'image',
    '.txt': 'text',
    '.log': 'text',
    '.env': 'settings',
    '.lock': 'lock',
    '.nix': 'nix',
  };

  return extMap[ext] ?? 'file';
}

/**
 * List entries in a directory, excluding sensitive/hidden files.
 */
export async function listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const results: DirectoryEntry[] = [];

  for (const entry of entries) {
    if (isExcluded(entry.name)) continue;

    try {
      const fullPath = join(dirPath, entry.name);
      const stats = await stat(fullPath);

      let type: DirectoryEntry['type'] = 'file';
      if (entry.isDirectory()) type = 'directory';
      else if (entry.isSymbolicLink()) type = 'symlink';

      results.push({
        name: entry.name,
        type,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      });
    } catch {
      // Skip entries we cannot stat (permission errors, broken symlinks)
      continue;
    }
  }

  // Sort: directories first, then alphabetically
  results.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Read file content with size limit.
 */
export async function readFileContent(filePath: string): Promise<{ content: string; size: number; modified: string }> {
  const stats = await stat(filePath);

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${stats.size} bytes (max ${MAX_FILE_SIZE} bytes)`);
  }

  const content = await readFile(filePath, 'utf-8');

  return {
    content,
    size: stats.size,
    modified: stats.mtime.toISOString(),
  };
}

/**
 * Detect if a file is likely binary based on extension.
 */
export function isBinaryFile(filename: string): boolean {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.sqlite', '.db',
  ]);

  return binaryExtensions.has(extname(filename).toLowerCase());
}

/**
 * Get the language identifier for syntax highlighting.
 */
export function getLanguage(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.scss': 'scss',
    '.html': 'html',
    '.xml': 'xml',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.toml': 'toml',
    '.sql': 'sql',
    '.graphql': 'graphql',
    '.nix': 'nix',
    '.dockerfile': 'dockerfile',
    '.txt': 'text',
    '.log': 'text',
  };

  const name = basename(filename).toLowerCase();
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile') return 'makefile';

  return langMap[ext] ?? 'text';
}
