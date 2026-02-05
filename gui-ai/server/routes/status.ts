import { Hono } from 'hono';

export const statusRouter = new Hono();

// Basic server status - OpenClaw status now comes from WebSocket RPC in the browser
statusRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    server: 'yoyo-ai-gui',
    timestamp: Date.now(),
  });
});
