import { Hono } from 'hono';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export const gatewayTokenRouter = new Hono();

const TOKEN_PATH = join(homedir(), '.openclaw', '.gateway-token');
const DEFAULT_GATEWAY_HOST = '127.0.0.1';
const DEFAULT_GATEWAY_PORT = 18789;

gatewayTokenRouter.get('/', async (c) => {
  try {
    const token = (await readFile(TOKEN_PATH, 'utf-8')).trim();

    // Build the WebSocket URL
    // The browser connects directly to the OpenClaw gateway
    const gatewayUrl = `ws://${DEFAULT_GATEWAY_HOST}:${DEFAULT_GATEWAY_PORT}`;

    return c.json({ token, gatewayUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gateway-token] Failed to read token:', message);
    return c.json(
      {
        error: 'Gateway token not found',
        detail: 'Ensure OpenClaw is installed and the gateway has been started at least once.',
        path: TOKEN_PATH,
      },
      500,
    );
  }
});
