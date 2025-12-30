/**
 * WebSocket API Client
 *
 * Handles real-time connection to backend server with:
 * - Auto-reconnect with exponential backoff
 * - Event handling for state updates
 * - Offline fallback (reads filesystem directly)
 * - Connection state management
 */

import WebSocket from 'ws';
import EventEmitter from 'events';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ApiClientConfig {
  host: string;
  port: number;
  reconnectInterval?: number; // Base interval in ms (default: 1000)
  maxReconnectInterval?: number; // Max interval in ms (default: 30000)
  reconnectDecay?: number; // Multiplier for exponential backoff (default: 1.5)
  maxReconnectAttempts?: number; // Max attempts before giving up (default: Infinity)
}

export interface StateUpdateEvent {
  type: 'task_updated' | 'spec_changed' | 'git_status' | 'mcp_status' | 'memory_status' | 'heartbeat' | 'init' | 'pong';
  payload?: any;
  data?: any; // Backwards compatibility
}

export class ApiClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<ApiClientConfig>;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private debug = false; // Disable logging to avoid interfering with Ink

  constructor(config: ApiClientConfig) {
    super();
    this.config = {
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      reconnectDecay: 1.5,
      maxReconnectAttempts: Infinity,
      ...config,
    };
  }

  /**
   * Log message (only when debug is enabled)
   * Using stderr to avoid interfering with Ink's stdout rendering
   */
  private log(message: string): void {
    if (this.debug) {
      process.stderr.write(`[ApiClient] ${message}\n`);
    }
  }

  /**
   * Connect to backend WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.log('Already connected');
      return;
    }

    this.isManualClose = false;
    this.setConnectionState('connecting');

    const url = `ws://${this.config.host}:${this.config.port}`;
    this.log(`Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.log('Connected successfully');
        this.setConnectionState('connected');
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        this.emit('connected');
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.log(`Failed to parse message: ${error}`);
        }
      });

      this.ws.on('close', () => {
        this.log('Connection closed');
        this.setConnectionState('disconnected');
        this.emit('disconnected');

        // Auto-reconnect unless manually closed
        if (!this.isManualClose) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        // Silently handle errors - just update state
        // Don't emit 'error' event as it throws if no listeners (Node.js EventEmitter behavior)
        this.setConnectionState('error');
        // Emit a safe event that won't throw
        this.emit('connection_error', err);
      });
    } catch (error) {
      this.log(`Failed to create WebSocket: ${error}`);
      this.setConnectionState('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState('disconnected');
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Send message to server (if connected)
   */
  send(message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Cannot send message: not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.log(`Failed to send message: ${error}`);
      return false;
    }
  }

  /**
   * Handle incoming message from server
   */
  private handleMessage(message: StateUpdateEvent): void {
    // Support both 'payload' and 'data' fields for backwards compatibility
    const eventData = message.payload ?? message.data;

    // Emit specific event type
    this.emit(message.type, eventData);

    // Also emit generic 'state_update' event
    this.emit('state_update', message);
  }

  /**
   * Update connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection_state', state);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached, giving up');
      this.emit('reconnect_failed');
      return;
    }

    // Calculate backoff interval
    const interval = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectDecay, this.reconnectAttempts),
      this.config.maxReconnectInterval
    );

    this.reconnectAttempts++;
    this.log(`Reconnecting in ${interval}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, interval);
  }
}

/**
 * Singleton instance for shared connection
 */
let sharedClient: ApiClient | null = null;

export function getApiClient(config?: ApiClientConfig): ApiClient {
  if (!sharedClient && config) {
    sharedClient = new ApiClient(config);
  }

  if (!sharedClient) {
    throw new Error('ApiClient not initialized. Call getApiClient(config) first.');
  }

  return sharedClient;
}
