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
import type { Variables } from './types.js';

import { statusRoutes } from './routes/status.js';
import { specsRoutes } from './routes/specs.js';
import { tasksRoutes } from './routes/tasks.js';
import { memoryRoutes } from './routes/memory.js';
import { skillsRoutes } from './routes/skills.js';
import { filesRoutes } from './routes/files.js';
import { gitRoutes } from './routes/git.js';
import { mcpRoutes } from './routes/mcp.js';
import { executionRoutes } from './routes/execution.js';
import { fixesRoutes } from './routes/fixes.js';
import { roadmapRoutes } from './routes/roadmap.js';
import { recapsRoutes } from './routes/recaps.js';
import { patternsRoutes } from './routes/patterns.js';
import { wsManager } from './services/websocket.js';
import { fileWatcher } from './services/file-watcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Project Root Configuration
// =============================================================================

// Initialize project root at module load time from environment variable
// This MUST happen before routes are registered so middleware applies correctly
const projectRoot = process.env.YOYO_PROJECT_ROOT ?? process.cwd();

console.log(`[Server] Project root: ${projectRoot}`);

// =============================================================================
// App Setup
// =============================================================================

const app = new Hono<{ Variables: Variables }>();

// Create WebSocket helper
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Middleware - MUST be registered before routes
app.use('*', logger());
app.use('/api/*', cors());

// Project root context middleware - registered before routes so all routes receive it
app.use('*', async (c, next) => {
  c.set('projectRoot', projectRoot);
  await next();
});

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
app.route('/api/git', gitRoutes);
app.route('/api/mcp', mcpRoutes);
app.route('/api/execution', executionRoutes);
app.route('/api/fixes', fixesRoutes);
app.route('/api/roadmap', roadmapRoutes);
app.route('/api/recaps', recapsRoutes);
app.route('/api/patterns', patternsRoutes);

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
  // Use the module-level projectRoot (already initialized from env var)
  // options.projectRoot can override if provided programmatically
  const effectiveProjectRoot = options.projectRoot ?? projectRoot;

  console.log(`\n  Yoyo Dev GUI`);
  console.log(`  ============`);
  console.log(`  Project: ${effectiveProjectRoot}`);
  console.log(`  Server:  http://0.0.0.0:${port} (network accessible)`);
  console.log(`  API:     http://localhost:${port}/api`);
  console.log(`  WS:      ws://localhost:${port}/ws`);
  console.log(`\n  Press Ctrl+C to stop\n`);

  // Start file watcher with the effective project root
  fileWatcher.start({ projectRoot: effectiveProjectRoot, debounceMs: 100 });

  // Create server with WebSocket support
  // Bind to 0.0.0.0 to allow network access (not just localhost)
  const server = serve(
    {
      fetch: app.fetch,
      port,
      hostname: '0.0.0.0',
    },
    (info) => {
      console.log(`  Listening on ${info.address}:${info.port}`);
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
