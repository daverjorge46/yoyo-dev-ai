import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import { statusRouter } from './routes/status.js';
import { chatRouter } from './routes/chat.js';
import { tasksRouter } from './routes/tasks.js';
import { automationRouter } from './routes/automation.js';
import { documentsRouter } from './routes/documents.js';
import { messagesRouter } from './routes/messages.js';
import { connectionsRouter } from './routes/connections.js';
import { analyticsRouter } from './routes/analytics.js';
import { quickActionsRouter } from './routes/quick-actions.js';
import { settingsRouter } from './routes/settings.js';
import { gatewayTokenRouter } from './routes/gateway-token.js';
import { gatewayConfigRouter } from './routes/gateway-config.js';

// Services
import { WebSocketManager } from './services/websocket.js';
import { createGatewayProxy } from './services/gatewayProxy.js';
import { initDatabase } from './lib/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3457', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Create Hono app
const app = new Hono();

// WebSocket setup
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket manager instance
const wsManager = new WebSocketManager();

// Initialize database
initDatabase();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: isDev ? 'http://localhost:5174' : '*',
  credentials: true,
}));

// WebSocket endpoint
app.get('/ws', upgradeWebSocket((c) => ({
  onOpen: (_, ws) => {
    const clientId = wsManager.addClient(ws);
    ws.send(JSON.stringify({
      type: 'connected',
      payload: { clientId, timestamp: Date.now() },
    }));
  },
  onMessage: (event, ws) => {
    try {
      const message = JSON.parse(event.data.toString());
      wsManager.handleMessage(ws, message);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  },
  onClose: (_, ws) => {
    wsManager.removeClient(ws);
  },
  onError: (error) => {
    console.error('WebSocket error:', error);
  },
})));

// Gateway WebSocket proxy - proxies browser WS to OpenClaw gateway
app.get('/ws/gateway', upgradeWebSocket(() => {
  let proxy: ReturnType<typeof createGatewayProxy> | null = null;

  return {
    onOpen: (_, ws) => {
      proxy = createGatewayProxy(
        {
          send: (data: string) => ws.send(data),
          close: () => ws.close(),
        },
        () => { proxy = null; },
      );
    },
    onMessage: (event) => {
      proxy?.handleBrowserMessage(event.data.toString());
    },
    onClose: () => {
      proxy?.cleanup();
      proxy = null;
    },
    onError: () => {
      proxy?.cleanup();
      proxy = null;
    },
  };
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    clients: wsManager.getClientCount(),
  });
});

// Gateway health check — verifies connectivity to the Yoyo Claw gateway
app.get('/api/gateway/health', async (c) => {
  const { readFile, access } = await import('fs/promises');
  const { join } = await import('path');
  const { homedir } = await import('os');
  const WebSocket = (await import('ws')).default;

  const configPaths = [
    join(homedir(), '.yoyoclaw', 'yoyoclaw.json'),
    join(homedir(), '.yoyo-claw', 'yoyoclaw.json'),
    join(homedir(), '.yoyo-claw', 'openclaw.json'),
    join(homedir(), '.openclaw', 'openclaw.json'),
  ];

  let config: { gateway?: { port?: number; auth?: { token?: string } } } | null = null;
  for (const p of configPaths) {
    try {
      await access(p);
      config = JSON.parse(await readFile(p, 'utf-8'));
      break;
    } catch { /* try next */ }
  }

  if (!config) {
    return c.json({ connected: false, error: 'Config not found' }, 503);
  }

  const port = config.gateway?.port || 18789;
  const start = Date.now();

  try {
    const connected = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`, { timeout: 3000 });
      const timer = setTimeout(() => { ws.close(); resolve(false); }, 3000);
      ws.on('open', () => { clearTimeout(timer); ws.close(); resolve(true); });
      ws.on('error', () => { clearTimeout(timer); resolve(false); });
    });

    return c.json({
      connected,
      latency: Date.now() - start,
      port,
    });
  } catch {
    return c.json({ connected: false, latency: Date.now() - start, port }, 503);
  }
});

// API Routes
app.route('/api/status', statusRouter);
app.route('/api/chat', chatRouter);
app.route('/api/tasks', tasksRouter);
app.route('/api/automation', automationRouter);
app.route('/api/documents', documentsRouter);
app.route('/api/messages', messagesRouter);
app.route('/api/connections', connectionsRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/quick-actions', quickActionsRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/gateway-token', gatewayTokenRouter);
app.route('/api/gateway-config', gatewayConfigRouter);

// Serve static files in production
if (!isDev) {
  app.use('/*', serveStatic({
    root: path.join(__dirname, '../client'),
    rewriteRequestPath: (path) => path === '/' ? '/index.html' : path,
  }));

  // SPA fallback
  app.get('*', async (c) => {
    const fs = await import('fs/promises');
    const indexPath = path.join(__dirname, '../client/index.html');
    const html = await fs.readFile(indexPath, 'utf-8');
    return c.html(html);
  });
}

// Start server
const server = serve({
  fetch: app.fetch,
  port: PORT,
});

injectWebSocket(server);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 YoYo AI Workspace Server                                ║
║                                                              ║
║   Server running at: http://localhost:${PORT}                   ║
║   WebSocket at: ws://localhost:${PORT}/ws                       ║
║                                                              ║
║   Mode: ${isDev ? 'Development' : 'Production'}                                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

export { wsManager };
