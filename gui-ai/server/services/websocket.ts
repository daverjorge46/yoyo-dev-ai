import type { WSContext } from 'hono/ws';

interface WSMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export class WebSocketManager {
  private clients: Map<string, WSContext> = new Map();
  private clientIds: Map<WSContext, string> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private idCounter = 0;

  addClient(ws: WSContext): string {
    const clientId = `client_${Date.now()}_${++this.idCounter}`;
    this.clients.set(clientId, ws);
    this.clientIds.set(ws, clientId);
    return clientId;
  }

  removeClient(ws: WSContext): void {
    const clientId = this.clientIds.get(ws);
    if (clientId) {
      this.clients.delete(clientId);
      this.clientIds.delete(ws);

      // Remove from all subscriptions
      for (const subscribers of this.subscriptions.values()) {
        subscribers.delete(clientId);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  handleMessage(ws: WSContext, message: WSMessage): void {
    const clientId = this.clientIds.get(ws);
    if (!clientId) return;

    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
        break;

      case 'subscribe':
        const channel = message.payload?.channel as string;
        if (channel) {
          if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
          }
          this.subscriptions.get(channel)!.add(clientId);
        }
        break;

      case 'unsubscribe':
        const unsub = message.payload?.channel as string;
        if (unsub) {
          this.subscriptions.get(unsub)?.delete(clientId);
        }
        break;
    }
  }

  broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.clients.values()) {
      try {
        ws.send(data);
      } catch (error) {
        console.error('Failed to broadcast to client:', error);
      }
    }
  }

  broadcastToChannel(channel: string, message: WSMessage): void {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return;

    const data = JSON.stringify(message);
    for (const clientId of subscribers) {
      const ws = this.clients.get(clientId);
      if (ws) {
        try {
          ws.send(data);
        } catch (error) {
          console.error('Failed to send to subscriber:', error);
        }
      }
    }
  }

  sendToClient(clientId: string, message: WSMessage): void {
    const ws = this.clients.get(clientId);
    if (ws) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send to client:', error);
      }
    }
  }
}
