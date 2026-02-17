/**
 * Gateway WebSocket Proxy
 *
 * Proxies WebSocket connections from the browser to the YoyoClaw gateway.
 * The server connects as `node-host` (no origin/secure-context restrictions),
 * then transparently forwards all frames between browser and gateway.
 *
 * The browser's `connect` handshake frame is intercepted and rewritten
 * with the correct client ID, mode, and auth token.
 */

import WebSocket from 'ws';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

// Prefer ~/.yoyoclaw/yoyoclaw.json, fall back to legacy ~/.openclaw path
const YOYOCLAW_CONFIG = join(homedir(), '.yoyoclaw', 'yoyoclaw.json');
const LEGACY_CONFIG = join(homedir(), '.openclaw', 'openclaw.json');
const DEFAULT_GATEWAY_HOST = '127.0.0.1';
const DEFAULT_GATEWAY_PORT = 18789;

interface YoyoClawConfig {
  gateway?: {
    port?: number;
    auth?: {
      token?: string;
    };
  };
}

async function resolveConfigPath(): Promise<string> {
  // Check env override first
  const envPath = process.env.YOYO_CLAW_CONFIG_PATH;
  if (envPath) {
    try { await access(envPath); return envPath; } catch { /* fall through */ }
  }
  // Prefer ~/.yoyoclaw/yoyoclaw.json
  try { await access(YOYOCLAW_CONFIG); return YOYOCLAW_CONFIG; } catch { /* fall through */ }
  // Fall back to legacy ~/.openclaw
  return LEGACY_CONFIG;
}

async function readConfig(): Promise<YoyoClawConfig> {
  const configPath = await resolveConfigPath();
  const raw = await readFile(configPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Create a proxied gateway connection.
 * Returns cleanup function.
 */
export function createGatewayProxy(
  browserWs: {
    send: (data: string) => void;
    close: () => void;
  },
  onClose?: () => void,
): { cleanup: () => void; handleBrowserMessage: (raw: string) => void } {
  let gatewayWs: WebSocket | null = null;
  let cleaned = false;
  let gatewayConnected = false;
  const pendingMessages: string[] = [];

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (gatewayWs) {
      gatewayWs.removeAllListeners();
      if (gatewayWs.readyState === WebSocket.OPEN || gatewayWs.readyState === WebSocket.CONNECTING) {
        gatewayWs.close();
      }
      gatewayWs = null;
    }
    onClose?.();
  };

  // Initialize asynchronously
  (async () => {
    try {
      const config = await readConfig();
      const token = config?.gateway?.auth?.token;
      if (!token) {
        browserWs.send(JSON.stringify({
          type: 'res',
          id: 'proxy-error',
          ok: false,
          error: { code: 'CONFIG_ERROR', message: 'Gateway auth token not configured' },
        }));
        browserWs.close();
        return;
      }

      const port = config?.gateway?.port || DEFAULT_GATEWAY_PORT;
      const url = `ws://${DEFAULT_GATEWAY_HOST}:${port}`;

      gatewayWs = new WebSocket(url);

      gatewayWs.on('open', () => {
        console.log('[gateway-proxy] Connected to YoyoClaw gateway');
        gatewayConnected = true;
        // Flush any messages that arrived while connecting
        for (const msg of pendingMessages) {
          gatewayWs!.send(msg);
        }
        if (pendingMessages.length > 0) {
          console.log('[gateway-proxy] Flushed', pendingMessages.length, 'pending messages');
        }
        pendingMessages.length = 0;
      });

      gatewayWs.on('message', (data) => {
        if (cleaned) return;
        try {
          browserWs.send(data.toString());
        } catch {
          // Browser disconnected
          cleanup();
        }
      });

      gatewayWs.on('close', (code, reason) => {
        console.log('[gateway-proxy] Gateway connection closed:', code, reason?.toString() || '');
        if (!cleaned) {
          try { browserWs.close(); } catch { /* already closed */ }
          cleanup();
        }
      });

      gatewayWs.on('error', (err) => {
        console.error('[gateway-proxy] Gateway WS error:', err.message);
        if (!cleaned) {
          try {
            browserWs.send(JSON.stringify({
              type: 'res',
              id: 'proxy-error',
              ok: false,
              error: { code: 'PROXY_ERROR', message: `Gateway connection failed: ${err.message}` },
            }));
          } catch { /* ignore */ }
          cleanup();
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[gateway-proxy] Init error:', msg);
      try {
        browserWs.send(JSON.stringify({
          type: 'res',
          id: 'proxy-error',
          ok: false,
          error: { code: 'PROXY_ERROR', message: msg },
        }));
        browserWs.close();
      } catch { /* ignore */ }
      cleanup();
    }
  })();

  return {
    cleanup,
    // Called when browser sends a message
    handleBrowserMessage(raw: string) {
      if (cleaned) return;

      try {
        const frame = JSON.parse(raw);

        // Intercept the connect handshake and rewrite for server-side auth
        if (frame.type === 'req' && frame.method === 'connect' && frame.params) {
          readConfig().then((config) => {
            const token = config?.gateway?.auth?.token;
            if (token) {
              frame.params.client = {
                id: 'gateway-client',
                displayName: frame.params.client?.displayName || 'Yoyo AI Dashboard',
                version: frame.params.client?.version || '2.0.0',
                platform: frame.params.client?.platform || 'linux',
                mode: 'backend',
                instanceId: frame.params.client?.instanceId || randomUUID(),
              };
              frame.params.auth = { token };
              // Remove control-ui specific fields not needed for backend client
              delete frame.params.role;
              delete frame.params.scopes;
            }
            const rewritten = JSON.stringify(frame);
            if (gatewayConnected && gatewayWs) {
              gatewayWs.send(rewritten);
            } else {
              pendingMessages.push(rewritten);
            }
          }).catch(() => {
            // Forward as-is if config read fails
            if (gatewayConnected && gatewayWs) {
              gatewayWs.send(raw);
            } else {
              pendingMessages.push(raw);
            }
          });
          return;
        }
      } catch {
        // Not JSON or parse error - forward as-is
      }

      // Forward all other messages as-is
      if (gatewayConnected && gatewayWs) {
        gatewayWs.send(raw);
      } else {
        pendingMessages.push(raw);
      }
    },
  };
}
