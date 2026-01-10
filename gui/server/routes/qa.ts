/**
 * QA Routes
 *
 * API endpoints for QA review management:
 * - GET /api/qa - List sessions with stats
 * - POST /api/qa - Create new session
 * - GET /api/qa/:sessionId - Get session details
 * - DELETE /api/qa/:sessionId - Cancel session
 * - POST /api/qa/:sessionId/review - Start review
 * - POST /api/qa/:sessionId/fix - Start fixing
 * - PATCH /api/qa/:sessionId/issues/:issueId - Update issue status
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Variables } from '../types.js';
import { getQAManager } from '../services/qaManager.js';
import { getTerminalPool } from '../services/terminalPool.js';
import type { IssueCategory, IssueStatus } from '../services/qaManager.js';

// =============================================================================
// Validation Schemas
// =============================================================================

const IssueCategorySchema = z.enum([
  'bug',
  'security',
  'performance',
  'accessibility',
  'code-quality',
  'testing',
  'documentation',
]);

const IssueStatusSchema = z.enum([
  'open',
  'in_progress',
  'fixed',
  'verified',
  'wont_fix',
  'deferred',
]);

const IssueSeveritySchema = z.enum(['critical', 'major', 'minor', 'suggestion']);

const CreateSessionSchema = z.object({
  specId: z.string().min(1),
  focusAreas: z.array(IssueCategorySchema).optional(),
});

const UpdateIssueSchema = z.object({
  status: IssueStatusSchema,
  appliedFix: z.string().optional(),
});

const AddIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: IssueSeveritySchema,
  category: IssueCategorySchema,
  status: IssueStatusSchema.optional(),
  filePath: z.string().optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
  suggestedFix: z.string().optional(),
});

// =============================================================================
// Routes
// =============================================================================

export const qaRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /api/qa
 * List all sessions with stats
 */
qaRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);

  try {
    const [sessions, stats] = await Promise.all([
      qaManager.listSessions(),
      qaManager.getStats(),
    ]);

    return c.json({ sessions, stats });
  } catch (error) {
    console.error('[QA Routes] Failed to list sessions:', error);
    return c.json(
      { error: 'Failed to list sessions', details: String(error) },
      500
    );
  }
});

/**
 * GET /api/qa/stats
 * Get stats only
 */
qaRoutes.get('/stats', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);

  try {
    const stats = await qaManager.getStats();
    return c.json(stats);
  } catch (error) {
    console.error('[QA Routes] Failed to get stats:', error);
    return c.json(
      { error: 'Failed to get stats', details: String(error) },
      500
    );
  }
});

/**
 * GET /api/qa/:sessionId
 * Get session details
 */
qaRoutes.get('/:sessionId', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);
  const sessionId = c.req.param('sessionId');

  try {
    const session = await qaManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json(session);
  } catch (error) {
    console.error('[QA Routes] Failed to get session:', error);
    return c.json(
      { error: 'Failed to get session', details: String(error) },
      500
    );
  }
});

/**
 * POST /api/qa
 * Create a new session
 */
qaRoutes.post(
  '/',
  zValidator('json', CreateSessionSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot');
    const qaManager = getQAManager(projectRoot);
    const body = c.req.valid('json');

    try {
      const session = await qaManager.createSession(body.specId, body.focusAreas);
      return c.json(session, 201);
    } catch (error) {
      console.error('[QA Routes] Failed to create session:', error);
      return c.json(
        { error: 'Failed to create session', details: String(error) },
        500
      );
    }
  }
);

/**
 * POST /api/qa/:sessionId/review
 * Start the review process
 */
qaRoutes.post('/:sessionId/review', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);
  const terminalPool = getTerminalPool(projectRoot);
  const sessionId = c.req.param('sessionId');

  try {
    const session = await qaManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'pending') {
      return c.json(
        { error: `Cannot start review: session status is ${session.status}` },
        400
      );
    }

    // Spawn qa-reviewer terminal
    const terminal = await terminalPool.spawn({
      agentType: 'qa-reviewer',
      specId: session.specId,
      taskId: `qa-review-${sessionId}`,
    });

    // Update session status
    await qaManager.updateSessionStatus(sessionId, 'reviewing', {
      reviewerTerminalId: terminal.id,
    });

    return c.json({
      message: 'Review started',
      terminalId: terminal.id,
    });
  } catch (error) {
    console.error('[QA Routes] Failed to start review:', error);
    return c.json(
      { error: 'Failed to start review', details: String(error) },
      500
    );
  }
});

/**
 * POST /api/qa/:sessionId/fix
 * Start the fix process
 */
qaRoutes.post('/:sessionId/fix', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);
  const terminalPool = getTerminalPool(projectRoot);
  const sessionId = c.req.param('sessionId');

  try {
    const session = await qaManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'review_complete') {
      return c.json(
        { error: `Cannot start fix: session status is ${session.status}` },
        400
      );
    }

    // Check if there are open issues to fix
    const openIssues = session.issues.filter(
      (i) => i.status === 'open' || i.status === 'in_progress'
    );

    if (openIssues.length === 0) {
      return c.json({ error: 'No open issues to fix' }, 400);
    }

    // Spawn qa-fixer terminal
    const terminal = await terminalPool.spawn({
      agentType: 'qa-fixer',
      specId: session.specId,
      taskId: `qa-fix-${sessionId}`,
    });

    // Update session status
    await qaManager.updateSessionStatus(sessionId, 'fixing', {
      fixerTerminalId: terminal.id,
    });

    return c.json({
      message: 'Fix started',
      terminalId: terminal.id,
      issueCount: openIssues.length,
    });
  } catch (error) {
    console.error('[QA Routes] Failed to start fix:', error);
    return c.json(
      { error: 'Failed to start fix', details: String(error) },
      500
    );
  }
});

/**
 * DELETE /api/qa/:sessionId
 * Cancel and delete a session
 */
qaRoutes.delete('/:sessionId', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);
  const terminalPool = getTerminalPool(projectRoot);
  const sessionId = c.req.param('sessionId');

  try {
    const session = await qaManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Kill associated terminals if running
    if (session.reviewerTerminalId) {
      try {
        await terminalPool.kill(session.reviewerTerminalId);
      } catch {
        // Terminal may already be dead
      }
    }

    if (session.fixerTerminalId) {
      try {
        await terminalPool.kill(session.fixerTerminalId);
      } catch {
        // Terminal may already be dead
      }
    }

    // Delete the session
    await qaManager.deleteSession(sessionId);

    return c.json({ message: 'Session cancelled and deleted' });
  } catch (error) {
    console.error('[QA Routes] Failed to cancel session:', error);
    return c.json(
      { error: 'Failed to cancel session', details: String(error) },
      500
    );
  }
});

/**
 * PATCH /api/qa/:sessionId/issues/:issueId
 * Update issue status
 */
qaRoutes.patch(
  '/:sessionId/issues/:issueId',
  zValidator('json', UpdateIssueSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot');
    const qaManager = getQAManager(projectRoot);
    const sessionId = c.req.param('sessionId');
    const issueId = c.req.param('issueId');
    const body = c.req.valid('json');

    try {
      const session = await qaManager.getSession(sessionId);

      if (!session) {
        return c.json({ error: 'Session not found' }, 404);
      }

      const issue = session.issues.find((i) => i.id === issueId);

      if (!issue) {
        return c.json({ error: 'Issue not found' }, 404);
      }

      await qaManager.updateIssueStatus(
        sessionId,
        issueId,
        body.status,
        body.appliedFix
      );

      return c.json({ message: 'Issue status updated' });
    } catch (error) {
      console.error('[QA Routes] Failed to update issue:', error);
      return c.json(
        { error: 'Failed to update issue', details: String(error) },
        500
      );
    }
  }
);

/**
 * POST /api/qa/:sessionId/issues
 * Add a new issue (for qa-reviewer agent)
 */
qaRoutes.post(
  '/:sessionId/issues',
  zValidator('json', AddIssueSchema),
  async (c) => {
    const projectRoot = c.get('projectRoot');
    const qaManager = getQAManager(projectRoot);
    const sessionId = c.req.param('sessionId');
    const body = c.req.valid('json');

    try {
      const session = await qaManager.getSession(sessionId);

      if (!session) {
        return c.json({ error: 'Session not found' }, 404);
      }

      const issue = await qaManager.addIssue(sessionId, {
        title: body.title,
        description: body.description,
        severity: body.severity,
        category: body.category,
        status: body.status || 'open',
        filePath: body.filePath,
        lineStart: body.lineStart,
        lineEnd: body.lineEnd,
        suggestedFix: body.suggestedFix,
      });

      return c.json(issue, 201);
    } catch (error) {
      console.error('[QA Routes] Failed to add issue:', error);
      return c.json(
        { error: 'Failed to add issue', details: String(error) },
        500
      );
    }
  }
);

/**
 * POST /api/qa/:sessionId/complete-review
 * Mark review as complete
 */
qaRoutes.post('/:sessionId/complete-review', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);
  const sessionId = c.req.param('sessionId');

  try {
    const session = await qaManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'reviewing') {
      return c.json(
        { error: `Cannot complete review: session status is ${session.status}` },
        400
      );
    }

    await qaManager.updateSessionStatus(sessionId, 'review_complete');

    return c.json({ message: 'Review marked as complete' });
  } catch (error) {
    console.error('[QA Routes] Failed to complete review:', error);
    return c.json(
      { error: 'Failed to complete review', details: String(error) },
      500
    );
  }
});

/**
 * POST /api/qa/:sessionId/complete-fix
 * Mark fix as complete
 */
qaRoutes.post('/:sessionId/complete-fix', async (c) => {
  const projectRoot = c.get('projectRoot');
  const qaManager = getQAManager(projectRoot);
  const sessionId = c.req.param('sessionId');

  try {
    const session = await qaManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'fixing') {
      return c.json(
        { error: `Cannot complete fix: session status is ${session.status}` },
        400
      );
    }

    await qaManager.updateSessionStatus(sessionId, 'fix_complete');

    return c.json({ message: 'Fix marked as complete' });
  } catch (error) {
    console.error('[QA Routes] Failed to complete fix:', error);
    return c.json(
      { error: 'Failed to complete fix', details: String(error) },
      500
    );
  }
});
