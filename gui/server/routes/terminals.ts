/**
 * Terminal API Routes
 *
 * REST endpoints for managing Agent Terminals:
 * - GET /api/terminals - List all terminals
 * - POST /api/terminals - Spawn new terminal
 * - GET /api/terminals/:id - Get terminal details
 * - DELETE /api/terminals/:id - Kill terminal
 * - PATCH /api/terminals/:id/pause - Pause terminal
 * - PATCH /api/terminals/:id/resume - Resume terminal
 * - POST /api/terminals/:id/inject - Inject context
 * - GET /api/terminals/:id/output - Get terminal output
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Variables } from '../types.js';
import { getTerminalPool } from '../services/terminalPool.js';

// =============================================================================
// Validation Schemas
// =============================================================================

const AgentTypeSchema = z.enum([
  'yoyo-ai',
  'dave-engineer',
  'arthas-oracle',
  'alma-librarian',
  'alvaro-explore',
  'angeles-writer',
  'implementer',
  'qa-reviewer',
  'qa-fixer',
]);

const TerminalContextSchema = z.object({
  specSummary: z.string().optional(),
  taskDescription: z.string().optional(),
  codebaseContext: z.string().optional(),
  memoryContext: z.string().optional(),
  techStackContext: z.string().optional(),
  customContext: z.string().optional(),
});

const SpawnTerminalSchema = z.object({
  agentType: AgentTypeSchema,
  name: z.string().optional(),
  taskId: z.string().optional(),
  specId: z.string().optional(),
  context: TerminalContextSchema.optional(),
  useWorktree: z.boolean().optional(),
});

const InjectContextSchema = z.object({
  context: TerminalContextSchema,
  append: z.boolean().optional(),
});

// =============================================================================
// Routes
// =============================================================================

export const terminalsRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /api/terminals
 * List all terminals with pool statistics
 */
terminalsRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot');
  const pool = getTerminalPool(projectRoot);

  const terminals = pool.getAll().map((session) => ({
    id: session.id,
    name: session.name,
    agentType: session.agentType,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    startedAt: session.startedAt?.toISOString(),
    completedAt: session.completedAt?.toISOString(),
    boundTaskId: session.boundTaskId,
    boundSpecId: session.boundSpecId,
    worktreePath: session.worktreePath,
    worktreeBranch: session.worktreeBranch,
    progress: session.progress,
    errorMessage: session.errorMessage,
    exitCode: session.exitCode,
    lastOutputLine: session.lastOutputLine,
    outputLineCount: session.outputLineCount,
  }));

  const stats = pool.getStats();

  return c.json({
    terminals,
    stats,
  });
});

/**
 * POST /api/terminals
 * Spawn a new terminal
 */
terminalsRoutes.post(
  '/',
  zValidator('json', SpawnTerminalSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot');
    const pool = getTerminalPool(projectRoot);
    const body = c.req.valid('json');

    try {
      const session = await pool.spawn({
        agentType: body.agentType,
        name: body.name,
        taskId: body.taskId,
        specId: body.specId,
        context: body.context,
        useWorktree: body.useWorktree,
      });

      return c.json(
        {
          id: session.id,
          name: session.name,
          agentType: session.agentType,
          status: session.status,
          createdAt: session.createdAt.toISOString(),
        },
        201
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to spawn terminal';
      return c.json({ error: message }, 400);
    }
  }
);

/**
 * GET /api/terminals/:id
 * Get terminal details
 */
terminalsRoutes.get('/:id', async (c) => {
  const projectRoot = c.get('projectRoot');
  const pool = getTerminalPool(projectRoot);
  const terminalId = c.req.param('id');

  const session = pool.get(terminalId);
  if (!session) {
    return c.json({ error: 'Terminal not found' }, 404);
  }

  return c.json({
    id: session.id,
    name: session.name,
    agentType: session.agentType,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    startedAt: session.startedAt?.toISOString(),
    completedAt: session.completedAt?.toISOString(),
    boundTaskId: session.boundTaskId,
    boundSpecId: session.boundSpecId,
    worktreePath: session.worktreePath,
    worktreeBranch: session.worktreeBranch,
    injectedContext: session.injectedContext,
    progress: session.progress,
    errorMessage: session.errorMessage,
    exitCode: session.exitCode,
    lastOutputLine: session.lastOutputLine,
    outputLineCount: session.outputLineCount,
  });
});

/**
 * DELETE /api/terminals/:id
 * Kill a terminal
 */
terminalsRoutes.delete('/:id', async (c) => {
  const projectRoot = c.get('projectRoot');
  const pool = getTerminalPool(projectRoot);
  const terminalId = c.req.param('id');

  const success = await pool.kill(terminalId);
  if (!success) {
    return c.json({ error: 'Terminal not found or already stopped' }, 404);
  }

  return c.json({ success: true, message: 'Terminal killed' });
});

/**
 * PATCH /api/terminals/:id/pause
 * Pause a running terminal
 */
terminalsRoutes.patch('/:id/pause', async (c) => {
  const projectRoot = c.get('projectRoot');
  const pool = getTerminalPool(projectRoot);
  const terminalId = c.req.param('id');

  const success = await pool.pause(terminalId);
  if (!success) {
    return c.json({ error: 'Terminal not found or not running' }, 400);
  }

  return c.json({ success: true, message: 'Terminal paused' });
});

/**
 * PATCH /api/terminals/:id/resume
 * Resume a paused terminal
 */
terminalsRoutes.patch('/:id/resume', async (c) => {
  const projectRoot = c.get('projectRoot');
  const pool = getTerminalPool(projectRoot);
  const terminalId = c.req.param('id');

  const success = await pool.resume(terminalId);
  if (!success) {
    return c.json({ error: 'Terminal not found or not paused' }, 400);
  }

  return c.json({ success: true, message: 'Terminal resumed' });
});

/**
 * POST /api/terminals/:id/inject
 * Inject context into a terminal
 */
terminalsRoutes.post(
  '/:id/inject',
  zValidator('json', InjectContextSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot');
    const pool = getTerminalPool(projectRoot);
    const terminalId = c.req.param('id');
    const body = c.req.valid('json');

    const success = await pool.injectContext(terminalId, body.context, body.append);
    if (!success) {
      return c.json({ error: 'Terminal not found' }, 404);
    }

    return c.json({ success: true, message: 'Context injected' });
  }
);

/**
 * GET /api/terminals/:id/output
 * Get terminal output buffer
 */
terminalsRoutes.get('/:id/output', async (c) => {
  const projectRoot = c.get('projectRoot');
  const pool = getTerminalPool(projectRoot);
  const terminalId = c.req.param('id');

  const session = pool.get(terminalId);
  if (!session) {
    return c.json({ error: 'Terminal not found' }, 404);
  }

  const output = pool.getOutput(terminalId);

  return c.json({
    terminalId,
    lineCount: session.outputLineCount,
    bufferSize: output.length,
    lines: output.map((line) => ({
      id: line.id,
      content: line.content,
      timestamp: line.timestamp.toISOString(),
      stream: line.stream,
    })),
  });
});

/**
 * DELETE /api/terminals
 * Kill all terminals
 */
terminalsRoutes.delete('/', async (c) => {
  const projectRoot = c.get('projectRoot');
  const pool = getTerminalPool(projectRoot);

  const count = await pool.killAll();

  return c.json({ success: true, message: `Killed ${count} terminals`, count });
});
