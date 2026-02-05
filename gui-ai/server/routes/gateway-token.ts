import { Hono } from 'hono';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export const gatewayTokenRouter = new Hono();

const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

gatewayTokenRouter.get('/', async (c) => {
  try {
    // Read the auth token from the OpenClaw config (gateway.auth.token)
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);

    const token = config?.gateway?.auth?.token;
    if (!token) {
      return c.json(
        {
          error: 'Gateway auth token not configured',
          detail: 'Set gateway.auth.token in ~/.openclaw/openclaw.json',
        },
        500,
      );
    }

    // Return the proxy WebSocket URL (same host as the Hono server).
    // The browser connects to /ws/gateway on the Hono server, which
    // proxies to the real OpenClaw gateway with proper auth.
    // In development, Vite proxies this. In production, it's served directly.
    // We use a relative path so the browser uses the current host.
    const gatewayUrl = '/ws/gateway';

    return c.json({ token, gatewayUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gateway-token] Failed to read OpenClaw config:', message);
    return c.json(
      {
        error: 'OpenClaw config not found',
        detail: 'Ensure OpenClaw is installed and configured.',
        path: CONFIG_PATH,
      },
      500,
    );
  }
});
