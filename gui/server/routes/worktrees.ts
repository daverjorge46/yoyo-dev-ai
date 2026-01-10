/**
 * Worktree API Routes
 *
 * REST endpoints for Git worktree management:
 * - GET /api/worktrees - List all worktrees
 * - POST /api/worktrees - Create worktree for spec
 * - DELETE /api/worktrees/:specId - Delete worktree
 * - POST /api/worktrees/:specId/merge - Merge to target branch
 * - GET /api/worktrees/:specId - Get worktree status
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Variables } from '../types.js';
import { getWorktreeManager } from '../services/worktreeManager.js';

// =============================================================================
// Validation Schemas
// =============================================================================

const CreateWorktreeSchema = z.object({
  specId: z.string().min(1),
});

const MergeWorktreeSchema = z.object({
  targetBranch: z.string().optional(),
});

// =============================================================================
// Routes
// =============================================================================

export const worktreesRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /api/worktrees
 * List all worktrees
 */
worktreesRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot');
  const manager = getWorktreeManager(projectRoot);

  try {
    const worktrees = await manager.list();
    return c.json({
      worktrees: worktrees.map((w) => ({
        specId: w.specId,
        path: w.path,
        branch: w.branch,
        createdAt: w.createdAt.toISOString(),
        commitCount: w.commitCount,
        status: w.status,
        headCommit: w.headCommit,
      })),
      count: worktrees.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list worktrees';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/worktrees
 * Create worktree for a spec
 */
worktreesRoutes.post(
  '/',
  zValidator('json', CreateWorktreeSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot');
    const manager = getWorktreeManager(projectRoot);
    const { specId } = c.req.valid('json');

    try {
      const worktree = await manager.create(specId);
      return c.json(
        {
          specId: worktree.specId,
          path: worktree.path,
          branch: worktree.branch,
          createdAt: worktree.createdAt.toISOString(),
          status: worktree.status,
        },
        201
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create worktree';
      return c.json({ error: message }, 400);
    }
  }
);

/**
 * GET /api/worktrees/:specId
 * Get worktree status
 */
worktreesRoutes.get('/:specId', async (c) => {
  const projectRoot = c.get('projectRoot');
  const manager = getWorktreeManager(projectRoot);
  const specId = c.req.param('specId');

  try {
    const worktree = await manager.getStatus(specId);
    return c.json({
      specId: worktree.specId,
      path: worktree.path,
      branch: worktree.branch,
      createdAt: worktree.createdAt.toISOString(),
      commitCount: worktree.commitCount,
      status: worktree.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worktree not found';
    return c.json({ error: message }, 404);
  }
});

/**
 * DELETE /api/worktrees/:specId
 * Delete worktree
 */
worktreesRoutes.delete('/:specId', async (c) => {
  const projectRoot = c.get('projectRoot');
  const manager = getWorktreeManager(projectRoot);
  const specId = c.req.param('specId');

  try {
    await manager.delete(specId);
    return c.json({ success: true, message: 'Worktree deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete worktree';
    return c.json({ error: message }, 400);
  }
});

/**
 * POST /api/worktrees/:specId/merge
 * Merge worktree to target branch
 */
worktreesRoutes.post(
  '/:specId/merge',
  zValidator('json', MergeWorktreeSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot');
    const manager = getWorktreeManager(projectRoot);
    const specId = c.req.param('specId');
    const { targetBranch } = c.req.valid('json');

    try {
      const result = await manager.merge(specId, targetBranch);

      if (result.conflicts) {
        return c.json(
          {
            success: false,
            conflicts: true,
            conflictFiles: result.conflictFiles,
            message: result.message,
          },
          409
        );
      }

      if (!result.success) {
        return c.json(
          {
            success: false,
            message: result.message,
          },
          400
        );
      }

      return c.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to merge worktree';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * POST /api/worktrees/cleanup
 * Clean up orphaned worktrees
 */
worktreesRoutes.post('/cleanup', async (c) => {
  const projectRoot = c.get('projectRoot');
  const manager = getWorktreeManager(projectRoot);

  try {
    const cleaned = await manager.cleanupOrphaned();
    return c.json({
      success: true,
      cleaned,
      message: `Cleaned ${cleaned} orphaned worktrees`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cleanup worktrees';
    return c.json({ error: message }, 500);
  }
});
