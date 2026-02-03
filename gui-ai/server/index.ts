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
import { openclawRouter } from './routes/openclaw.js';

// Services
import { WebSocketManager } from './services/websocket.js';
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

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    clients: wsManager.getClientCount(),
  });
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
app.route('/api/openclaw', openclawRouter);

// Serve static files in production
if (!isDev) {
  app.use('/*', serveStatic({
    root: path.join(__dirname, '../client'),
    rewriteRequestPath: (path) => path === '/' ? '/index.html' : path,
  }));

  // SPA fallback
  app.get('*', (c) => {
    return c.html(Bun.file(path.join(__dirname, '../client/index.html')));
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
