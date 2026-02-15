import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';

export const quickActionsRouter = new Hono();

quickActionsRouter.get('/', (c) => {
  const db = getDatabase();
  const actions = db.prepare(`
    SELECT * FROM quick_actions
    WHERE status = 'pending'
    ORDER BY confidence DESC, created_at DESC
    LIMIT 10
  `).all();

  if (actions.length === 0) {
    return c.json({ actions: [] });
  }

  return c.json({
    actions: actions.map((a: any) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      confidence: a.confidence,
      params: a.params ? JSON.parse(a.params) : null,
      status: a.status,
      createdAt: new Date(a.created_at).toISOString(),
    })),
  });
});

quickActionsRouter.post('/:id/execute', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const now = Date.now();

  db.prepare(`
    UPDATE quick_actions SET status = 'executed', actioned_at = ? WHERE id = ?
  `).run(now, id);

  return c.json({ success: true, message: 'Action executed' });
});

quickActionsRouter.post('/:id/schedule', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();

  db.prepare(`
    UPDATE quick_actions SET status = 'scheduled', actioned_at = ? WHERE id = ?
  `).run(now, id);

  const action = db.prepare('SELECT * FROM quick_actions WHERE id = ?').get(id) as any;

  if (action) {
    const taskId = generateId('task_');
    db.prepare(`
      INSERT INTO tasks (id, name, type, status, config, created_at, updated_at, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      action.title,
      'scheduled',
      'queued',
      action.params,
      now,
      now,
      body.scheduledAt ? new Date(body.scheduledAt).getTime() : now + 3600000
    );
  }

  return c.json({ success: true, message: 'Action scheduled' });
});

quickActionsRouter.post('/:id/dismiss', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const now = Date.now();

  db.prepare(`
    UPDATE quick_actions SET status = 'dismissed', actioned_at = ? WHERE id = ?
  `).run(now, id);

  return c.json({ success: true });
});

quickActionsRouter.put('/:id/modify', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();

  if (body.params) {
    db.prepare(`
      UPDATE quick_actions SET params = ?, actioned_at = ? WHERE id = ?
    `).run(JSON.stringify(body.params), now, id);
  }

  db.prepare(`
    UPDATE quick_actions SET status = 'executed' WHERE id = ?
  `).run(id);

  return c.json({ success: true, message: 'Action modified and executed' });
});
