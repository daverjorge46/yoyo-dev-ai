/**
 * Agent Progress API Routes
 *
 * Provides endpoints for tracking parallel agent execution.
 */

import { Hono } from 'hono';
import type { Variables } from '../types.js';
import { agentTracker } from '../services/agents.js';

const agentsRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /api/agents/progress - Get all agent progress
 */
agentsRoutes.get('/progress', (c) => {
  const agents = agentTracker.getAllAgents();
  const aggregate = agentTracker.getAggregateProgress();

  return c.json({
    agents: agents.map((agent) => ({
      ...agent,
      duration:
        agent.startTime !== null
          ? (agent.endTime ?? Date.now()) - agent.startTime
          : null,
      logs: agent.logs.slice(-20), // Only last 20 logs
    })),
    aggregate,
  });
});

/**
 * GET /api/agents/:id - Get a specific agent's progress
 */
agentsRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const agent = agentTracker.getAgent(id);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({
    ...agent,
    duration:
      agent.startTime !== null
        ? (agent.endTime ?? Date.now()) - agent.startTime
        : null,
  });
});

/**
 * GET /api/agents/:id/logs - Get full logs for an agent
 */
agentsRoutes.get('/:id/logs', (c) => {
  const id = c.req.param('id');
  const agent = agentTracker.getAgent(id);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({
    agentId: id,
    logs: agent.logs,
  });
});

/**
 * POST /api/agents/:id/cancel - Cancel an agent
 */
agentsRoutes.post('/:id/cancel', (c) => {
  const id = c.req.param('id');
  const agent = agentTracker.cancelAgent(id);

  if (!agent) {
    return c.json({ success: false, error: 'Agent not found or cannot be cancelled' }, 400);
  }

  return c.json({
    success: true,
    agent: {
      ...agent,
      duration:
        agent.startTime !== null
          ? (agent.endTime ?? Date.now()) - agent.startTime
          : null,
    },
  });
});

/**
 * POST /api/agents/start - Start tracking a new agent (for testing/manual use)
 */
agentsRoutes.post('/start', async (c) => {
  const body = await c.req.json<{
    id?: string;
    type: string;
    specId?: string;
    taskGroupId?: string;
    currentTask?: string;
  }>();

  if (!body.type) {
    return c.json({ error: 'Agent type is required' }, 400);
  }

  const id = body.id || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const agent = agentTracker.startAgent({
    id,
    type: body.type,
    specId: body.specId,
    taskGroupId: body.taskGroupId,
    currentTask: body.currentTask,
  });

  return c.json({
    success: true,
    agent: {
      ...agent,
      duration: null,
    },
  });
});

/**
 * POST /api/agents/:id/update - Update agent progress (for testing/manual use)
 */
agentsRoutes.post('/:id/update', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    currentTask?: string;
    progress?: number;
    status?: 'running' | 'completed' | 'failed' | 'cancelled';
    error?: string;
  }>();

  const agent = agentTracker.updateAgent(id, body);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({
    success: true,
    agent: {
      ...agent,
      duration:
        agent.startTime !== null
          ? (agent.endTime ?? Date.now()) - agent.startTime
          : null,
    },
  });
});

/**
 * POST /api/agents/:id/log - Add a log entry (for testing/manual use)
 */
agentsRoutes.post('/:id/log', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    message: string;
    level?: 'info' | 'warn' | 'error' | 'debug';
  }>();

  if (!body.message) {
    return c.json({ error: 'Message is required' }, 400);
  }

  const agent = agentTracker.getAgent(id);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  agentTracker.addLog(id, body.message, body.level || 'info');

  return c.json({ success: true });
});

/**
 * POST /api/agents/:id/complete - Complete an agent (for testing/manual use)
 */
agentsRoutes.post('/:id/complete', (c) => {
  const id = c.req.param('id');
  const agent = agentTracker.completeAgent(id);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({
    success: true,
    agent: {
      ...agent,
      duration:
        agent.startTime !== null
          ? (agent.endTime ?? Date.now()) - agent.startTime
          : null,
    },
  });
});

/**
 * POST /api/agents/:id/fail - Fail an agent (for testing/manual use)
 */
agentsRoutes.post('/:id/fail', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ error: string }>();

  const agent = agentTracker.failAgent(id, body.error || 'Unknown error');

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({
    success: true,
    agent: {
      ...agent,
      duration:
        agent.startTime !== null
          ? (agent.endTime ?? Date.now()) - agent.startTime
          : null,
    },
  });
});

/**
 * DELETE /api/agents/finished - Clear all finished agents
 */
agentsRoutes.delete('/finished', (c) => {
  agentTracker.clearFinishedAgents();
  return c.json({ success: true });
});

/**
 * DELETE /api/agents/:id - Remove a specific agent
 */
agentsRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  const removed = agentTracker.removeAgent(id);

  if (!removed) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({ success: true });
});

export { agentsRoutes };
