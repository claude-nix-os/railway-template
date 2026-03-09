/**
 * Client-safe file utility functions.
 *
 * These helpers use only browser-compatible string operations (no Node.js
 * modules such as 'fs', 'path', or 'child_process').  They are safe to
 * import from any React client component.
 *
 * Server-only utilities (listDirectory, readFileContent, validatePath, etc.)
 * remain in file-utils.ts which must NOT be imported from client code.
 */

/* ------------------------------------------------------------------ */
/*  Pure-JS path helpers (replacements for Node path.extname/basename) */
/* ------------------------------------------------------------------ */

/** Return the file extension including the leading dot, e.g. ".ts" */
function extname(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  const dotIndex = base.lastIndexOf('.');
  if (dotIndex <= 0) return ''; // no dot, or dot at start (hidden file)
  return base.slice(dotIndex);
}

/** Return the last segment of a path, e.g. "foo.ts" from "/a/b/foo.ts" */
function basename(filepath: string): string {
  return filepath.split('/').pop() ?? filepath;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

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
