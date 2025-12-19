/**
 * Files API Routes
 *
 * File operations with ETag-based conflict detection.
 */

import { Hono } from 'hono';
import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, stat, readdir, unlink, rename } from 'fs/promises';
import { join, dirname, relative, basename } from 'path';
import { existsSync } from 'fs';

const filesRoutes = new Hono();

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate ETag from file content
 */
function generateETag(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * Check if path is within allowed directories
 */
function isPathAllowed(projectRoot: string, filePath: string): boolean {
  const absolutePath = join(projectRoot, filePath);
  const normalizedPath = absolutePath.replace(/\\/g, '/');

  // Allow .yoyo-dev directory
  if (normalizedPath.includes('/.yoyo-dev/')) {
    return true;
  }

  // Allow .yoyo-ai directory
  if (normalizedPath.includes('/.yoyo-ai/')) {
    return true;
  }

  return false;
}

/**
 * Get file stats with error handling
 */
async function getFileStats(filePath: string) {
  try {
    const stats = await stat(filePath);
    return stats;
  } catch {
    return null;
  }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/files - List files in a directory
 */
filesRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();
  const dirPath = c.req.query('path') || '.yoyo-dev';
  const recursive = c.req.query('recursive') === 'true';

  if (!isPathAllowed(projectRoot, dirPath)) {
    return c.json({ error: true, code: 'ACCESS_DENIED', message: 'Path not allowed' }, 403);
  }

  const absolutePath = join(projectRoot, dirPath);

  if (!existsSync(absolutePath)) {
    return c.json({ error: true, code: 'FILE_NOT_FOUND', message: 'Directory not found' }, 404);
  }

  try {
    const entries = await readdir(absolutePath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(absolutePath, entry.name);
        const relativePath = join(dirPath, entry.name);
        const stats = await getFileStats(entryPath);

        return {
          name: entry.name,
          path: relativePath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats?.size || 0,
          modified: stats?.mtime.toISOString() || null,
        };
      })
    );

    return c.json({ files });
  } catch (err) {
    console.error('[Files] Error listing directory:', err);
    return c.json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to list directory' }, 500);
  }
});

/**
 * GET /api/files/:path - Read file content
 */
filesRoutes.get('/:path{.+}', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();
  const filePath = c.req.param('path');

  if (!isPathAllowed(projectRoot, filePath)) {
    return c.json({ error: true, code: 'ACCESS_DENIED', message: 'Path not allowed' }, 403);
  }

  const absolutePath = join(projectRoot, filePath);

  if (!existsSync(absolutePath)) {
    return c.json({ error: true, code: 'FILE_NOT_FOUND', message: 'File not found', path: filePath }, 404);
  }

  try {
    const content = await readFile(absolutePath, 'utf-8');
    const stats = await stat(absolutePath);
    const etag = generateETag(content);

    // Set headers for caching and conflict detection
    c.header('ETag', etag);
    c.header('Last-Modified', stats.mtime.toUTCString());

    return c.json({
      content,
      path: filePath,
      modified: stats.mtime.toISOString(),
      etag,
    });
  } catch (err) {
    console.error('[Files] Error reading file:', err);
    return c.json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to read file' }, 500);
  }
});

/**
 * PUT /api/files/:path - Update file content
 */
filesRoutes.put('/:path{.+}', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();
  const filePath = c.req.param('path');

  if (!isPathAllowed(projectRoot, filePath)) {
    return c.json({ error: true, code: 'ACCESS_DENIED', message: 'Path not allowed' }, 403);
  }

  const absolutePath = join(projectRoot, filePath);

  // Check If-Match header for conflict detection
  const ifMatch = c.req.header('If-Match');

  try {
    const body = await c.req.json<{ content: string }>();
    const { content } = body;

    if (typeof content !== 'string') {
      return c.json({ error: true, code: 'VALIDATION_ERROR', message: 'Content is required' }, 400);
    }

    // If file exists, check for conflicts
    if (existsSync(absolutePath) && ifMatch) {
      const existingContent = await readFile(absolutePath, 'utf-8');
      const existingETag = generateETag(existingContent);

      if (ifMatch !== existingETag) {
        return c.json({
          error: true,
          code: 'CONFLICT',
          message: 'File has been modified by another process',
          currentETag: existingETag,
          providedETag: ifMatch,
        }, 409);
      }
    }

    // Write the file
    await writeFile(absolutePath, content, 'utf-8');

    const stats = await stat(absolutePath);
    const newETag = generateETag(content);

    return c.json({
      success: true,
      path: filePath,
      modified: stats.mtime.toISOString(),
      etag: newETag,
    });
  } catch (err) {
    console.error('[Files] Error writing file:', err);
    return c.json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to write file' }, 500);
  }
});

/**
 * POST /api/files - Create new file
 */
filesRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();

  try {
    const body = await c.req.json<{ path: string; content: string; createDirectories?: boolean }>();
    const { path: filePath, content, createDirectories = true } = body;

    if (!filePath || typeof content !== 'string') {
      return c.json({ error: true, code: 'VALIDATION_ERROR', message: 'Path and content are required' }, 400);
    }

    if (!isPathAllowed(projectRoot, filePath)) {
      return c.json({ error: true, code: 'ACCESS_DENIED', message: 'Path not allowed' }, 403);
    }

    const absolutePath = join(projectRoot, filePath);

    // Check if file already exists
    if (existsSync(absolutePath)) {
      return c.json({ error: true, code: 'CONFLICT', message: 'File already exists', path: filePath }, 409);
    }

    // Create directories if needed
    if (createDirectories) {
      const dir = dirname(absolutePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }

    // Write the file
    await writeFile(absolutePath, content, 'utf-8');

    const stats = await stat(absolutePath);

    return c.json({
      success: true,
      path: filePath,
      created: stats.mtime.toISOString(),
    }, 201);
  } catch (err) {
    console.error('[Files] Error creating file:', err);
    return c.json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to create file' }, 500);
  }
});

/**
 * DELETE /api/files/:path - Delete file (soft delete to .trash)
 */
filesRoutes.delete('/:path{.+}', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();
  const filePath = c.req.param('path');
  const permanent = c.req.query('permanent') === 'true';

  if (!isPathAllowed(projectRoot, filePath)) {
    return c.json({ error: true, code: 'ACCESS_DENIED', message: 'Path not allowed' }, 403);
  }

  const absolutePath = join(projectRoot, filePath);

  if (!existsSync(absolutePath)) {
    return c.json({ error: true, code: 'FILE_NOT_FOUND', message: 'File not found', path: filePath }, 404);
  }

  try {
    if (permanent) {
      // Permanent delete
      await unlink(absolutePath);
      return c.json({ success: true, path: filePath, permanent: true });
    }

    // Soft delete: move to .trash
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const trashDir = join(projectRoot, '.yoyo-dev', '.trash', timestamp);
    const trashPath = join(trashDir, basename(filePath));

    await mkdir(trashDir, { recursive: true });
    await rename(absolutePath, trashPath);

    const relativeTrashedPath = relative(projectRoot, trashPath);

    return c.json({
      success: true,
      path: filePath,
      trashedTo: relativeTrashedPath,
    });
  } catch (err) {
    console.error('[Files] Error deleting file:', err);
    return c.json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to delete file' }, 500);
  }
});

export { filesRoutes };
