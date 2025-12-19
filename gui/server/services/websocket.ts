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
    | 'file:changed'
    | 'file:created'
    | 'file:deleted'
    | 'spec:updated'
    | 'fix:updated'
    | 'task:updated'
    | 'execution:progress'
    | 'system:status';
  payload?: {
    path?: string;
    paths?: string[];
    event?: string;
    data?: unknown;
    timestamp: number;
  };
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
            console.log(`[WS] Client ${clientId} subscribed to:`, msg.payload.paths);
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
