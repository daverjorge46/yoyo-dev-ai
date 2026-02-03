import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const statusRouter = new Hono();

const YOYO_AI_HOME = process.env.YOYO_AI_HOME || path.join(os.homedir(), '.yoyo-ai');
const OPENCLAW_PORT = parseInt(process.env.OPENCLAW_PORT || '18789', 10);

// Check OpenClaw connection helper
async function checkOpenClawConnection(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${OPENCLAW_PORT}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// General status endpoint
statusRouter.get('/', async (c) => {
  const connected = await checkOpenClawConnection();

  // Check config exists
  const configPath = path.join(YOYO_AI_HOME, 'openclaw.json');
  const configExists = fs.existsSync(configPath);

  return c.json({
    status: 'ok',
    version: '1.0.0',
    openclaw: {
      status: connected ? 'connected' : 'disconnected',
      port: OPENCLAW_PORT,
      configExists,
    },
    timestamp: Date.now(),
  });
});

// OpenClaw specific status endpoint
statusRouter.get('/openclaw', async (c) => {
  const connected = await checkOpenClawConnection();

  return c.json({
    connected,
    port: OPENCLAW_PORT,
    timestamp: Date.now(),
  });
});

// Dashboard stats endpoint
statusRouter.get('/stats', async (c) => {
  // TODO: In production, fetch real stats from database/OpenClaw
  // For now, return placeholder stats
  const connected = await checkOpenClawConnection();

  // If connected to OpenClaw, we could fetch real stats
  // For now, return defaults
  return c.json({
    conversations: 0,
    memories: 0,
    skills: 6, // Default skills count
    agents: 6, // Yoyo Dev agents count
    openclawConnected: connected,
    timestamp: Date.now(),
  });
});
