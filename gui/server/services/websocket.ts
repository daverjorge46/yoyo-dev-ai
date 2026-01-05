/**
 * WebSocket Service
 *
 * Manages WebSocket connections for real-time updates.
 * Uses native WebSocket with heartbeat for connection health.
 */

import type { WSContext } from 'hono/ws';

// =============================================================================
// Types
// =============================================================================

export interface WSMessage {
  type:
    | 'ping'
    | 'pong'
    | 'subscribe'
    | 'unsubscribe'
    | 'sync:request'
    | 'sync:response'
    | 'execution:heartbeat'
    | 'phase:execution:starting'
    | 'file:changed'
    | 'file:created'
    | 'file:deleted'
    | 'spec:updated'
    | 'fix:updated'
    | 'task:updated'
    | 'execution:progress'
    | 'system:status'
    | 'agent:started'
    | 'agent:progress'
    | 'agent:completed'
    | 'agent:failed'
    | 'agent:log'
    | 'phase:execution:started'
    | 'phase:execution:progress'
    | 'phase:execution:paused'
    | 'phase:execution:resumed'
    | 'phase:execution:stopped'
    | 'phase:execution:completed'
    | 'phase:execution:failed'
    | 'phase:execution:log';
  payload?: {
    path?: string;
    paths?: string[];
    channels?: string[];
    event?: string;
    executionId?: string;
    phaseId?: string;
    data?: unknown;
    timestamp: number;
  };
}

// Sync state type for sync:request/response
export interface SyncState {
  status: 'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
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

// Phase execution specific types
export interface PhaseExecutionProgress {
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

export interface PhaseExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  specId?: string;
  taskId?: string;
}

interface ConnectedClient {
  ws: WSContext;
  subscriptions: Set<string>;
  lastPing: number;
  lastHeartbeat: number;
  id: string;
}

// State provider type for sync responses
export type StateProvider = () => SyncState;

// =============================================================================
// WebSocket Manager
// =============================================================================

class WebSocketManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private executionHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private clientIdCounter = 0;
  private stateProvider: StateProvider | null = null;

  // Heartbeat configuration
  private readonly EXECUTION_HEARTBEAT_INTERVAL = 5000; // 5 seconds during execution
  private readonly HEARTBEAT_TIMEOUT = 15000; // 15 seconds for stale detection

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Set the state provider for sync responses
   */
  setStateProvider(provider: StateProvider): void {
    this.stateProvider = provider;
  }

  /**
   * Register a new WebSocket connection
   */
  addClient(ws: WSContext): string {
    const id = `client-${++this.clientIdCounter}-${Date.now()}`;
    const now = Date.now();
    this.clients.set(id, {
      ws,
      subscriptions: new Set(['.yoyo-dev/']), // Default subscription
      lastPing: now,
      lastHeartbeat: now,
      id,
    });
    console.log(`[WS] Client connected: ${id} (total: ${this.clients.size})`);
    return id;
  }

  /**
   * Remove a WebSocket connection
   */
  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`[WS] Client disconnected: ${id} (total: ${this.clients.size})`);
  }

  /**
   * Handle incoming message from client
   */
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
          if (msg.payload?.paths) {
            msg.payload.paths.forEach((path) => client.subscriptions.add(path));
            console.log(`[WS] Client ${clientId} subscribed to paths:`, msg.payload.paths);
          }
          if (msg.payload?.channels) {
            msg.payload.channels.forEach((channel) => client.subscriptions.add(channel));
            console.log(`[WS] Client ${clientId} subscribed to channels:`, msg.payload.channels);
          }
          break;

        case 'unsubscribe':
          if (msg.payload?.paths) {
            msg.payload.paths.forEach((path) => client.subscriptions.delete(path));
          }
          if (msg.payload?.channels) {
            msg.payload.channels.forEach((channel) => client.subscriptions.delete(channel));
            console.log(`[WS] Client ${clientId} unsubscribed from channels:`, msg.payload.channels);
          }
          break;

        default:
          console.log(`[WS] Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      console.error(`[WS] Failed to parse message from ${clientId}:`, err);
    }
  }

  // ===========================================================================
  // Sync Protocol
  // ===========================================================================

  /**
   * Handle sync:request - send current execution state to client
   */
  handleSyncRequest(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const state = this.stateProvider?.() ?? this.getDefaultSyncState();
    console.log(`[WS] Sending sync:response to ${clientId} (status: ${state.status})`);

    this.sendToClient(clientId, {
      type: 'sync:response',
      payload: {
        timestamp: Date.now(),
        data: state,
      },
    });
  }

  /**
   * Get default sync state when no provider is set
   */
  private getDefaultSyncState(): SyncState {
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

  // ===========================================================================
  // Execution Heartbeat
  // ===========================================================================

  /**
   * Start execution heartbeat (every 5 seconds during active execution)
   */
  startExecutionHeartbeat(): void {
    if (this.executionHeartbeatInterval) return;

    console.log('[WS] Starting execution heartbeat');
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
    }, this.EXECUTION_HEARTBEAT_INTERVAL);
  }

  /**
   * Stop execution heartbeat
   */
  stopExecutionHeartbeat(): void {
    if (this.executionHeartbeatInterval) {
      console.log('[WS] Stopping execution heartbeat');
      clearInterval(this.executionHeartbeatInterval);
      this.executionHeartbeatInterval = null;
    }
  }

  /**
   * Check for clients that haven't received heartbeat in configured timeout
   * Returns list of stale client IDs
   */
  checkHeartbeatTimeout(timeoutMs?: number): string[] {
    const timeout = timeoutMs ?? this.HEARTBEAT_TIMEOUT;
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [id, client] of this.clients) {
      if (now - client.lastHeartbeat > timeout) {
        staleClients.push(id);
      }
    }

    return staleClients;
  }

  /**
   * Broadcast phase starting (pre-flight validation in progress)
   */
  broadcastPhaseStarting(data: {
    executionId: string;
    phaseId: string;
    phaseTitle: string;
    phaseGoal?: string;
  }): void {
    this.broadcast({
      type: 'phase:execution:starting',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error(`[WS] Failed to send to ${clientId}:`, err);
      this.removeClient(clientId);
    }
  }

  /**
   * Broadcast message to all clients subscribed to the path
   */
  broadcast(message: WSMessage, path?: string): void {
    const messageStr = JSON.stringify(message);

    for (const [id, client] of this.clients) {
      // Check if client is subscribed to this path
      if (path) {
        const isSubscribed = Array.from(client.subscriptions).some(
          (sub) => path.startsWith(sub) || sub.startsWith(path)
        );
        if (!isSubscribed) continue;
      }

      try {
        client.ws.send(messageStr);
      } catch (err) {
        console.error(`[WS] Failed to broadcast to ${id}:`, err);
        this.removeClient(id);
      }
    }
  }

  /**
   * Broadcast file change event
   */
  broadcastFileChange(
    eventType: 'file:changed' | 'file:created' | 'file:deleted',
    path: string
  ): void {
    this.broadcast(
      {
        type: eventType,
        payload: {
          path,
          event: eventType.split(':')[1],
          timestamp: Date.now(),
        },
      },
      path
    );
  }

  /**
   * Broadcast spec update
   */
  broadcastSpecUpdate(specName: string, progress: number, status: string): void {
    this.broadcast({
      type: 'spec:updated',
      payload: {
        data: { name: specName, progress, status },
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast fix update
   */
  broadcastFixUpdate(fixName: string, progress: number, status: string): void {
    this.broadcast({
      type: 'fix:updated',
      payload: {
        data: { name: fixName, progress, status },
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast execution progress
   */
  broadcastExecutionProgress(data: {
    isRunning: boolean;
    specName?: string;
    phase?: string;
    currentTask?: string;
    percentage?: number;
  }): void {
    this.broadcast({
      type: 'execution:progress',
      payload: {
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast system status
   */
  broadcastSystemStatus(data: {
    mcp?: { connected: boolean; servers?: string[] };
    git?: { branch: string; uncommitted: number };
    memory?: { blockCount: number };
  }): void {
    this.broadcast({
      type: 'system:status',
      payload: {
        data,
        timestamp: Date.now(),
      },
    });
  }

  // ===========================================================================
  // Phase Execution Events
  // ===========================================================================

  /**
   * Broadcast phase execution started
   */
  broadcastPhaseStarted(data: {
    executionId: string;
    phaseId: string;
    phaseTitle: string;
    totalSpecs: number;
    startedAt: string;
  }): void {
    this.broadcast({
      type: 'phase:execution:started',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast phase execution progress
   */
  broadcastPhaseProgress(data: PhaseExecutionProgress): void {
    this.broadcast({
      type: 'phase:execution:progress',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast phase execution paused
   */
  broadcastPhasePaused(data: {
    executionId: string;
    phaseId: string;
    currentSpec?: string;
    currentTask?: string;
    pausedAt: string;
  }): void {
    this.broadcast({
      type: 'phase:execution:paused',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast phase execution resumed
   */
  broadcastPhaseResumed(data: {
    executionId: string;
    phaseId: string;
    currentSpec?: string;
    currentTask?: string;
    resumedAt: string;
  }): void {
    this.broadcast({
      type: 'phase:execution:resumed',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast phase execution stopped
   */
  broadcastPhaseStopped(data: {
    executionId: string;
    phaseId: string;
    reason?: string;
    stoppedAt: string;
    completedSpecs: number;
    totalSpecs: number;
  }): void {
    this.broadcast({
      type: 'phase:execution:stopped',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast phase execution completed
   */
  broadcastPhaseCompleted(data: {
    executionId: string;
    phaseId: string;
    phaseTitle: string;
    completedAt: string;
    totalSpecs: number;
    totalTasks: number;
    durationSeconds: number;
  }): void {
    this.broadcast({
      type: 'phase:execution:completed',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast phase execution failed
   */
  broadcastPhaseFailed(data: {
    executionId: string;
    phaseId: string;
    error: string;
    failedAt: string;
    failedSpec?: string;
    failedTask?: string;
  }): void {
    this.broadcast({
      type: 'phase:execution:failed',
      payload: {
        executionId: data.executionId,
        phaseId: data.phaseId,
        data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Broadcast phase execution log
   */
  broadcastPhaseLog(log: PhaseExecutionLog & { executionId: string; phaseId: string }): void {
    this.broadcast({
      type: 'phase:execution:log',
      payload: {
        executionId: log.executionId,
        phaseId: log.phaseId,
        data: log,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Start heartbeat to check connection health
   */
  private startHeartbeat(): void {
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds
    const TIMEOUT = 60000; // 60 seconds without response = dead

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [id, client] of this.clients) {
        if (now - client.lastPing > TIMEOUT) {
          console.log(`[WS] Client ${id} timed out, removing`);
          try {
            client.ws.close(1000, 'Heartbeat timeout');
          } catch {
            // Ignore close errors
          }
          this.removeClient(id);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Stop the WebSocket manager
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Stop execution heartbeat if running
    this.stopExecutionHeartbeat();

    for (const [id, client] of this.clients) {
      try {
        client.ws.close(1000, 'Server shutdown');
      } catch {
        // Ignore close errors
      }
    }
    this.clients.clear();
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
