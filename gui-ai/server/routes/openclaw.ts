import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const openclawRouter = new Hono();

const YOYO_AI_HOME = process.env.YOYO_AI_HOME || path.join(os.homedir(), '.yoyo-ai');
const OPENCLAW_PORT = parseInt(process.env.OPENCLAW_PORT || '18789', 10);
const OPENCLAW_BASE_URL = `http://127.0.0.1:${OPENCLAW_PORT}`;

// Get gateway token for authentication
function getGatewayToken(): string | null {
  const tokenPath = path.join(YOYO_AI_HOME, '.gateway-token');
  try {
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, 'utf-8').trim();
    }
  } catch {
    // Token file not found or not readable
  }
  return null;
}

// Check if OpenClaw is connected
async function isOpenClawConnected(): Promise<boolean> {
  try {
    const res = await fetch(`${OPENCLAW_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Make authenticated request to OpenClaw
async function openclawFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getGatewayToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${OPENCLAW_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(10000),
  });
}

// ============== CHANNELS ==============

openclawRouter.get('/channels', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    // Try to get channels from OpenClaw status
    const res = await openclawFetch('/status');
    if (!res.ok) {
      // Return mock data for demo if status endpoint not available
      return c.json([
        {
          id: 'whatsapp-1',
          type: 'whatsapp',
          name: 'WhatsApp Business',
          status: 'disconnected',
          account: null,
          messageCount: 0,
        },
      ]);
    }

    const status = await res.json();

    // Parse channels from OpenClaw status response
    const channels = [];

    if (status.whatsapp) {
      channels.push({
        id: 'whatsapp-1',
        type: 'whatsapp',
        name: 'WhatsApp',
        status: status.whatsapp.linked ? 'connected' : 'disconnected',
        account: status.whatsapp.phone || null,
        messageCount: status.whatsapp.messageCount || 0,
        lastActivity: status.whatsapp.lastActivity,
      });
    }

    if (status.telegram) {
      channels.push({
        id: 'telegram-1',
        type: 'telegram',
        name: 'Telegram',
        status: status.telegram.connected ? 'connected' : 'disconnected',
        account: status.telegram.username || null,
        messageCount: status.telegram.messageCount || 0,
      });
    }

    // If no channels found, return default
    if (channels.length === 0) {
      channels.push({
        id: 'whatsapp-default',
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

  // TODO: Implement channel reconnect via OpenClaw API
  return c.json({ success: true, channelId });
});

// ============== SESSIONS ==============

openclawRouter.get('/sessions', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    const res = await openclawFetch('/sessions');
    if (!res.ok) {
      // Return empty if sessions endpoint not available
      return c.json([]);
    }

    const data = await res.json();
    return c.json(data.sessions || []);
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

  const sessionId = c.req.param('id');

  try {
    const res = await openclawFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) {
      return c.json({ error: 'Failed to delete session' }, res.status);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return c.json({ error: 'Failed to delete session' }, 500);
  }
});

openclawRouter.delete('/sessions', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  try {
    const res = await openclawFetch('/sessions', { method: 'DELETE' });
    if (!res.ok) {
      return c.json({ error: 'Failed to clear sessions' }, res.status);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to clear sessions' }, 500);
  }
});

// ============== INSTANCES ==============

openclawRouter.get('/instances', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    const res = await openclawFetch('/status');
    if (!res.ok) {
      return c.json([]);
    }

    const status = await res.json();

    // Return the main OpenClaw instance as an instance
    const instances = [
      {
        id: 'openclaw-main',
        name: 'OpenClaw Gateway',
        status: 'running' as const,
        model: status.model || 'default',
        uptime: status.uptime || 0,
        requestsHandled: status.requestsHandled || 0,
      },
    ];

    return c.json(instances);
  } catch (error) {
    console.error('Error fetching instances:', error);
    return c.json([]);
  }
});

openclawRouter.post('/instances/:id/start', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  return c.json({ success: true, message: 'Instance started' });
});

openclawRouter.post('/instances/:id/stop', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  return c.json({ success: true, message: 'Instance stopped' });
});

// ============== CRON JOBS ==============

openclawRouter.get('/cron', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    const res = await openclawFetch('/cron');
    if (!res.ok) {
      return c.json([]);
    }

    const data = await res.json();
    return c.json(data.jobs || []);
  } catch (error) {
    console.error('Error fetching cron jobs:', error);
    return c.json([]);
  }
});

openclawRouter.post('/cron', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  try {
    const body = await c.req.json();
    const res = await openclawFetch('/cron', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return c.json({ error: 'Failed to create cron job' }, res.status);
    }

    return c.json(await res.json());
  } catch (error) {
    console.error('Error creating cron job:', error);
    return c.json({ error: 'Failed to create cron job' }, 500);
  }
});

openclawRouter.delete('/cron/:id', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  const jobId = c.req.param('id');

  try {
    const res = await openclawFetch(`/cron/${jobId}`, { method: 'DELETE' });
    if (!res.ok) {
      return c.json({ error: 'Failed to delete cron job' }, res.status);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to delete cron job' }, 500);
  }
});

openclawRouter.post('/cron/:id/enable', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  const jobId = c.req.param('id');

  try {
    const res = await openclawFetch(`/cron/${jobId}/enable`, { method: 'POST' });
    if (!res.ok) {
      return c.json({ error: 'Failed to enable cron job' }, res.status);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to enable cron job' }, 500);
  }
});

openclawRouter.post('/cron/:id/disable', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  const jobId = c.req.param('id');

  try {
    const res = await openclawFetch(`/cron/${jobId}/disable`, { method: 'POST' });
    if (!res.ok) {
      return c.json({ error: 'Failed to disable cron job' }, res.status);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to disable cron job' }, 500);
  }
});

openclawRouter.post('/cron/:id/run', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  const jobId = c.req.param('id');

  try {
    const res = await openclawFetch(`/cron/${jobId}/run`, { method: 'POST' });
    if (!res.ok) {
      return c.json({ error: 'Failed to run cron job' }, res.status);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to run cron job' }, 500);
  }
});
