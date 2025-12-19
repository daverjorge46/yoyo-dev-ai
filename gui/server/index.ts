/**
 * Yoyo Dev GUI Server
 *
 * Hono-based API server for the browser GUI with WebSocket support.
 */

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { statusRoutes } from './routes/status.js';
import { specsRoutes } from './routes/specs.js';
import { tasksRoutes } from './routes/tasks.js';
import { memoryRoutes } from './routes/memory.js';
import { skillsRoutes } from './routes/skills.js';
import { filesRoutes } from './routes/files.js';
import { wsManager } from './services/websocket.js';
import { fileWatcher } from './services/file-watcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// App Setup
// =============================================================================

const app = new Hono();

// Create WebSocket helper
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// =============================================================================
// WebSocket Route
// =============================================================================

app.get(
  '/ws',
  upgradeWebSocket(() => {
    let clientId: string;

    return {
      onOpen(_event, ws) {
        clientId = wsManager.addClient(ws);
        // Send initial connection confirmation
        ws.send(
          JSON.stringify({
            type: 'connected',
            payload: { clientId, timestamp: Date.now() },
          })
        );
      },
      onMessage(event, _ws) {
        if (typeof event.data === 'string') {
          wsManager.handleMessage(clientId, event.data);
        }
      },
      onClose() {
        if (clientId) {
          wsManager.removeClient(clientId);
        }
      },
      onError(error) {
        console.error('[WS] Error:', error);
        if (clientId) {
          wsManager.removeClient(clientId);
        }
      },
    };
  })
);

// =============================================================================
// API Routes
// =============================================================================

app.route('/api/status', statusRoutes);
app.route('/api/specs', specsRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/skills', skillsRoutes);
app.route('/api/files', filesRoutes);

// Health check with WebSocket status
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocket: {
      clients: wsManager.getClientCount(),
    },
    fileWatcher: {
      running: fileWatcher.isRunning(),
    },
  });
});

// =============================================================================
// Static Files (Production)
// =============================================================================

const clientDistPath = join(__dirname, '..', 'dist', 'client');

if (existsSync(clientDistPath)) {
  // Production: serve built files
  app.use('/*', serveStatic({ root: clientDistPath }));

  // SPA fallback
  app.get('*', async (c) => {
    const { readFileSync } = await import('fs');
    const html = readFileSync(join(clientDistPath, 'index.html'), 'utf-8');
    return c.html(html);
  });
}

// =============================================================================
// Server Start
// =============================================================================

export interface ServerOptions {
  port?: number;
  projectRoot?: string;
  open?: boolean;
}

export async function startServer(options: ServerOptions = {}) {
  const port = options.port ?? 3456;
  // Priority: options > env var > cwd
  const projectRoot =
    options.projectRoot ?? process.env.YOYO_PROJECT_ROOT ?? process.cwd();

  // Store project root in context for routes
  app.use('*', async (c, next) => {
    c.set('projectRoot', projectRoot);
    await next();
  });

  console.log(`\n  Yoyo Dev GUI`);
  console.log(`  ============`);
  console.log(`  Project: ${projectRoot}`);
  console.log(`  Server:  http://localhost:${port}`);
  console.log(`  API:     http://localhost:${port}/api`);
  console.log(`  WS:      ws://localhost:${port}/ws`);
  console.log(`\n  Press Ctrl+C to stop\n`);

  // Start file watcher
  fileWatcher.start({ projectRoot, debounceMs: 100 });

  // Create server with WebSocket support
  const server = serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`  Listening on port ${info.port}`);
    }
  );

  // Inject WebSocket handling into the server
  injectWebSocket(server);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n  Shutting down...');
    await fileWatcher.stop();
    wsManager.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Open browser if requested
  if (options.open) {
    const open = (await import('open')).default;
    await open(`http://localhost:${port}`);
  }
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Don't auto-open browser - let the shell script handle it
  // This prevents opening wrong port in dev mode (5173 vs 3456)
  const shouldOpen = process.env.YOYO_GUI_OPEN === 'true';
  startServer({ open: shouldOpen });
}

export { app };
