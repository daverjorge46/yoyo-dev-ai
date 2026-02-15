import { Hono } from 'hono';
import { readFile, writeFile, rename, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { tmpdir } from 'os';

export const gatewayTokenRouter = new Hono();

// Prefer ~/.yoyo-claw, fall back to ~/.openclaw for backwards compat
const YOYO_CLAW_CONFIG = join(homedir(), '.yoyo-claw', 'openclaw.json');
const LEGACY_CONFIG = join(homedir(), '.openclaw', 'openclaw.json');

export async function resolveConfigPath(): Promise<string> {
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

export async function readConfig(configPath: string): Promise<Record<string, unknown>> {
  const raw = await readFile(configPath, 'utf-8');
  return JSON.parse(raw);
}

export async function writeConfigAtomic(configPath: string, config: Record<string, unknown>): Promise<void> {
  const tmpPath = join(tmpdir(), `openclaw-config-${Date.now()}.tmp`);
  await writeFile(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
  await rename(tmpPath, configPath);
}

gatewayTokenRouter.get('/', async (c) => {
  try {
    const configPath = await resolveConfigPath();
    const config = await readConfig(configPath);

    const token = (config?.gateway as Record<string, unknown>)?.auth as Record<string, unknown>;
    const tokenValue = token?.token as string | undefined;
    if (!tokenValue) {
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

    return c.json({ token: tokenValue, gatewayUrl });
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

gatewayTokenRouter.put('/', async (c) => {
  try {
    const body = await c.req.json<{ token?: string }>();
    const newToken = body?.token;

    if (!newToken || typeof newToken !== 'string' || newToken.length < 8) {
      return c.json({ success: false, error: 'Token must be a string with at least 8 characters' }, 400);
    }

    const configPath = await resolveConfigPath();
    const config = await readConfig(configPath);

    // Ensure gateway.auth.token path exists
    if (!config.gateway) config.gateway = {};
    const gw = config.gateway as Record<string, unknown>;
    if (!gw.auth) gw.auth = {};
    const auth = gw.auth as Record<string, unknown>;
    auth.token = newToken;

    await writeConfigAtomic(configPath, config);

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gateway-token] Failed to update token:', message);
    return c.json({ success: false, error: message }, 500);
  }
});
