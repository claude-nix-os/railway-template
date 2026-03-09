import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isExcluded,
  validatePath,
  getFileIcon,
  isBinaryFile,
  getLanguage,
  MAX_FILE_SIZE,
} from '../../src/lib/file-utils';

describe('File Utils', () => {
  describe('isExcluded', () => {
    it('excludes .env files', () => {
      expect(isExcluded('.env')).toBe(true);
      expect(isExcluded('.env.local')).toBe(true);
      expect(isExcluded('.env.production')).toBe(true);
    });

    it('excludes node_modules', () => {
      expect(isExcluded('node_modules')).toBe(true);
    });

    it('excludes .git', () => {
      expect(isExcluded('.git')).toBe(true);
    });

    it('excludes credentials files', () => {
      expect(isExcluded('credentials.json')).toBe(true);
      expect(isExcluded('serviceAccountKey.json')).toBe(true);
    });

    it('does not exclude normal files', () => {
      expect(isExcluded('index.ts')).toBe(false);
      expect(isExcluded('package.json')).toBe(false);
      expect(isExcluded('README.md')).toBe(false);
      expect(isExcluded('src')).toBe(false);
    });
  });

  describe('validatePath', () => {
    it('accepts valid absolute paths', () => {
      expect(validatePath('/data/workspace')).toBe('/data/workspace');
      expect(validatePath('/data/workspace/src/index.ts')).toBe('/data/workspace/src/index.ts');
    });

    it('resolves relative paths against base', () => {
      const result = validatePath('src/index.ts', '/data/workspace');
      expect(result).toBe('/data/workspace/src/index.ts');
    });

    it('rejects directory traversal attempts', () => {
      expect(validatePath('../../etc/passwd', '/data/workspace')).toBeNull();
      expect(validatePath('/data/workspace/../../etc/shadow', '/data/workspace')).toBeNull();
    });

    it('normalizes paths', () => {
      const result = validatePath('/data/workspace/./src/../src/index.ts');
      expect(result).toBe('/data/workspace/src/index.ts');
    });
  });

  describe('getFileIcon', () => {
    it('returns typescript for .ts files', () => {
      expect(getFileIcon('index.ts')).toBe('typescript');
    });

    it('returns react for .tsx files', () => {
      expect(getFileIcon('Component.tsx')).toBe('react');
    });

    it('returns javascript for .js files', () => {
      expect(getFileIcon('app.js')).toBe('javascript');
    });

    it('returns json for .json files', () => {
      expect(getFileIcon('data.json')).toBe('json');
    });

    it('returns markdown for .md files', () => {
      expect(getFileIcon('README.md')).toBe('markdown');
    });

    it('returns docker for Dockerfile', () => {
      expect(getFileIcon('Dockerfile')).toBe('docker');
    });

    it('returns nodejs for package.json', () => {
      expect(getFileIcon('package.json')).toBe('nodejs');
    });

    it('returns file for unknown extensions', () => {
      expect(getFileIcon('data.xyz')).toBe('file');
    });

    it('returns terminal for shell scripts', () => {
      expect(getFileIcon('script.sh')).toBe('terminal');
      expect(getFileIcon('setup.bash')).toBe('terminal');
    });

    it('returns image for image files', () => {
      expect(getFileIcon('photo.png')).toBe('image');
      expect(getFileIcon('logo.svg')).toBe('image');
    });
  });

  describe('isBinaryFile', () => {
    it('identifies binary image files', () => {
      expect(isBinaryFile('photo.png')).toBe(true);
      expect(isBinaryFile('image.jpg')).toBe(true);
      expect(isBinaryFile('logo.gif')).toBe(true);
    });

    it('identifies binary archive files', () => {
      expect(isBinaryFile('archive.zip')).toBe(true);
      expect(isBinaryFile('bundle.tar')).toBe(true);
    });

    it('identifies executable files', () => {
      expect(isBinaryFile('program.exe')).toBe(true);
      expect(isBinaryFile('library.dll')).toBe(true);
    });

    it('does not flag text files as binary', () => {
      expect(isBinaryFile('index.ts')).toBe(false);
      expect(isBinaryFile('README.md')).toBe(false);
      expect(isBinaryFile('package.json')).toBe(false);
      expect(isBinaryFile('styles.css')).toBe(false);
    });

    it('identifies font files as binary', () => {
      expect(isBinaryFile('font.woff2')).toBe(true);
      expect(isBinaryFile('icons.ttf')).toBe(true);
    });
  });

  describe('getLanguage', () => {
    it('returns typescript for .ts files', () => {
      expect(getLanguage('index.ts')).toBe('typescript');
    });

    it('returns tsx for .tsx files', () => {
      expect(getLanguage('Component.tsx')).toBe('tsx');
    });

    it('returns javascript for .js files', () => {
      expect(getLanguage('app.js')).toBe('javascript');
    });

    it('returns json for .json files', () => {
      expect(getLanguage('data.json')).toBe('json');
    });

    it('returns python for .py files', () => {
      expect(getLanguage('script.py')).toBe('python');
    });

    it('returns bash for .sh files', () => {
      expect(getLanguage('deploy.sh')).toBe('bash');
    });

    it('returns yaml for .yml files', () => {
      expect(getLanguage('config.yml')).toBe('yaml');
    });

    it('returns dockerfile for Dockerfile', () => {
      expect(getLanguage('Dockerfile')).toBe('dockerfile');
    });

    it('returns makefile for Makefile', () => {
      expect(getLanguage('Makefile')).toBe('makefile');
    });

    it('returns text for unknown extensions', () => {
      expect(getLanguage('file.xyz')).toBe('text');
    });
  });

  describe('MAX_FILE_SIZE', () => {
    it('is 1MB', () => {
      expect(MAX_FILE_SIZE).toBe(1024 * 1024);
    });
  });
});
