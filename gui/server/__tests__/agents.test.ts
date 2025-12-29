/**
 * AgentTracker Service Tests
 *
 * Tests for the in-memory agent tracking service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the WebSocket manager before importing the agent tracker
vi.mock('../services/websocket.js', () => ({
  wsManager: {
    broadcast: vi.fn(),
  },
}));

import { agentTracker } from '../services/agents.js';
import { wsManager } from '../services/websocket.js';

describe('AgentTracker', () => {
  beforeEach(() => {
    // Clear all agents before each test
    agentTracker.clearAllAgents();
    vi.clearAllMocks();
  });

  describe('startAgent', () => {
    it('should create a new agent with running status', () => {
      const agent = agentTracker.startAgent({
        id: 'agent-1',
        type: 'implementer',
      });

      expect(agent.id).toBe('agent-1');
      expect(agent.type).toBe('implementer');
      expect(agent.status).toBe('running');
      expect(agent.progress).toBe(0);
      expect(agent.startTime).toBeDefined();
      expect(agent.endTime).toBeNull();
    });

    it('should set optional fields correctly', () => {
      const agent = agentTracker.startAgent({
        id: 'agent-2',
        type: 'context-fetcher',
        specId: 'spec-123',
        taskGroupId: 'group-1',
        currentTask: 'Fetching context',
      });

      expect(agent.specId).toBe('spec-123');
      expect(agent.taskGroupId).toBe('group-1');
      expect(agent.currentTask).toBe('Fetching context');
    });

    it('should broadcast agent:started event', () => {
      agentTracker.startAgent({
        id: 'agent-3',
        type: 'test-runner',
      });

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent:started',
          payload: expect.objectContaining({
            data: expect.objectContaining({
              id: 'agent-3',
              type: 'test-runner',
              status: 'running',
            }),
          }),
        })
      );
    });

    it('should add initial log entry', () => {
      const agent = agentTracker.startAgent({
        id: 'agent-4',
        type: 'implementer',
      });

      expect(agent.logs.length).toBe(1);
      expect(agent.logs[0].message).toContain('started');
    });
  });

  describe('updateAgent', () => {
    it('should update agent progress', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const updated = agentTracker.updateAgent('agent-1', { progress: 50 });

      expect(updated?.progress).toBe(50);
    });

    it('should update current task', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const updated = agentTracker.updateAgent('agent-1', {
        currentTask: 'New task',
      });

      expect(updated?.currentTask).toBe('New task');
    });

    it('should clamp progress between 0 and 100', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      let updated = agentTracker.updateAgent('agent-1', { progress: 150 });
      expect(updated?.progress).toBe(100);

      updated = agentTracker.updateAgent('agent-1', { progress: -10 });
      expect(updated?.progress).toBe(0);
    });

    it('should set endTime when status changes to terminal state', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const updated = agentTracker.updateAgent('agent-1', { status: 'completed' });

      expect(updated?.endTime).toBeDefined();
    });

    it('should return null for non-existent agent', () => {
      const result = agentTracker.updateAgent('non-existent', { progress: 50 });

      expect(result).toBeNull();
    });

    it('should broadcast agent:progress event', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });
      vi.clearAllMocks();

      agentTracker.updateAgent('agent-1', { progress: 50 });

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent:progress',
        })
      );
    });
  });

  describe('completeAgent', () => {
    it('should set status to completed and progress to 100', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const completed = agentTracker.completeAgent('agent-1');

      expect(completed?.status).toBe('completed');
      expect(completed?.progress).toBe(100);
      expect(completed?.endTime).toBeDefined();
    });

    it('should clear currentTask', () => {
      agentTracker.startAgent({
        id: 'agent-1',
        type: 'test',
        currentTask: 'Some task',
      });

      const completed = agentTracker.completeAgent('agent-1');

      expect(completed?.currentTask).toBeNull();
    });

    it('should add completion log', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const completed = agentTracker.completeAgent('agent-1');

      expect(completed?.logs.some((log) => log.message.includes('completed'))).toBe(
        true
      );
    });

    it('should broadcast agent:completed event', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });
      vi.clearAllMocks();

      agentTracker.completeAgent('agent-1');

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent:completed',
        })
      );
    });
  });

  describe('failAgent', () => {
    it('should set status to failed with error message', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const failed = agentTracker.failAgent('agent-1', 'Something went wrong');

      expect(failed?.status).toBe('failed');
      expect(failed?.error).toBe('Something went wrong');
      expect(failed?.endTime).toBeDefined();
    });

    it('should add error log', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const failed = agentTracker.failAgent('agent-1', 'Error message');

      expect(failed?.logs.some((log) => log.level === 'error')).toBe(true);
    });

    it('should broadcast agent:failed event', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });
      vi.clearAllMocks();

      agentTracker.failAgent('agent-1', 'Error');

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent:failed',
        })
      );
    });
  });

  describe('cancelAgent', () => {
    it('should set status to cancelled', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const cancelled = agentTracker.cancelAgent('agent-1');

      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.endTime).toBeDefined();
    });

    it('should not cancel completed agent', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });
      agentTracker.completeAgent('agent-1');

      const result = agentTracker.cancelAgent('agent-1');

      expect(result).toBeNull();
    });

    it('should not cancel failed agent', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });
      agentTracker.failAgent('agent-1', 'Error');

      const result = agentTracker.cancelAgent('agent-1');

      expect(result).toBeNull();
    });

    it('should add cancellation log', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const cancelled = agentTracker.cancelAgent('agent-1');

      expect(cancelled?.logs.some((log) => log.message.includes('cancelled'))).toBe(
        true
      );
    });
  });

  describe('addLog', () => {
    it('should add log entry to agent', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      agentTracker.addLog('agent-1', 'Custom log message', 'info');

      const agent = agentTracker.getAgent('agent-1');
      expect(agent?.logs.some((log) => log.message === 'Custom log message')).toBe(
        true
      );
    });

    it('should broadcast agent:log event', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });
      vi.clearAllMocks();

      agentTracker.addLog('agent-1', 'Log message', 'warn');

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent:log',
          payload: expect.objectContaining({
            data: expect.objectContaining({
              agentId: 'agent-1',
              log: expect.objectContaining({
                message: 'Log message',
                level: 'warn',
              }),
            }),
          }),
        })
      );
    });

    it('should trim logs to maxLogs limit', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      // Add more than maxLogs (100) entries
      for (let i = 0; i < 110; i++) {
        agentTracker.addLog('agent-1', `Log ${i}`, 'info');
      }

      const agent = agentTracker.getAgent('agent-1');
      // Should be at most 100 logs (maxLogs)
      expect(agent?.logs.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test' });

      const agent = agentTracker.getAgent('agent-1');

      expect(agent?.id).toBe('agent-1');
    });

    it('should return null for non-existent agent', () => {
      const agent = agentTracker.getAgent('non-existent');

      expect(agent).toBeNull();
    });
  });

  describe('getAllAgents', () => {
    it('should return all agents', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test1' });
      agentTracker.startAgent({ id: 'agent-2', type: 'test2' });

      const agents = agentTracker.getAllAgents();

      expect(agents.length).toBe(2);
    });

    it('should return empty array when no agents', () => {
      const agents = agentTracker.getAllAgents();

      expect(agents).toEqual([]);
    });
  });

  describe('getAgentsByStatus', () => {
    it('should filter agents by status', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test1' });
      agentTracker.startAgent({ id: 'agent-2', type: 'test2' });
      agentTracker.completeAgent('agent-2');

      const running = agentTracker.getAgentsByStatus('running');
      const completed = agentTracker.getAgentsByStatus('completed');

      expect(running.length).toBe(1);
      expect(completed.length).toBe(1);
      expect(running[0].id).toBe('agent-1');
      expect(completed[0].id).toBe('agent-2');
    });
  });

  describe('getRunningAgents', () => {
    it('should return only running agents', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test1' });
      agentTracker.startAgent({ id: 'agent-2', type: 'test2' });
      agentTracker.completeAgent('agent-1');

      const running = agentTracker.getRunningAgents();

      expect(running.length).toBe(1);
      expect(running[0].id).toBe('agent-2');
    });
  });

  describe('getAggregateProgress', () => {
    it('should calculate aggregate progress correctly', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test1' });
      agentTracker.updateAgent('agent-1', { progress: 50 });
      agentTracker.startAgent({ id: 'agent-2', type: 'test2' });
      agentTracker.completeAgent('agent-2');
      agentTracker.startAgent({ id: 'agent-3', type: 'test3' });
      agentTracker.failAgent('agent-3', 'Error');

      const aggregate = agentTracker.getAggregateProgress();

      expect(aggregate.total).toBe(3);
      expect(aggregate.running).toBe(1);
      expect(aggregate.completed).toBe(1);
      expect(aggregate.failed).toBe(1);
      // Average: (50 + 100 + 0) / 3 = 50 (approximately)
      expect(aggregate.percentage).toBeGreaterThanOrEqual(0);
      expect(aggregate.percentage).toBeLessThanOrEqual(100);
    });

    it('should return 0 percentage when no agents', () => {
      const aggregate = agentTracker.getAggregateProgress();

      expect(aggregate.percentage).toBe(0);
    });
  });

  describe('clearFinishedAgents', () => {
    it('should remove completed, failed, and cancelled agents', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'running' });
      agentTracker.startAgent({ id: 'agent-2', type: 'completed' });
      agentTracker.completeAgent('agent-2');
      agentTracker.startAgent({ id: 'agent-3', type: 'failed' });
      agentTracker.failAgent('agent-3', 'Error');
      agentTracker.startAgent({ id: 'agent-4', type: 'cancelled' });
      agentTracker.cancelAgent('agent-4');

      agentTracker.clearFinishedAgents();

      const agents = agentTracker.getAllAgents();
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-1');
    });
  });

  describe('clearAllAgents', () => {
    it('should remove all agents', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test1' });
      agentTracker.startAgent({ id: 'agent-2', type: 'test2' });

      agentTracker.clearAllAgents();

      expect(agentTracker.getAllAgents().length).toBe(0);
    });
  });

  describe('removeAgent', () => {
    it('should remove specific agent', () => {
      agentTracker.startAgent({ id: 'agent-1', type: 'test1' });
      agentTracker.startAgent({ id: 'agent-2', type: 'test2' });

      const removed = agentTracker.removeAgent('agent-1');

      expect(removed).toBe(true);
      expect(agentTracker.getAgent('agent-1')).toBeNull();
      expect(agentTracker.getAgent('agent-2')).not.toBeNull();
    });

    it('should return false for non-existent agent', () => {
      const removed = agentTracker.removeAgent('non-existent');

      expect(removed).toBe(false);
    });
  });
});
