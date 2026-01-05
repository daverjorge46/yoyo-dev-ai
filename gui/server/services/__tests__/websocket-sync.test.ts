/**
 * WebSocket State Sync Protocol Tests
 *
 * Tests for sync:request/response message handling, heartbeat during execution,
 * and connection state tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// =============================================================================
// Types
// =============================================================================

type ExecutionStatus = 'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';

interface SyncState {
  status: ExecutionStatus;
  executionId: string | null;
  phaseId: string | null;
  phaseTitle: string | null;
  phaseGoal: string | null;
  overallProgress: number;
  currentSpec: {
    id: string;
    title: string;
    progress: number;
    currentTask?: string;
  } | null;
  specs: Array<{
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    progress: number;
  }>;
  metrics: {
    startedAt: string;
    elapsedSeconds: number;
    completedSpecs: number;
    totalSpecs: number;
    completedTasks: number;
    totalTasks: number;
  } | null;
  error: string | null;
  errorCode?: string;
}

interface WSMessage {
  type: string;
  payload?: {
    timestamp: number;
    data?: unknown;
    [key: string]: unknown;
  };
}

// Mock WSContext for testing
const createMockWSContext = () => ({
  send: vi.fn(),
  close: vi.fn(),
});

// =============================================================================
// Test WebSocket Manager with Sync Support
// =============================================================================

class TestWebSocketManagerWithSync {
  private clients: Map<
    string,
    {
      ws: ReturnType<typeof createMockWSContext>;
      subscriptions: Set<string>;
      lastPing: number;
      lastHeartbeat: number;
      id: string;
    }
  > = new Map();
  private clientIdCounter = 0;
  private executionHeartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // External state provider for sync responses
  private stateProvider: (() => SyncState) | null = null;

  constructor(stateProvider?: () => SyncState) {
    this.stateProvider = stateProvider ?? null;
  }

  setStateProvider(provider: () => SyncState): void {
    this.stateProvider = provider;
  }

  addClient(ws: ReturnType<typeof createMockWSContext>): string {
    const id = `client-${++this.clientIdCounter}-${Date.now()}`;
    const now = Date.now();
    this.clients.set(id, {
      ws,
      subscriptions: new Set(['.yoyo-dev/', 'phase:execution']),
      lastPing: now,
      lastHeartbeat: now,
      id,
    });
    return id;
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  getClient(id: string) {
    return this.clients.get(id);
  }

  handleMessage(clientId: string, message: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const msg: WSMessage = JSON.parse(message);

      switch (msg.type) {
        case 'ping':
          client.lastPing = Date.now();
          this.sendToClient(clientId, {
            type: 'pong',
            payload: { timestamp: Date.now() },
          });
          break;

        case 'sync:request':
          this.handleSyncRequest(clientId);
          break;

        case 'subscribe':
          if (msg.payload?.channels) {
            (msg.payload.channels as string[]).forEach((channel) =>
              client.subscriptions.add(channel)
            );
          }
          break;

        case 'unsubscribe':
          if (msg.payload?.channels) {
            (msg.payload.channels as string[]).forEach((channel) =>
              client.subscriptions.delete(channel)
            );
          }
          break;
      }
    } catch {
      // Ignore parse errors in tests
    }
  }

  /**
   * Handle sync:request - send current execution state to client
   */
  handleSyncRequest(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const state = this.stateProvider?.() ?? this.getDefaultState();

    this.sendToClient(clientId, {
      type: 'sync:response',
      payload: {
        timestamp: Date.now(),
        data: state,
      },
    });
  }

  private getDefaultState(): SyncState {
    return {
      status: 'idle',
      executionId: null,
      phaseId: null,
      phaseTitle: null,
      phaseGoal: null,
      overallProgress: 0,
      currentSpec: null,
      specs: [],
      metrics: null,
      error: null,
    };
  }

  sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch {
      this.removeClient(clientId);
    }
  }

  broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    for (const [, client] of this.clients) {
      try {
        client.ws.send(messageStr);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Start execution heartbeat (every 5 seconds during active execution)
   */
  startExecutionHeartbeat(): void {
    if (this.executionHeartbeatInterval) return;

    this.executionHeartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'execution:heartbeat',
        payload: {
          timestamp: Date.now(),
        },
      });

      // Update lastHeartbeat for all clients
      for (const [, client] of this.clients) {
        client.lastHeartbeat = Date.now();
      }
    }, 5000);
  }

  /**
   * Stop execution heartbeat
   */
  stopExecutionHeartbeat(): void {
    if (this.executionHeartbeatInterval) {
      clearInterval(this.executionHeartbeatInterval);
      this.executionHeartbeatInterval = null;
    }
  }

  /**
   * Check for clients that haven't received heartbeat in 15s
   * Returns list of stale client IDs
   */
  checkHeartbeatTimeout(timeoutMs: number = 15000): string[] {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [id, client] of this.clients) {
      if (now - client.lastHeartbeat > timeoutMs) {
        staleClients.push(id);
      }
    }

    return staleClients;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  cleanup(): void {
    this.stopExecutionHeartbeat();
    this.clients.clear();
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('WebSocket State Sync Protocol', () => {
  let wsManager: TestWebSocketManagerWithSync;
  let mockWs1: ReturnType<typeof createMockWSContext>;
  let mockWs2: ReturnType<typeof createMockWSContext>;
  let clientId1: string;
  let clientId2: string;

  beforeEach(() => {
    vi.useFakeTimers();
    wsManager = new TestWebSocketManagerWithSync();
    mockWs1 = createMockWSContext();
    mockWs2 = createMockWSContext();
    clientId1 = wsManager.addClient(mockWs1);
    clientId2 = wsManager.addClient(mockWs2);
  });

  afterEach(() => {
    wsManager.cleanup();
    vi.useRealTimers();
  });

  // ===========================================================================
  // Sync Request/Response Tests
  // ===========================================================================

  describe('Sync Request/Response', () => {
    it('should respond to sync:request with current state', () => {
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('sync:response');
      expect(message.payload.data.status).toBe('idle');
    });

    it('should include all state fields in sync:response', () => {
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      const state = message.payload.data;

      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('executionId');
      expect(state).toHaveProperty('phaseId');
      expect(state).toHaveProperty('phaseTitle');
      expect(state).toHaveProperty('overallProgress');
      expect(state).toHaveProperty('currentSpec');
      expect(state).toHaveProperty('specs');
      expect(state).toHaveProperty('metrics');
      expect(state).toHaveProperty('error');
    });

    it('should return running state when execution is in progress', () => {
      const runningState: SyncState = {
        status: 'running',
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        phaseGoal: 'Build core',
        overallProgress: 45,
        currentSpec: {
          id: 'spec-1',
          title: 'User Auth',
          progress: 30,
          currentTask: 'Implement login',
        },
        specs: [
          { id: 'spec-1', title: 'User Auth', status: 'running', progress: 30 },
          { id: 'spec-2', title: 'Dashboard', status: 'pending', progress: 0 },
        ],
        metrics: {
          startedAt: '2026-01-05T12:00:00Z',
          elapsedSeconds: 300,
          completedSpecs: 0,
          totalSpecs: 2,
          completedTasks: 3,
          totalTasks: 10,
        },
        error: null,
      };

      wsManager.setStateProvider(() => runningState);
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      const state = message.payload.data;

      expect(state.status).toBe('running');
      expect(state.executionId).toBe('exec-123');
      expect(state.phaseId).toBe('phase-1');
      expect(state.overallProgress).toBe(45);
      expect(state.currentSpec?.title).toBe('User Auth');
      expect(state.specs).toHaveLength(2);
      expect(state.metrics?.elapsedSeconds).toBe(300);
    });

    it('should return paused state correctly', () => {
      wsManager.setStateProvider(() => ({
        status: 'paused',
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        phaseGoal: null,
        overallProgress: 50,
        currentSpec: null,
        specs: [],
        metrics: null,
        error: null,
      }));

      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.payload.data.status).toBe('paused');
    });

    it('should return failed state with error details', () => {
      wsManager.setStateProvider(() => ({
        status: 'failed',
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        phaseGoal: null,
        overallProgress: 30,
        currentSpec: null,
        specs: [],
        metrics: null,
        error: 'Ralph process crashed',
        errorCode: 'PROCESS_CRASHED',
      }));

      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.payload.data.status).toBe('failed');
      expect(message.payload.data.error).toBe('Ralph process crashed');
      expect(message.payload.data.errorCode).toBe('PROCESS_CRASHED');
    });

    it('should include timestamp in sync:response', () => {
      const beforeTime = Date.now();
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));
      const afterTime = Date.now();

      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.payload.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(message.payload.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should only send sync:response to requesting client', () => {
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      expect(mockWs2.send).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Heartbeat Tests
  // ===========================================================================

  describe('Execution Heartbeat', () => {
    it('should broadcast heartbeat every 5 seconds during execution', () => {
      wsManager.startExecutionHeartbeat();

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      expect(mockWs2.send).toHaveBeenCalledTimes(1);

      const message = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(message.type).toBe('execution:heartbeat');
      expect(message.payload).toHaveProperty('timestamp');
    });

    it('should send multiple heartbeats over time', () => {
      wsManager.startExecutionHeartbeat();

      vi.advanceTimersByTime(15000); // 3 heartbeats

      expect(mockWs1.send).toHaveBeenCalledTimes(3);
    });

    it('should stop heartbeat when stopExecutionHeartbeat is called', () => {
      wsManager.startExecutionHeartbeat();
      vi.advanceTimersByTime(5000); // 1 heartbeat

      wsManager.stopExecutionHeartbeat();
      vi.advanceTimersByTime(10000); // Would be 2 more heartbeats

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
    });

    it('should not start duplicate heartbeat intervals', () => {
      wsManager.startExecutionHeartbeat();
      wsManager.startExecutionHeartbeat(); // Second call should be ignored

      vi.advanceTimersByTime(5000);

      expect(mockWs1.send).toHaveBeenCalledTimes(1); // Only 1, not 2
    });

    it('should update client lastHeartbeat on heartbeat', () => {
      const initialTime = Date.now();
      wsManager.startExecutionHeartbeat();

      vi.advanceTimersByTime(5000);

      const client = wsManager.getClient(clientId1);
      expect(client?.lastHeartbeat).toBeGreaterThan(initialTime);
    });
  });

  // ===========================================================================
  // Heartbeat Timeout Tests
  // ===========================================================================

  describe('Heartbeat Timeout Detection', () => {
    it('should detect clients that exceed heartbeat timeout', () => {
      // Don't start heartbeat, so clients become stale
      vi.advanceTimersByTime(20000); // 20 seconds without heartbeat

      const staleClients = wsManager.checkHeartbeatTimeout(15000);
      expect(staleClients).toHaveLength(2);
      expect(staleClients).toContain(clientId1);
      expect(staleClients).toContain(clientId2);
    });

    it('should not report clients within timeout window', () => {
      vi.advanceTimersByTime(10000); // 10 seconds

      const staleClients = wsManager.checkHeartbeatTimeout(15000);
      expect(staleClients).toHaveLength(0);
    });

    it('should report only stale clients when some are fresh', () => {
      vi.advanceTimersByTime(20000);

      // Add a fresh client
      const mockWs3 = createMockWSContext();
      wsManager.addClient(mockWs3);

      const staleClients = wsManager.checkHeartbeatTimeout(15000);
      expect(staleClients).toHaveLength(2); // Only original 2 clients
    });

    it('should use custom timeout value', () => {
      vi.advanceTimersByTime(8000);

      const staleClients = wsManager.checkHeartbeatTimeout(5000);
      expect(staleClients).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Sync and Heartbeat Integration', () => {
    it('should maintain sync state while heartbeat is running', () => {
      const runningState: SyncState = {
        status: 'running',
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        phaseGoal: 'Build core',
        overallProgress: 50,
        currentSpec: null,
        specs: [],
        metrics: {
          startedAt: '2026-01-05T12:00:00Z',
          elapsedSeconds: 300,
          completedSpecs: 1,
          totalSpecs: 2,
          completedTasks: 5,
          totalTasks: 10,
        },
        error: null,
      };

      wsManager.setStateProvider(() => runningState);
      wsManager.startExecutionHeartbeat();

      vi.advanceTimersByTime(5000); // First heartbeat

      // Request sync after heartbeat
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      // Should have 1 heartbeat + 1 sync response
      expect(mockWs1.send).toHaveBeenCalledTimes(2);

      // Verify sync response has correct state
      const syncMessage = JSON.parse(mockWs1.send.mock.calls[1][0]);
      expect(syncMessage.type).toBe('sync:response');
      expect(syncMessage.payload.data.status).toBe('running');
      expect(syncMessage.payload.data.overallProgress).toBe(50);
    });

    it('should handle multiple sync requests during execution', () => {
      wsManager.startExecutionHeartbeat();

      // Multiple sync requests
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));
      wsManager.handleMessage(clientId2, JSON.stringify({ type: 'sync:request' }));

      expect(mockWs1.send).toHaveBeenCalledTimes(1);
      expect(mockWs2.send).toHaveBeenCalledTimes(1);
    });

    it('should allow ping/pong during sync', () => {
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'ping' }));
      wsManager.handleMessage(clientId1, JSON.stringify({ type: 'sync:request' }));

      expect(mockWs1.send).toHaveBeenCalledTimes(2);

      const pongMessage = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(pongMessage.type).toBe('pong');

      const syncMessage = JSON.parse(mockWs1.send.mock.calls[1][0]);
      expect(syncMessage.type).toBe('sync:response');
    });
  });
});
