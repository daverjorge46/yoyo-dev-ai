/**
 * WebSocket Phase Execution Events Tests
 *
 * Tests for phase execution event emission and subscription handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock WSContext for testing
const createMockWSContext = () => ({
  send: vi.fn(),
  close: vi.fn(),
});

// =============================================================================
// Import WebSocketManager class for testing (need to re-create for isolation)
// =============================================================================

type WSContext = ReturnType<typeof createMockWSContext>;

interface PhaseExecutionProgress {
  executionId: string;
  phaseId: string;
  phaseTitle: string;
  overallProgress: number;
  currentSpec?: {
    id: string;
    title: string;
    progress: number;
    currentTask?: string;
  };
  completedSpecs: number;
  totalSpecs: number;
  elapsedSeconds: number;
}

interface PhaseExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  specId?: string;
  taskId?: string;
}

type PhaseExecutionEventType =
  | 'phase:execution:started'
  | 'phase:execution:progress'
  | 'phase:execution:paused'
  | 'phase:execution:resumed'
  | 'phase:execution:stopped'
  | 'phase:execution:completed'
  | 'phase:execution:failed'
  | 'phase:execution:log';

interface PhaseExecutionEvent {
  type: PhaseExecutionEventType;
  payload: {
    executionId: string;
    phaseId: string;
    data?: unknown;
    timestamp: number;
  };
}

// Simple WebSocketManager implementation for testing
class TestWebSocketManager {
  private clients: Map<
    string,
    {
      ws: WSContext;
      subscriptions: Set<string>;
      lastPing: number;
      id: string;
    }
  > = new Map();
  private clientIdCounter = 0;

  addClient(ws: WSContext): string {
    const id = `client-${++this.clientIdCounter}-${Date.now()}`;
    this.clients.set(id, {
      ws,
      subscriptions: new Set(['.yoyo-dev/', 'phase:execution']),
      lastPing: Date.now(),
      id,
    });
    return id;
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  handleMessage(clientId: string, message: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const msg = JSON.parse(message);

      switch (msg.type) {
        case 'subscribe':
          if (msg.payload?.channels) {
            msg.payload.channels.forEach((channel: string) => client.subscriptions.add(channel));
          }
          if (msg.payload?.paths) {
            msg.payload.paths.forEach((path: string) => client.subscriptions.add(path));
          }
          break;

        case 'unsubscribe':
          if (msg.payload?.channels) {
            msg.payload.channels.forEach((channel: string) =>
              client.subscriptions.delete(channel)
            );
          }
          break;
      }
    } catch {
      // Ignore parse errors in tests
    }
  }

  broadcast(message: PhaseExecutionEvent, channel?: string): void {
    const messageStr = JSON.stringify(message);

    for (const [, client] of this.clients) {
      // Check if client is subscribed to this channel
      if (channel && !client.subscriptions.has(channel)) {
        continue;
      }

      try {
        client.ws.send(messageStr);
      } catch {
        // Ignore errors in tests
      }
    }
  }

  broadcastPhaseStarted(data: {
    executionId: string;
    phaseId: string;
    phaseTitle: string;
    totalSpecs: number;
    startedAt: string;
  }): void {
    this.broadcast(
      {
        type: 'phase:execution:started',
        payload: {
          executionId: data.executionId,
          phaseId: data.phaseId,
          data,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  broadcastPhaseProgress(data: PhaseExecutionProgress): void {
    this.broadcast(
      {
        type: 'phase:execution:progress',
        payload: {
          executionId: data.executionId,
          phaseId: data.phaseId,
          data,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  broadcastPhasePaused(data: {
    executionId: string;
    phaseId: string;
    currentSpec?: string;
    currentTask?: string;
    pausedAt: string;
  }): void {
    this.broadcast(
      {
        type: 'phase:execution:paused',
        payload: {
          executionId: data.executionId,
          phaseId: data.phaseId,
          data,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  broadcastPhaseResumed(data: {
    executionId: string;
    phaseId: string;
    currentSpec?: string;
    currentTask?: string;
    resumedAt: string;
  }): void {
    this.broadcast(
      {
        type: 'phase:execution:resumed',
        payload: {
          executionId: data.executionId,
          phaseId: data.phaseId,
          data,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  broadcastPhaseStopped(data: {
    executionId: string;
    phaseId: string;
    reason?: string;
    stoppedAt: string;
    completedSpecs: number;
    totalSpecs: number;
  }): void {
    this.broadcast(
      {
        type: 'phase:execution:stopped',
        payload: {
          executionId: data.executionId,
          phaseId: data.phaseId,
          data,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  broadcastPhaseCompleted(data: {
    executionId: string;
    phaseId: string;
    phaseTitle: string;
    completedAt: string;
    totalSpecs: number;
    totalTasks: number;
    durationSeconds: number;
  }): void {
    this.broadcast(
      {
        type: 'phase:execution:completed',
        payload: {
          executionId: data.executionId,
          phaseId: data.phaseId,
          data,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  broadcastPhaseFailed(data: {
    executionId: string;
    phaseId: string;
    error: string;
    failedAt: string;
    failedSpec?: string;
    failedTask?: string;
  }): void {
    this.broadcast(
      {
        type: 'phase:execution:failed',
        payload: {
          executionId: data.executionId,
          phaseId: data.phaseId,
          data,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  broadcastPhaseLog(log: PhaseExecutionLog & { executionId: string; phaseId: string }): void {
    this.broadcast(
      {
        type: 'phase:execution:log',
        payload: {
          executionId: log.executionId,
          phaseId: log.phaseId,
          data: log,
          timestamp: Date.now(),
        },
      },
      'phase:execution'
    );
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientSubscriptions(clientId: string): Set<string> | undefined {
    return this.clients.get(clientId)?.subscriptions;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('WebSocket Phase Execution Events', () => {
  let wsManager: TestWebSocketManager;
  let mockWs1: ReturnType<typeof createMockWSContext>;
  let mockWs2: ReturnType<typeof createMockWSContext>;
  let clientId1: string;
  let clientId2: string;

  beforeEach(() => {
    wsManager = new TestWebSocketManager();
    mockWs1 = createMockWSContext();
    mockWs2 = createMockWSContext();
    clientId1 = wsManager.addClient(mockWs1);
    clientId2 = wsManager.addClient(mockWs2);
  });

  // ===========================================================================
  // Event Emission Tests
  // ===========================================================================

  describe('Event Emission', () => {
    it('should broadcast phase:execution:started event', () => {
      wsManager.broadcastPhaseStarted({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        totalSpecs: 5,
        startedAt: '2026-01-04T12:00:00Z',
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:started');
      expect(message.payload.executionId).toBe('exec-123');
      expect(message.payload.phaseId).toBe('phase-1');
      expect(message.payload.data.phaseTitle).toBe('Core Features');
    });

    it('should broadcast phase:execution:progress event', () => {
      wsManager.broadcastPhaseProgress({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        overallProgress: 45,
        currentSpec: {
          id: 'spec-1',
          title: 'User Auth',
          progress: 30,
          currentTask: 'task-2',
        },
        completedSpecs: 1,
        totalSpecs: 3,
        elapsedSeconds: 900,
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:progress');
      expect(message.payload.data.overallProgress).toBe(45);
      expect(message.payload.data.currentSpec.title).toBe('User Auth');
    });

    it('should broadcast phase:execution:paused event', () => {
      wsManager.broadcastPhasePaused({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        currentSpec: 'spec-1',
        currentTask: 'task-2',
        pausedAt: '2026-01-04T12:30:00Z',
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:paused');
      expect(message.payload.data.pausedAt).toBe('2026-01-04T12:30:00Z');
    });

    it('should broadcast phase:execution:resumed event', () => {
      wsManager.broadcastPhaseResumed({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        currentSpec: 'spec-1',
        currentTask: 'task-2',
        resumedAt: '2026-01-04T13:00:00Z',
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:resumed');
    });

    it('should broadcast phase:execution:stopped event', () => {
      wsManager.broadcastPhaseStopped({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        reason: 'User requested',
        stoppedAt: '2026-01-04T13:30:00Z',
        completedSpecs: 2,
        totalSpecs: 3,
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:stopped');
      expect(message.payload.data.completedSpecs).toBe(2);
    });

    it('should broadcast phase:execution:completed event', () => {
      wsManager.broadcastPhaseCompleted({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        completedAt: '2026-01-04T14:00:00Z',
        totalSpecs: 3,
        totalTasks: 15,
        durationSeconds: 3600,
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:completed');
      expect(message.payload.data.durationSeconds).toBe(3600);
    });

    it('should broadcast phase:execution:failed event', () => {
      wsManager.broadcastPhaseFailed({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        error: 'Test failure',
        failedAt: '2026-01-04T13:15:00Z',
        failedSpec: 'spec-2',
        failedTask: 'task-5',
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:failed');
      expect(message.payload.data.error).toBe('Test failure');
      expect(message.payload.data.failedSpec).toBe('spec-2');
    });

    it('should broadcast phase:execution:log event', () => {
      wsManager.broadcastPhaseLog({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        timestamp: '2026-01-04T12:05:00Z',
        level: 'info',
        message: 'Starting spec: User Auth',
        specId: 'spec-1',
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('phase:execution:log');
      expect(message.payload.data.level).toBe('info');
      expect(message.payload.data.message).toBe('Starting spec: User Auth');
    });
  });

  // ===========================================================================
  // Subscription Tests
  // ===========================================================================

  describe('Subscription Handling', () => {
    it('should broadcast to all clients subscribed to phase:execution', () => {
      wsManager.broadcastPhaseStarted({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        totalSpecs: 5,
        startedAt: '2026-01-04T12:00:00Z',
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      expect(mockWs2.send).toHaveBeenCalledTimes(1);
    });

    it('should allow clients to subscribe to phase:execution channel', () => {
      const mockWs3 = createMockWSContext();
      const clientId3 = wsManager.addClient(mockWs3);

      // Client 3 should auto-subscribe to phase:execution
      const subs = wsManager.getClientSubscriptions(clientId3);
      expect(subs?.has('phase:execution')).toBe(true);
    });

    it('should handle subscribe message for additional channels', () => {
      wsManager.handleMessage(
        clientId1,
        JSON.stringify({
          type: 'subscribe',
          payload: { channels: ['phase:execution:detailed'] },
        })
      );

      const subs = wsManager.getClientSubscriptions(clientId1);
      expect(subs?.has('phase:execution:detailed')).toBe(true);
    });

    it('should handle unsubscribe message', () => {
      wsManager.handleMessage(
        clientId1,
        JSON.stringify({
          type: 'unsubscribe',
          payload: { channels: ['phase:execution'] },
        })
      );

      const subs = wsManager.getClientSubscriptions(clientId1);
      expect(subs?.has('phase:execution')).toBe(false);
    });

    it('should not broadcast to unsubscribed clients', () => {
      // Unsubscribe client 2 from phase:execution
      wsManager.handleMessage(
        clientId2,
        JSON.stringify({
          type: 'unsubscribe',
          payload: { channels: ['phase:execution'] },
        })
      );

      wsManager.broadcastPhaseStarted({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        totalSpecs: 5,
        startedAt: '2026-01-04T12:00:00Z',
      });

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      expect(mockWs2.send).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Event Payload Tests
  // ===========================================================================

  describe('Event Payload Structure', () => {
    it('should include timestamp in all events', () => {
      const beforeTime = Date.now();

      wsManager.broadcastPhaseProgress({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        overallProgress: 50,
        completedSpecs: 1,
        totalSpecs: 2,
        elapsedSeconds: 300,
      });

      const afterTime = Date.now();
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);

      expect(message.payload.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(message.payload.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include executionId and phaseId in all events', () => {
      wsManager.broadcastPhaseProgress({
        executionId: 'exec-456',
        phaseId: 'phase-2',
        phaseTitle: 'Advanced Features',
        overallProgress: 25,
        completedSpecs: 0,
        totalSpecs: 4,
        elapsedSeconds: 120,
      });

      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.payload.executionId).toBe('exec-456');
      expect(message.payload.phaseId).toBe('phase-2');
    });
  });

  // ===========================================================================
  // Multi-Client Tests
  // ===========================================================================

  describe('Multi-Client Broadcasting', () => {
    it('should broadcast same message to all subscribed clients', () => {
      wsManager.broadcastPhaseProgress({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Test Phase',
        overallProgress: 75,
        completedSpecs: 3,
        totalSpecs: 4,
        elapsedSeconds: 1800,
      });

      const message1 = mockWs1.send.mock.calls[0][0];
      const message2 = mockWs2.send.mock.calls[0][0];

      // Both clients receive the same message
      expect(message1).toBe(message2);
    });

    it('should handle client removal during broadcast gracefully', () => {
      wsManager.removeClient(clientId2);

      // Should not throw even though client2 is removed
      expect(() => {
        wsManager.broadcastPhaseStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          totalSpecs: 1,
          startedAt: '2026-01-04T12:00:00Z',
        });
      }).not.toThrow();

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      expect(mockWs2.send).not.toHaveBeenCalled();
    });
  });
});
