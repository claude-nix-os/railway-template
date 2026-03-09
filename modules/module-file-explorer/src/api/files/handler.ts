import { stat } from 'fs/promises';
import { resolve } from 'path';
import type { DirectoryResponse, FileResponse } from '../../types';
import { validatePath, listDirectory, readFileContent, isBinaryFile } from '../../lib/file-utils';

/** Default base path for file browsing */
const DEFAULT_BASE_PATH = '/data/workspace';

/**
 * Handle GET /api/files
 *
 * Query params:
 *   path    - Directory or file path to list/read
 *   content - If "true" and path is a file, return file content
 */
export async function handleFilesRoute(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const requestedPath = url.searchParams.get('path') ?? DEFAULT_BASE_PATH;
    const wantContent = url.searchParams.get('content') === 'true';

    // Validate path to prevent directory traversal
    const validatedPath = validatePath(requestedPath);
    if (!validatedPath) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if path exists
    let stats;
    try {
      stats = await stat(validatedPath);
    } catch {
      return new Response(JSON.stringify({ error: 'Path not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (stats.isDirectory()) {
      // Return directory listing
      const entries = await listDirectory(validatedPath);
      const response: DirectoryResponse = {
        type: 'directory',
        path: validatedPath,
        entries,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (stats.isFile()) {
      if (wantContent) {
        // Check if binary
        if (isBinaryFile(validatedPath)) {
          return new Response(JSON.stringify({
            error: 'Binary file - content reading not supported',
            type: 'file',
            path: validatedPath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          }), {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Return file content
        const { content, size, modified } = await readFileContent(validatedPath);
        const response: FileResponse = {
          type: 'file',
          path: validatedPath,
          content,
          size,
          modified,
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Return file metadata only
      const response: FileResponse = {
        type: 'file',
        path: validatedPath,
        content: '',
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported path type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('too large') ? 413 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
