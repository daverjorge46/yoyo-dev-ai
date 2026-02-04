import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getDatabase, generateId } from '../lib/database';
import { CronExpressionParser } from 'cron-parser';

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

// Helper to calculate next run time from cron expression
function getNextRunTime(schedule: string): number | null {
  try {
    const expr = CronExpressionParser.parse(schedule);
    return expr.next().getTime();
  } catch {
    return null;
  }
}

openclawRouter.get('/cron', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json([], 503);
  }

  try {
    const db = getDatabase();
    const jobs = db.prepare(`
      SELECT id, name, schedule, command, enabled, last_run, last_result, last_error, next_run, run_count
      FROM cron_jobs
      ORDER BY created_at DESC
    `).all() as any[];

    // Convert to API format
    const result = jobs.map((job) => ({
      id: job.id,
      name: job.name,
      schedule: job.schedule,
      command: job.command,
      enabled: job.enabled === 1,
      lastRun: job.last_run || undefined,
      lastResult: job.last_result || undefined,
      lastError: job.last_error || undefined,
      nextRun: job.next_run || undefined,
      runCount: job.run_count || 0,
    }));

    return c.json(result);
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
    const { name, schedule, command } = body;

    if (!name || !schedule || !command) {
      return c.json({ error: 'Missing required fields: name, schedule, command' }, 400);
    }

    // Validate cron expression
    const nextRun = getNextRunTime(schedule);
    if (nextRun === null) {
      return c.json({ error: 'Invalid cron expression' }, 400);
    }

    const db = getDatabase();
    const id = generateId('cron_');
    const now = Date.now();

    db.prepare(`
      INSERT INTO cron_jobs (id, name, schedule, command, enabled, next_run, run_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, 0, ?, ?)
    `).run(id, name, schedule, command, nextRun, now, now);

    return c.json({
      id,
      name,
      schedule,
      command,
      enabled: true,
      nextRun,
      runCount: 0,
    }, 201);
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

  try {
    const id = c.req.param('id');
    const db = getDatabase();

    const result = db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id);

    if (result.changes === 0) {
      return c.json({ error: 'Cron job not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting cron job:', error);
    return c.json({ error: 'Failed to delete cron job' }, 500);
  }
});

openclawRouter.post('/cron/:id/enable', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  try {
    const id = c.req.param('id');
    const db = getDatabase();

    // Get the job to recalculate next run
    const job = db.prepare('SELECT schedule FROM cron_jobs WHERE id = ?').get(id) as any;
    if (!job) {
      return c.json({ error: 'Cron job not found' }, 404);
    }

    const nextRun = getNextRunTime(job.schedule);
    const now = Date.now();

    db.prepare('UPDATE cron_jobs SET enabled = 1, next_run = ?, updated_at = ? WHERE id = ?')
      .run(nextRun, now, id);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error enabling cron job:', error);
    return c.json({ error: 'Failed to enable cron job' }, 500);
  }
});

openclawRouter.post('/cron/:id/disable', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  try {
    const id = c.req.param('id');
    const db = getDatabase();
    const now = Date.now();

    const result = db.prepare('UPDATE cron_jobs SET enabled = 0, updated_at = ? WHERE id = ?')
      .run(now, id);

    if (result.changes === 0) {
      return c.json({ error: 'Cron job not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error disabling cron job:', error);
    return c.json({ error: 'Failed to disable cron job' }, 500);
  }
});

openclawRouter.post('/cron/:id/run', async (c) => {
  const connected = await isOpenClawConnected();
  if (!connected) {
    return c.json({ error: 'OpenClaw not connected' }, 503);
  }

  try {
    const id = c.req.param('id');
    const db = getDatabase();

    const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as any;
    if (!job) {
      return c.json({ error: 'Cron job not found' }, 404);
    }

    const now = Date.now();

    // Execute the command via OpenClaw
    try {
      await execAsync(`openclaw chat "${job.command.replace(/"/g, '\\"')}"`, {
        timeout: 120000,
        env: { ...process.env, PATH: process.env.PATH },
      });

      // Calculate next run time
      const nextRun = getNextRunTime(job.schedule);

      // Update job status
      db.prepare(`
        UPDATE cron_jobs
        SET last_run = ?, last_result = 'success', last_error = NULL, next_run = ?, run_count = run_count + 1, updated_at = ?
        WHERE id = ?
      `).run(now, nextRun, now, id);

      return c.json({ success: true, lastResult: 'success' });
    } catch (error: any) {
      // Update job with error
      const nextRun = getNextRunTime(job.schedule);
      db.prepare(`
        UPDATE cron_jobs
        SET last_run = ?, last_result = 'error', last_error = ?, next_run = ?, run_count = run_count + 1, updated_at = ?
        WHERE id = ?
      `).run(now, error.message || 'Execution failed', nextRun, now, id);

      return c.json({ success: false, lastResult: 'error', error: error.message });
    }
  } catch (error) {
    console.error('Error running cron job:', error);
    return c.json({ error: 'Failed to run cron job' }, 500);
  }
});
