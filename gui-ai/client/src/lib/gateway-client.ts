import type {
  RequestFrame,
  ResponseFrame,
  EventFrame,
  Frame,
  ConnectParams,
  ConnectionState,
  HelloPayload,
  GatewayError,
} from './gateway-types';

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

type EventHandler = (payload: unknown) => void;
type StateChangeHandler = (state: ConnectionState) => void;

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const PROTOCOL_VERSION = 3;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private eventListeners = new Map<string, Set<EventHandler>>();
  private stateChangeListeners = new Set<StateChangeHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private _state: ConnectionState = 'disconnected';
  private _gatewayVersion: string | null = null;
  private _lastTickTs: number | null = null;
  private _instanceId: string;
  private shouldReconnect = true;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {
    this._instanceId = crypto.randomUUID();
  }

  get state(): ConnectionState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'connected';
  }

  get gatewayVersion(): string | null {
    return this._gatewayVersion;
  }

  get lastTickTs(): number | null {
    return this._lastTickTs;
  }

  private setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    this.stateChangeListeners.forEach((h) => h(state));
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeListeners.add(handler);
    return () => {
      this.stateChangeListeners.delete(handler);
    };
  }

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') return;

    this.shouldReconnect = true;
    this.setState('connecting');

    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        this.setState('error');
        reject(err);
        return;
      }

      const onOpenError = (_e: Event) => {
        cleanup();
        this.setState('error');
        reject(new Error('WebSocket connection failed'));
      };

      const onOpenSuccess = () => {
        cleanup();
        // Send connect handshake
        this.sendConnect()
          .then(() => {
            this.reconnectAttempt = 0;
            this.setState('connected');
            resolve();
          })
          .catch((err) => {
            this.setState('error');
            this.ws?.close();
            reject(err);
          });
      };

      const cleanup = () => {
        this.ws?.removeEventListener('open', onOpenSuccess);
        this.ws?.removeEventListener('error', onOpenError);
      };

      this.ws.addEventListener('open', onOpenSuccess);
      this.ws.addEventListener('error', onOpenError);

      this.ws.onmessage = (ev) => this.handleMessage(ev);
      this.ws.onclose = () => this.handleClose();
      this.ws.onerror = () => {}; // Handled by onclose
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    // Reject all pending requests
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Client disconnected'));
    }
    this.pending.clear();
    this.setState('disconnected');
  }

  async request<T = unknown>(method: string, params?: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to gateway');
    }

    const id = crypto.randomUUID();
    const frame: RequestFrame = { type: 'req', id, method };
    if (params !== undefined) {
      frame.params = params;
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(frame));
    });
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: EventHandler): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  // --- Private Methods ---

  private async sendConnect(): Promise<HelloPayload> {
    const params: ConnectParams = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: 'yoyo-ai-gui',
        displayName: 'Yoyo AI',
        version: '1.0.0',
        platform: navigator.platform,
        mode: 'frontend',
        instanceId: this._instanceId,
      },
      caps: [],
      role: 'operator',
      scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
      auth: { token: this.token },
    };

    const payload = await this.request<HelloPayload>('connect', params, 10_000);
    return payload;
  }

  private handleMessage(ev: MessageEvent): void {
    let frame: Frame;
    try {
      frame = JSON.parse(ev.data);
    } catch {
      console.error('[GatewayClient] Failed to parse frame:', ev.data);
      return;
    }

    switch (frame.type) {
      case 'res':
        this.handleResponse(frame as ResponseFrame);
        break;
      case 'event':
        this.handleEvent(frame as EventFrame);
        break;
      default:
        // Ignore unknown frame types
        break;
    }
  }

  private handleResponse(frame: ResponseFrame): void {
    const pending = this.pending.get(frame.id);
    if (!pending) return;

    this.pending.delete(frame.id);
    clearTimeout(pending.timer);

    if (frame.ok) {
      pending.resolve(frame.payload);
    } else {
      const err = frame.error as GatewayError | undefined;
      const error = new GatewayRPCError(
        err?.message || 'Unknown gateway error',
        err?.code || 'UNKNOWN',
        err?.retryable,
        err?.retryAfterMs,
      );
      pending.reject(error);
    }
  }

  private handleEvent(frame: EventFrame): void {
    // Track tick events for heartbeat
    if (frame.event === 'tick' && frame.payload) {
      this._lastTickTs = (frame.payload as { ts: number }).ts;
    }

    // Notify listeners for this specific event
    const handlers = this.eventListeners.get(frame.event);
    if (handlers) {
      handlers.forEach((h) => h(frame.payload));
    }

    // Notify wildcard listeners
    const wildcardHandlers = this.eventListeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((h) => h(frame));
    }
  }

  private handleClose(): void {
    this.ws = null;

    // Reject all pending requests
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
    }
    this.pending.clear();

    if (this.shouldReconnect) {
      this.setState('disconnected');
      this.scheduleReconnect();
    } else {
      this.setState('disconnected');
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt++;

    console.log(`[GatewayClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        // connect() will trigger handleClose → scheduleReconnect again
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export class GatewayRPCError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable?: boolean,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'GatewayRPCError';
  }
}
