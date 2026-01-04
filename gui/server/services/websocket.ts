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
  id: string;
}

// =============================================================================
// WebSocket Manager
// =============================================================================

class WebSocketManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private clientIdCounter = 0;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Register a new WebSocket connection
   */
  addClient(ws: WSContext): string {
    const id = `client-${++this.clientIdCounter}-${Date.now()}`;
    this.clients.set(id, {
      ws,
      subscriptions: new Set(['.yoyo-dev/']), // Default subscription
      lastPing: Date.now(),
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
