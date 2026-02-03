import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const openclawRouter = new Hono();

// Check if OpenClaw is running
async function isOpenClawConnected(): Promise<boolean> {
  try {
    await execAsync('openclaw health', {
      timeout: 15000,
      env: { ...process.env, PATH: process.env.PATH },
    });
    return true;
  } catch (error) {
    console.error('OpenClaw connection check failed:', error);
    return false;
  }
}

// Parse health output to get channel info
async function parseHealthOutput(): Promise<{
  whatsapp?: { linked: boolean; phone?: string };
  sessions?: number;
}> {
  try {
    const { stdout } = await execAsync('openclaw health', {
      timeout: 15000,
      env: { ...process.env, PATH: process.env.PATH },
    });

    const whatsappMatch = stdout.match(/WhatsApp:\s*(\w+)/i);
    const phoneMatch = stdout.match(/Web Channel:\s*(\+\d+)/);
    const sessionsMatch = stdout.match(/Session store[^)]+\((\d+) entries\)/i);

    return {
      whatsapp: whatsappMatch ? {
        linked: whatsappMatch[1].toLowerCase() === 'linked',
        phone: phoneMatch ? phoneMatch[1] : undefined,
      } : undefined,
      sessions: sessionsMatch ? parseInt(sessionsMatch[1], 10) : 0,
    };
  } catch {
    return {};
  }
}

// ============== CHANNELS ==============

openclawRouter.get('/channels', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    const healthData = await parseHealthOutput();

    const channels = [];

    if (healthData.whatsapp !== undefined) {
      channels.push({
        id: 'whatsapp-1',
        type: 'whatsapp',
        name: 'WhatsApp',
        status: healthData.whatsapp.linked ? 'connected' : 'disconnected',
        account: healthData.whatsapp.phone || null,
        messageCount: 0,
      });
    } else {
      // Default channel
      channels.push({
        id: 'whatsapp-1',
        type: 'whatsapp',
        name: 'WhatsApp',
        status: 'disconnected',
      });
    }

    return c.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return c.json([
      {
        id: 'whatsapp-1',
        type: 'whatsapp',
        name: 'WhatsApp',
        status: 'disconnected',
      },
    ]);
  }
});

openclawRouter.post('/channels/:id/reconnect', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  const channelId = c.req.param('id');

  // Attempt to reconnect WhatsApp
  if (channelId.startsWith('whatsapp')) {
    try {
      // This would trigger the WhatsApp reconnect flow
      // For now, just return success and let user use CLI
      return c.json({
        success: true,
        message: 'To reconnect WhatsApp, run: openclaw channels login',
      });
    } catch {
      return c.json({ error: 'Failed to reconnect' }, 500);
    }
  }

  return c.json({ success: true, channelId });
});

// ============== SESSIONS ==============

openclawRouter.get('/sessions', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    // Try to get sessions via CLI
    const { stdout } = await execAsync('openclaw sessions --json 2>/dev/null', {
      timeout: 10000,
    });

    try {
      const result = JSON.parse(stdout);
      const sessions = (result.sessions || []).map((s: any, i: number) => ({
        id: s.key || `session-${i}`,
        channelType: s.kind || 'direct',
        userName: s.key?.split(':').pop() || 'Unknown',
        model: s.model || 'default',
        messageCount: 0,
        tokenCount: parseInt(s.tokens?.split('/')[0]?.replace(/\D/g, '') || '0', 10),
        createdAt: Date.now(),
        lastActivity: Date.now(),
      }));
      return c.json(sessions);
    } catch {
      // Parse text output
      const healthData = await parseHealthOutput();
      return c.json([]);
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return c.json([]);
  }
});

openclawRouter.delete('/sessions/:id', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  // Session management via CLI is limited
  return c.json({
    success: false,
    error: 'Session deletion via GUI not implemented. Use CLI: openclaw sessions clear',
  });
});

openclawRouter.delete('/sessions', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  return c.json({
    success: false,
    error: 'Use CLI: openclaw sessions clear',
  });
});

// ============== INSTANCES ==============

openclawRouter.get('/instances', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    const { stdout } = await execAsync('openclaw health', {
      timeout: 15000,
      env: { ...process.env, PATH: process.env.PATH },
    });

    // Parse agent info from health output
    const agentsMatch = stdout.match(/Agents:\s*([^\n]+)/i);

    const instances = [
      {
        id: 'openclaw-main',
        name: 'OpenClaw Gateway',
        status: 'running' as const,
        model: 'kimi-k2.5',
        uptime: Date.now() - 60000, // Placeholder
        requestsHandled: 0,
      },
    ];

    return c.json(instances);
  } catch (error) {
    console.error('Error fetching instances:', error);
    return c.json([]);
  }
});

openclawRouter.post('/instances/:id/start', async (c) => {
  return c.json({
    success: false,
    error: 'Use CLI: yoyo-ai start',
  });
});

openclawRouter.post('/instances/:id/stop', async (c) => {
  return c.json({
    success: false,
    error: 'Use CLI: yoyo-ai stop',
  });
});

// ============== CRON JOBS ==============

openclawRouter.get('/cron', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  // Cron jobs are not yet implemented in OpenClaw CLI
  return c.json([]);
});

openclawRouter.post('/cron', async (c) => {
  return c.json({ error: 'Cron jobs not yet implemented' }, 501);
});

openclawRouter.delete('/cron/:id', async (c) => {
  return c.json({ error: 'Cron jobs not yet implemented' }, 501);
});

openclawRouter.post('/cron/:id/enable', async (c) => {
  return c.json({ error: 'Cron jobs not yet implemented' }, 501);
});

openclawRouter.post('/cron/:id/disable', async (c) => {
  return c.json({ error: 'Cron jobs not yet implemented' }, 501);
});

openclawRouter.post('/cron/:id/run', async (c) => {
  return c.json({ error: 'Cron jobs not yet implemented' }, 501);
});
