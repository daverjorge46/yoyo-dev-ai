import { Hono } from 'hono';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export const gatewayTokenRouter = new Hono();

// Prefer ~/.yoyo-claw, fall back to ~/.openclaw for backwards compat
const YOYO_CLAW_CONFIG = join(homedir(), '.yoyo-claw', 'openclaw.json');
const LEGACY_CONFIG = join(homedir(), '.openclaw', 'openclaw.json');

async function resolveConfigPath(): Promise<string> {
  // Check env override first
  const envPath = process.env.YOYO_CLAW_CONFIG_PATH;
  if (envPath) {
    try { await access(envPath); return envPath; } catch { /* fall through */ }
  }
  // Prefer yoyo-claw path
  try { await access(YOYO_CLAW_CONFIG); return YOYO_CLAW_CONFIG; } catch { /* fall through */ }
  // Fall back to legacy
  return LEGACY_CONFIG;
}

gatewayTokenRouter.get('/', async (c) => {
  try {
    const configPath = await resolveConfigPath();
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    const token = config?.gateway?.auth?.token;
    if (!token) {
      return c.json(
        {
          error: 'Gateway auth token not configured',
          detail: 'Set gateway.auth.token in ~/.yoyo-claw/openclaw.json',
        },
        500,
      );
    }

    // Return the proxy WebSocket URL (same host as the Hono server).
    // The browser connects to /ws/gateway on the Hono server, which
    // proxies to the real gateway with proper auth.
    const gatewayUrl = '/ws/gateway';

    return c.json({ token, gatewayUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gateway-token] Failed to read config:', message);
    return c.json(
      {
        error: 'Gateway config not found',
        detail: 'Ensure yoyo-claw is installed and configured.',
      },
      500,
    );
  }
});
