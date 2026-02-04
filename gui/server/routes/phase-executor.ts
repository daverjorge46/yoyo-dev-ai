/**
 * Phase Executor API Routes
 *
 * Endpoints for managing automated phase execution via agent terminals.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPhaseExecutor } from '../services/phaseExecutor.js';
import type { Variables } from '../types.js';

export const phaseExecutorRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Validation Schemas
// =============================================================================

const PhaseItemSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  completed: z.boolean(),
  effort: z.enum(['XS', 'S', 'M', 'L', 'XL']).nullable(),
  description: z.string().optional(),
  linkedSpec: z.string().optional(),
});

const ExecutePhaseSchema = z.object({
  phaseId: z.string(),
  phaseTitle: z.string(),
  items: z.array(PhaseItemSchema),
  options: z.object({
    autoCreateSpecs: z.boolean().default(true),
    autoCreateTasks: z.boolean().default(true),
    runQA: z.boolean().default(true),
    maxQAIterations: z.number().min(1).max(10).default(3),
    stopOnError: z.boolean().default(false),
    useWorktrees: z.boolean().default(false),
    selectedItemIds: z.array(z.string()).optional(),
  }),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/phase-executor/execute
 * Start executing a phase
 */
phaseExecutorRoutes.post(
  '/execute',
  zValidator('json', ExecutePhaseSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot') || process.cwd();
    const config = c.req.valid('json');

    try {
      const executor = getPhaseExecutor(projectRoot);
      const execution = await executor.startExecution(config);

      return c.json({
        success: true,
        execution,
      }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start execution';
      return c.json({ error: message }, 400);
    }
  }
);

/**
 * GET /api/phase-executor/status
 * Get current execution status
 */
phaseExecutorRoutes.get('/status', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const executor = getPhaseExecutor(projectRoot);
  const status = executor.getStatus();

  if (!status) {
    return c.json({
      isExecuting: false,
      execution: null,
    });
  }

  return c.json({
    isExecuting: status.status === 'running',
    execution: status,
  });
});

/**
 * GET /api/phase-executor/:id
 * Get execution by ID
 */
phaseExecutorRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const executionId = c.req.param('id');

  const executor = getPhaseExecutor(projectRoot);
  const execution = executor.getExecution(executionId);

  if (!execution) {
    return c.json({ error: 'Execution not found' }, 404);
  }

  return c.json(execution);
});

/**
 * GET /api/phase-executor
 * List recent executions
 */
phaseExecutorRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const limit = parseInt(c.req.query('limit') || '20');

  const executor = getPhaseExecutor(projectRoot);
  const executions = executor.listExecutions(limit);

  return c.json({
    executions,
    count: executions.length,
  });
});

/**
 * POST /api/phase-executor/pause
 * Pause the current execution
 */
phaseExecutorRoutes.post('/pause', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const executor = getPhaseExecutor(projectRoot);

  const paused = await executor.pauseExecution();

  if (!paused) {
    return c.json({ error: 'No active execution to pause' }, 400);
  }

  return c.json({
    success: true,
    message: 'Execution paused',
  });
});

/**
 * POST /api/phase-executor/resume
 * Resume a paused execution
 */
phaseExecutorRoutes.post('/resume', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const executor = getPhaseExecutor(projectRoot);

  const resumed = await executor.resumeExecution();

  if (!resumed) {
    return c.json({ error: 'No paused execution to resume' }, 400);
  }

  return c.json({
    success: true,
    message: 'Execution resumed',
  });
});

/**
 * DELETE /api/phase-executor/cancel
 * Cancel the current execution
 */
phaseExecutorRoutes.delete('/cancel', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const executor = getPhaseExecutor(projectRoot);

  const cancelled = await executor.cancelExecution();

  if (!cancelled) {
    return c.json({ error: 'No active execution to cancel' }, 400);
  }

  return c.json({
    success: true,
    message: 'Execution cancelled',
  });
});

/**
 * GET /api/phase-executor/phases/:phaseId/execution
 * Get execution for a specific phase
 */
phaseExecutorRoutes.get('/phases/:phaseId/execution', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const phaseId = c.req.param('phaseId');

  const executor = getPhaseExecutor(projectRoot);

  // Check if current execution matches
  const current = executor.getStatus();
  if (current && current.phaseId === phaseId) {
    return c.json({
      isExecuting: current.status === 'running',
      execution: current,
    });
  }

  // Check recent executions for this phase
  const executions = executor.listExecutions(50);
  const phaseExecution = executions.find(e => e.phaseId === phaseId);

  if (!phaseExecution) {
    return c.json({
      isExecuting: false,
      execution: null,
    });
  }

  return c.json({
    isExecuting: phaseExecution.status === 'running',
    execution: phaseExecution,
  });
});
