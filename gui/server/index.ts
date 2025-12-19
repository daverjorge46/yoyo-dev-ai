/**
 * Yoyo Dev GUI Server
 *
 * Hono-based API server for the browser GUI.
 */

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
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

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// App Setup
// =============================================================================

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// =============================================================================
// API Routes
// =============================================================================

app.route('/api/status', statusRoutes);
app.route('/api/specs', specsRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/skills', skillsRoutes);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================================================
// Static Files (Production)
// =============================================================================

const clientDistPath = join(__dirname, '..', 'dist', 'client');
const clientDevPath = join(__dirname, '..', 'client');

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
  const projectRoot = options.projectRoot
    ?? process.env.YOYO_PROJECT_ROOT
    ?? process.cwd();

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
  console.log(`\n  Press Ctrl+C to stop\n`);

  serve({
    fetch: app.fetch,
    port,
  });

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
