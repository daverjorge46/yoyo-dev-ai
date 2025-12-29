/**
 * WebSocket/SSE Backend Server
 *
 * Provides real-time state synchronization between TUI and GUI via:
 * - WebSocket connections on port 3457
 * - Event-based pub/sub (task_updated, spec_changed, git_status)
 * - Graceful connection handling and cleanup
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { stateEvents, StateEvent } from './state-manager.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_PORT = 3457;
const DEFAULT_HOST = 'localhost';
const DEFAULT_HEARTBEAT_INTERVAL = 30000; // 30 seconds

// =============================================================================
// WebSocket Server
// =============================================================================

export class BackendServer {
  private wss: WebSocketServer | null = null;
  private httpServer: ReturnType<typeof createServer> | null = null;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private host: string;
  private port: number;
  private heartbeatMs: number;

  constructor(host: string = DEFAULT_HOST, port: number = DEFAULT_PORT, heartbeatMs: number = DEFAULT_HEARTBEAT_INTERVAL) {
    this.host = host;
    this.port = port;
    this.heartbeatMs = heartbeatMs;
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.httpServer = createServer((req, res) => {
          if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
          } else {
            res.writeHead(404);
            res.end();
          }
        });

        // Create WebSocket server
        this.wss = new WebSocketServer({ server: this.httpServer });

        // Handle connections
        this.wss.on('connection', (ws: WebSocket) => {
          this.handleConnection(ws);
        });

        // Handle errors
        this.wss.on('error', (error) => {
          console.error('WebSocket server error:', error);
          reject(error);
        });

        // Start HTTP server
        this.httpServer.listen(this.port, this.host, () => {
          console.log(`[Backend] WebSocket server running on port ${this.port}`);
          this.setupStateEventListeners();
          this.startHeartbeat();
          resolve();
        });

        this.httpServer.on('error', (error) => {
          console.error('HTTP server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Close all client connections
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });
      this.clients.clear();

      // Close WebSocket server
      if (this.wss) {
        this.wss.close(() => {
          // Close HTTP server
          if (this.httpServer) {
            this.httpServer.close(() => {
              console.log('[Backend] Server stopped');
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log('[Backend] New client connected');
    this.clients.add(ws);

    // Send initial state
    this.sendInitialState(ws);

    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('[Backend] Invalid message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('[Backend] Client disconnected');
      this.clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('[Backend] WebSocket error:', error);
      this.clients.delete(ws);
    });

    // Pong response for heartbeat
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });
  }

  /**
   * Send initial state to newly connected client
   */
  private sendInitialState(ws: WebSocket): void {
    // TODO: Get current state from state manager and send to client
    this.sendMessage(ws, {
      type: 'init',
      payload: {
        tasks: [],
        specs: [],
        git: { branch: null, modified: 0, added: 0, deleted: 0, ahead: 0, behind: 0 },
        mcp: { serverCount: 0, connected: false },
        memory: { blockCount: 0, lastUpdated: null },
      },
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(ws: WebSocket, message: any): void {
    const { type, payload } = message;

    switch (type) {
      case 'subscribe':
        // Client subscribing to events (default behavior, all clients auto-subscribed)
        break;
      case 'ping':
        this.sendMessage(ws, { type: 'pong' });
        break;
      default:
        console.warn('[Backend] Unknown message type:', type);
    }
  }

  /**
   * Send message to specific client
   */
  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: any): void {
    const payload = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Setup listeners for state events from state manager
   */
  private setupStateEventListeners(): void {
    stateEvents.on('task_updated', (data) => {
      this.broadcast({ type: 'task_updated', payload: data });
    });

    stateEvents.on('spec_changed', (data) => {
      this.broadcast({ type: 'spec_changed', payload: data });
    });

    stateEvents.on('git_status', (data) => {
      this.broadcast({ type: 'git_status', payload: data });
    });

    stateEvents.on('mcp_status', (data) => {
      this.broadcast({ type: 'mcp_status', payload: data });
    });

    stateEvents.on('memory_status', (data) => {
      this.broadcast({ type: 'memory_status', payload: data });
    });

    stateEvents.on('execution_log', (data) => {
      this.broadcast({ type: 'execution_log', payload: data });
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          this.clients.delete(ws);
          return ws.terminate();
        }

        (ws as any).isAlive = false;
        ws.ping();
      });
    }, this.heartbeatMs);
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const backendServer = new BackendServer();

// =============================================================================
// Start Server (if run directly)
// =============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  backendServer.start().then(() => {
    console.log('[Backend] Server started successfully');
  }).catch((error) => {
    console.error('[Backend] Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Backend] Shutting down...');
    await backendServer.stop();
    process.exit(0);
  });
}
