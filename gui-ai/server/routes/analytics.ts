import { Hono } from 'hono';
import { getDatabase } from '../lib/database.js';

export const analyticsRouter = new Hono();

analyticsRouter.get('/summary', (c) => {
  const db = getDatabase();
  const period = c.req.query('period') || 'today';

  // Calculate time range
  const now = Date.now();
  let startTime: number;

  switch (period) {
    case 'week':
      startTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case 'month':
      startTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    default: // today
      startTime = new Date().setHours(0, 0, 0, 0);
  }

  // Count messages
  const messagesResult = db.prepare(`
    SELECT COUNT(*) as count FROM chat_history WHERE timestamp >= ?
  `).get(startTime) as any;

  // Count completed tasks
  const tasksResult = db.prepare(`
    SELECT COUNT(*) as count FROM tasks WHERE status = 'completed' AND completed_at >= ?
  `).get(startTime) as any;

  // Count automation runs
  const automationsResult = db.prepare(`
    SELECT COUNT(*) as count FROM automations WHERE last_run >= ?
  `).get(startTime) as any;

  return c.json({
    messagesProcessed: messagesResult?.count || 0,
    tasksCompleted: tasksResult?.count || 0,
    automationsRun: automationsResult?.count || 0,
    period,
  });
});

analyticsRouter.get('/activity', (c) => {
  const db = getDatabase();
  const limit = parseInt(c.req.query('limit') || '20', 10);

  // Get recent chat messages
  const messages = db.prepare(`
    SELECT id, 'message' as type, content as title, timestamp
    FROM chat_history
    WHERE role = 'assistant'
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(Math.floor(limit / 3)) as any[];

  // Get recent tasks
  const tasks = db.prepare(`
    SELECT id, 'task' as type, name as title, updated_at as timestamp, status
    FROM tasks
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(Math.floor(limit / 3)) as any[];

  // Get recent automation runs
  const automations = db.prepare(`
    SELECT id, 'automation' as type, name as title, last_run as timestamp
    FROM automations
    WHERE last_run IS NOT NULL
    ORDER BY last_run DESC
    LIMIT ?
  `).all(Math.floor(limit / 3)) as any[];

  // Combine and sort
  const activities = [
    ...messages.map((m: any) => ({
      id: m.id,
      type: m.type,
      title: m.title.substring(0, 50) + (m.title.length > 50 ? '...' : ''),
      timestamp: new Date(m.timestamp).toISOString(),
      status: 'success',
    })),
    ...tasks.map((t: any) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      timestamp: new Date(t.timestamp).toISOString(),
      status: t.status === 'completed' ? 'success' : t.status === 'failed' ? 'error' : undefined,
    })),
    ...automations.map((a: any) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      timestamp: new Date(a.timestamp).toISOString(),
      status: 'success',
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, limit);

  return c.json({ activities });
});

analyticsRouter.get('/usage', (c) => {
  const db = getDatabase();
  const days = parseInt(c.req.query('days') || '7', 10);

  const usage: { date: string; messages: number; tasks: number; automations: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date).setHours(0, 0, 0, 0);
    const dayEnd = new Date(date).setHours(23, 59, 59, 999);

    const messagesCount = (db.prepare(`
      SELECT COUNT(*) as count FROM chat_history WHERE timestamp >= ? AND timestamp <= ?
    `).get(dayStart, dayEnd) as any)?.count || 0;

    const tasksCount = (db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE completed_at >= ? AND completed_at <= ?
    `).get(dayStart, dayEnd) as any)?.count || 0;

    const automationsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM automations WHERE last_run >= ? AND last_run <= ?
    `).get(dayStart, dayEnd) as any)?.count || 0;

    usage.push({
      date: date.toISOString().split('T')[0],
      messages: messagesCount,
      tasks: tasksCount,
      automations: automationsCount,
    });
  }

  return c.json({ usage });
});
