import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const statusRouter = new Hono();

const YOYO_AI_HOME = process.env.YOYO_AI_HOME || path.join(os.homedir(), '.yoyo-ai');
const OPENCLAW_PORT = parseInt(process.env.OPENCLAW_PORT || '18789', 10);

// Check OpenClaw connection using CLI health command
async function checkOpenClawConnection(): Promise<{
  connected: boolean;
  version?: string;
  whatsapp?: { linked: boolean; phone?: string };
}> {
  try {
    const { stdout, stderr } = await execAsync('openclaw health', {
      timeout: 15000, // 15 second timeout (openclaw can be slow)
      env: { ...process.env, PATH: process.env.PATH },
    });

    // Parse health output
    const whatsappMatch = stdout.match(/WhatsApp:\s*(\w+)/i);
    const phoneMatch = stdout.match(/Web Channel:\s*(\+\d+)/);

    return {
      connected: true,
      whatsapp: whatsappMatch ? {
        linked: whatsappMatch[1].toLowerCase() === 'linked',
        phone: phoneMatch ? phoneMatch[1] : undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('OpenClaw health check failed:', error);
    return { connected: false };
  }
}

// Get detailed OpenClaw status using CLI
async function getOpenClawStatus(): Promise<{
  channels: number;
  channelsConnected: number;
  sessions: number;
  activeSessions: number;
  channelList: Array<{ type: string; status: string; phone?: string }>;
} | null> {
  try {
    const { stdout: healthOutput } = await execAsync('openclaw health', {
      timeout: 15000,
      env: { ...process.env, PATH: process.env.PATH },
    });

    // Parse channels from health output
    const channelList: Array<{ type: string; status: string; phone?: string }> = [];
    let channelsConnected = 0;

    // WhatsApp
    const whatsappMatch = healthOutput.match(/WhatsApp:\s*(\w+)/i);
    if (whatsappMatch) {
      const isLinked = whatsappMatch[1].toLowerCase() === 'linked';
      const phoneMatch = healthOutput.match(/Web Channel:\s*(\+\d+)/);
      channelList.push({
        type: 'whatsapp',
        status: isLinked ? 'connected' : 'disconnected',
        phone: phoneMatch ? phoneMatch[1] : undefined,
      });
      if (isLinked) channelsConnected++;
    }

    // Parse sessions
    const sessionsMatch = healthOutput.match(/Session store[^)]+\((\d+) entries\)/i);
    const activeSessions = sessionsMatch ? parseInt(sessionsMatch[1], 10) : 0;

    return {
      channels: channelList.length || 1,
      channelsConnected,
      sessions: activeSessions,
      activeSessions,
      channelList: channelList.length > 0 ? channelList : [{ type: 'whatsapp', status: 'disconnected' }],
    };
  } catch {
    return null;
  }
}

// General status endpoint
statusRouter.get('/', async (c) => {
  const { connected, whatsapp } = await checkOpenClawConnection();

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
      whatsapp,
    },
    timestamp: Date.now(),
  });
});

// OpenClaw specific status endpoint
statusRouter.get('/openclaw', async (c) => {
  const { connected, whatsapp } = await checkOpenClawConnection();

  return c.json({
    connected,
    port: OPENCLAW_PORT,
    whatsapp,
    timestamp: Date.now(),
  });
});

// Dashboard stats endpoint - returns OpenClaw-focused stats
statusRouter.get('/stats', async (c) => {
  const { connected } = await checkOpenClawConnection();

  if (!connected) {
    return c.json({
      channels: 1,
      channelsConnected: 0,
      sessions: 0,
      activeSessions: 0,
      cronJobs: 0,
      cronJobsEnabled: 0,
      totalTokens: 0,
      channelList: [{ type: 'whatsapp', status: 'disconnected' }],
      openclawConnected: false,
      timestamp: Date.now(),
    });
  }

  // Get detailed status
  const openclawStatus = await getOpenClawStatus();

  if (!openclawStatus) {
    return c.json({
      channels: 1,
      channelsConnected: 0,
      sessions: 0,
      activeSessions: 0,
      cronJobs: 0,
      cronJobsEnabled: 0,
      totalTokens: 0,
      channelList: [{ type: 'whatsapp', status: 'disconnected' }],
      openclawConnected: connected,
      timestamp: Date.now(),
    });
  }

  return c.json({
    channels: openclawStatus.channels,
    channelsConnected: openclawStatus.channelsConnected,
    sessions: openclawStatus.sessions,
    activeSessions: openclawStatus.activeSessions,
    cronJobs: 0,
    cronJobsEnabled: 0,
    totalTokens: 0,
    channelList: openclawStatus.channelList,
    openclawConnected: connected,
    timestamp: Date.now(),
  });
});
