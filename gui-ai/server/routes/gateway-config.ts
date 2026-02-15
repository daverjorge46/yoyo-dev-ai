import { Hono } from 'hono';
import { resolveConfigPath, readConfig, writeConfigAtomic } from './gateway-token.js';

export const gatewayConfigRouter = new Hono();

gatewayConfigRouter.put('/', async (c) => {
  try {
    const body = await c.req.json<{ defaultModel?: string }>();
    const { defaultModel } = body ?? {};

    if (!defaultModel || typeof defaultModel !== 'string') {
      return c.json({ success: false, error: 'defaultModel must be a non-empty string' }, 400);
    }

    const configPath = await resolveConfigPath();
    const config = await readConfig(configPath);

    // Navigate to agents.defaults.model.primary and set the value
    if (!config.agents) config.agents = {};
    const agents = config.agents as Record<string, unknown>;
    if (!agents.defaults) agents.defaults = {};
    const defaults = agents.defaults as Record<string, unknown>;
    if (!defaults.model) defaults.model = {};
    const model = defaults.model as Record<string, unknown>;
    model.primary = defaultModel;

    await writeConfigAtomic(configPath, config);

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gateway-config] Failed to update config:', message);
    return c.json({ success: false, error: message }, 500);
  }
});
