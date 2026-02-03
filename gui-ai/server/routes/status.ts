import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const statusRouter = new Hono();

const YOYO_AI_HOME = process.env.YOYO_AI_HOME || path.join(os.homedir(), '.yoyo-ai');
const OPENCLAW_PORT = process.env.OPENCLAW_PORT || '18789';

statusRouter.get('/', async (c) => {
  // Check OpenClaw gateway status
  let openclawStatus = 'unknown';
  try {
    const res = await fetch(`http://127.0.0.1:${OPENCLAW_PORT}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    openclawStatus = res.ok ? 'connected' : 'error';
  } catch {
    openclawStatus = 'disconnected';
  }

  // Check config exists
  const configPath = path.join(YOYO_AI_HOME, 'openclaw.json');
  const configExists = fs.existsSync(configPath);

  return c.json({
    status: 'ok',
    version: '1.0.0',
    openclaw: {
      status: openclawStatus,
      port: OPENCLAW_PORT,
      configExists,
    },
    timestamp: Date.now(),
  });
});
