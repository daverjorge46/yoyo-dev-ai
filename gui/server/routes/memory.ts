/**
 * Memory API Routes
 *
 * Provides access to memory blocks stored in SQLite.
 */

import { Hono } from 'hono';
import { existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import type { Variables } from '../types.js';

export const memoryRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface MemoryBlock {
  id: string;
  type: 'persona' | 'project' | 'user' | 'corrections';
  scope: 'global' | 'project';
  content: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getMemoryDbPath(projectRoot: string): string {
  return join(projectRoot, '.yoyo-ai', 'memory', 'memory.db');
}

function getDatabase(projectRoot: string): Database.Database | null {
  const dbPath = getMemoryDbPath(projectRoot);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

function rowToBlock(row: {
  id: string;
  type: string;
  scope: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}): MemoryBlock {
  return {
    id: row.id,
    type: row.type as MemoryBlock['type'],
    scope: row.scope as MemoryBlock['scope'],
    content: JSON.parse(row.content),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/memory - List all memory blocks
memoryRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const db = getDatabase(projectRoot);

  if (!db) {
    return c.json({
      initialized: false,
      blocks: [],
      message: 'Memory system not initialized',
    });
  }

  try {
    const rows = db.prepare(`
      SELECT id, type, scope, content, version, created_at, updated_at
      FROM memory_blocks
      ORDER BY type, scope
    `).all() as Array<{
      id: string;
      type: string;
      scope: string;
      content: string;
      version: number;
      created_at: string;
      updated_at: string;
    }>;

    const blocks = rows.map(rowToBlock);

    db.close();

    return c.json({
      initialized: true,
      blocks,
      count: blocks.length,
    });
  } catch (error) {
    db.close();
    return c.json({ error: 'Failed to read memory blocks' }, 500);
  }
});

// GET /api/memory/:type - Get specific memory block
memoryRoutes.get('/:type', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const blockType = c.req.param('type');

  if (!['persona', 'project', 'user', 'corrections'].includes(blockType)) {
    return c.json({ error: 'Invalid block type' }, 400);
  }

  const db = getDatabase(projectRoot);
  if (!db) {
    return c.json({ error: 'Memory system not initialized' }, 404);
  }

  try {
    const row = db.prepare(`
      SELECT id, type, scope, content, version, created_at, updated_at
      FROM memory_blocks
      WHERE type = ? AND scope = 'project'
    `).get(blockType) as {
      id: string;
      type: string;
      scope: string;
      content: string;
      version: number;
      created_at: string;
      updated_at: string;
    } | undefined;

    db.close();

    if (!row) {
      return c.json({ error: 'Block not found' }, 404);
    }

    return c.json(rowToBlock(row));
  } catch (error) {
    db.close();
    return c.json({ error: 'Failed to read memory block' }, 500);
  }
});

// PUT /api/memory/:type - Update memory block content
memoryRoutes.put('/:type', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const blockType = c.req.param('type');

  if (!['persona', 'project', 'user', 'corrections'].includes(blockType)) {
    return c.json({ error: 'Invalid block type' }, 400);
  }

  const body = await c.req.json<{ content: Record<string, unknown> }>();
  if (!body.content || typeof body.content !== 'object') {
    return c.json({ error: 'Invalid content' }, 400);
  }

  const db = getDatabase(projectRoot);
  if (!db) {
    return c.json({ error: 'Memory system not initialized' }, 404);
  }

  try {
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE memory_blocks
      SET content = ?, version = version + 1, updated_at = ?
      WHERE type = ? AND scope = 'project'
    `).run(JSON.stringify(body.content), now, blockType);

    // Get updated block
    const row = db.prepare(`
      SELECT id, type, scope, content, version, created_at, updated_at
      FROM memory_blocks
      WHERE type = ? AND scope = 'project'
    `).get(blockType) as {
      id: string;
      type: string;
      scope: string;
      content: string;
      version: number;
      created_at: string;
      updated_at: string;
    };

    db.close();

    return c.json(rowToBlock(row));
  } catch (error) {
    db.close();
    return c.json({ error: 'Failed to update memory block' }, 500);
  }
});

// POST /api/memory - Create a new memory block
memoryRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  const body = await c.req.json<{
    type: 'persona' | 'project' | 'user' | 'corrections';
    content: Record<string, unknown>;
    scope?: 'global' | 'project';
  }>();

  if (!body.type || !['persona', 'project', 'user', 'corrections'].includes(body.type)) {
    return c.json({ error: 'Invalid block type' }, 400);
  }
  if (!body.content || typeof body.content !== 'object') {
    return c.json({ error: 'Invalid content' }, 400);
  }

  const db = getDatabase(projectRoot);
  if (!db) {
    return c.json({ error: 'Memory system not initialized' }, 404);
  }

  const scope = body.scope || 'project';

  try {
    // Check if block already exists
    const existing = db.prepare(`
      SELECT id FROM memory_blocks WHERE type = ? AND scope = ?
    `).get(body.type, scope);

    if (existing) {
      db.close();
      return c.json({ error: 'Block already exists. Use PUT to update.' }, 409);
    }

    const now = new Date().toISOString();
    const id = `${scope}-${body.type}-${Date.now()}`;

    db.prepare(`
      INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(id, body.type, scope, JSON.stringify(body.content), now, now);

    // Get created block
    const row = db.prepare(`
      SELECT id, type, scope, content, version, created_at, updated_at
      FROM memory_blocks
      WHERE id = ?
    `).get(id) as {
      id: string;
      type: string;
      scope: string;
      content: string;
      version: number;
      created_at: string;
      updated_at: string;
    };

    db.close();

    return c.json(rowToBlock(row), 201);
  } catch (error) {
    db.close();
    return c.json({ error: 'Failed to create memory block' }, 500);
  }
});

// DELETE /api/memory/:type - Delete memory block
memoryRoutes.delete('/:type', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const blockType = c.req.param('type');

  if (!['user', 'corrections'].includes(blockType)) {
    return c.json({ error: 'Cannot delete persona or project blocks' }, 400);
  }

  const db = getDatabase(projectRoot);
  if (!db) {
    return c.json({ error: 'Memory system not initialized' }, 404);
  }

  try {
    const result = db.prepare(`
      DELETE FROM memory_blocks
      WHERE type = ? AND scope = 'project'
    `).run(blockType);

    db.close();

    if (result.changes === 0) {
      return c.json({ error: 'Block not found' }, 404);
    }

    return c.json({ success: true, deleted: blockType });
  } catch (error) {
    db.close();
    return c.json({ error: 'Failed to delete memory block' }, 500);
  }
});
