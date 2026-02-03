import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const statusRouter = new Hono();

const YOYO_AI_HOME = process.env.YOYO_AI_HOME || path.join(os.homedir(), '.yoyo-ai');
const OPENCLAW_PORT = parseInt(process.env.OPENCLAW_PORT || '18789', 10);
const OPENCLAW_BASE_URL = `http://127.0.0.1:${OPENCLAW_PORT}`;

// Check OpenClaw connection helper
async function checkOpenClawConnection(): Promise<{ connected: boolean; version?: string }> {
  try {
    const res = await fetch(`${OPENCLAW_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      try {
        const data = await res.json();
        return { connected: true, version: data.version };
      } catch {
        return { connected: true };
      }
    }
    return { connected: false };
  } catch {
    return { connected: false };
  }
}

// Get OpenClaw status
async function getOpenClawStatus(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${OPENCLAW_BASE_URL}/status`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Status endpoint not available
  }
  return null;
}

// General status endpoint
statusRouter.get('/', async (c) => {
  const { connected, version } = await checkOpenClawConnection();

  // Check config exists
  const configPath = path.join(YOYO_AI_HOME, 'openclaw.json');
  const configExists = fs.existsSync(configPath);

  return c.json({
    status: 'ok',
    version: '1.0.0',
    openclaw: {
      status: connected ? 'connected' : 'disconnected',
      port: OPENCLAW_PORT,
      version,
      configExists,
    },
    timestamp: Date.now(),
  });
});

// OpenClaw specific status endpoint
statusRouter.get('/openclaw', async (c) => {
  const { connected, version } = await checkOpenClawConnection();

  return c.json({
    connected,
    port: OPENCLAW_PORT,
    version,
    timestamp: Date.now(),
  });
});

// Dashboard stats endpoint - now returns OpenClaw-focused stats
statusRouter.get('/stats', async (c) => {
  const { connected } = await checkOpenClawConnection();

  if (!connected) {
    return c.json({
      channels: 0,
      channelsConnected: 0,
      sessions: 0,
      activeSessions: 0,
      cronJobs: 0,
      cronJobsEnabled: 0,
      totalTokens: 0,
      channelList: [],
      openclawConnected: false,
      timestamp: Date.now(),
    });
  }

  // Try to get detailed status from OpenClaw
  const openclawStatus = await getOpenClawStatus();

  // Parse stats from OpenClaw status
  let channels = 0;
  let channelsConnected = 0;
  const channelList: Array<{ type: string; status: string }> = [];

  if (openclawStatus) {
    // Count WhatsApp
    if (openclawStatus.whatsapp !== undefined) {
      channels++;
      const isConnected = (openclawStatus.whatsapp as Record<string, unknown>)?.linked === true;
      if (isConnected) channelsConnected++;
      channelList.push({ type: 'whatsapp', status: isConnected ? 'connected' : 'disconnected' });
    }

    // Count Telegram
    if (openclawStatus.telegram !== undefined) {
      channels++;
      const isConnected = (openclawStatus.telegram as Record<string, unknown>)?.connected === true;
      if (isConnected) channelsConnected++;
      channelList.push({ type: 'telegram', status: isConnected ? 'connected' : 'disconnected' });
    }
  }

  // Default channel if none found
  if (channelList.length === 0) {
    channelList.push({ type: 'whatsapp', status: 'disconnected' });
    channels = 1;
  }

  // Get session count (if available from status)
  const sessions = (openclawStatus?.sessionCount as number) || 0;
  const activeSessions = (openclawStatus?.activeSessionCount as number) || 0;

  // Get cron job count (if available from status)
  const cronJobs = (openclawStatus?.cronJobCount as number) || 0;
  const cronJobsEnabled = (openclawStatus?.cronJobsEnabled as number) || 0;

  // Get token usage
  const totalTokens = (openclawStatus?.totalTokens as number) || 0;

  return c.json({
    channels,
    channelsConnected,
    sessions,
    activeSessions,
    cronJobs,
    cronJobsEnabled,
    totalTokens,
    channelList,
    openclawConnected: connected,
    timestamp: Date.now(),
  });
});
