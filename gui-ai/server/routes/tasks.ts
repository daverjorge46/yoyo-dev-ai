import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';

export const tasksRouter = new Hono();

tasksRouter.get('/', (c) => {
  const db = getDatabase();
  const tasks = db.prepare(`
    SELECT * FROM tasks ORDER BY created_at DESC
  `).all();

  return c.json({
    tasks: tasks.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      status: t.status,
      progress: t.progress,
      config: t.config ? JSON.parse(t.config) : null,
      result: t.result ? JSON.parse(t.result) : null,
      error: t.error,
      createdAt: new Date(t.created_at).toISOString(),
      updatedAt: new Date(t.updated_at).toISOString(),
      scheduledAt: t.scheduled_at ? new Date(t.scheduled_at).toISOString() : null,
      completedAt: t.completed_at ? new Date(t.completed_at).toISOString() : null,
    })),
  });
});

tasksRouter.get('/:id', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({
    task: {
      id: task.id,
      name: task.name,
      description: task.description,
      type: task.type,
      status: task.status,
      progress: task.progress,
      config: task.config ? JSON.parse(task.config) : null,
      result: task.result ? JSON.parse(task.result) : null,
      error: task.error,
      createdAt: new Date(task.created_at).toISOString(),
      updatedAt: new Date(task.updated_at).toISOString(),
      scheduledAt: task.scheduled_at ? new Date(task.scheduled_at).toISOString() : null,
      completedAt: task.completed_at ? new Date(task.completed_at).toISOString() : null,
    },
  });
});

tasksRouter.post('/', async (c) => {
  const db = getDatabase();
  const body = await c.req.json();
  const id = generateId('task_');
  const now = Date.now();

  db.prepare(`
    INSERT INTO tasks (id, name, description, type, status, config, created_at, updated_at, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.name,
    body.description || null,
    body.type || 'manual',
    'queued',
    body.config ? JSON.stringify(body.config) : null,
    now,
    now,
    body.scheduledAt ? new Date(body.scheduledAt).getTime() : null
  );

  return c.json({
    task: {
      id,
      name: body.name,
      description: body.description,
      type: body.type || 'manual',
      status: 'queued',
      progress: 0,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
  }, 201);
});

tasksRouter.put('/:id', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();

  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);

    if (body.status === 'completed') {
      updates.push('completed_at = ?');
      values.push(now);
      updates.push('progress = ?');
      values.push(100);
    }
  }

  if (body.progress !== undefined) {
    updates.push('progress = ?');
    values.push(body.progress);
  }

  if (body.error !== undefined) {
    updates.push('error = ?');
    values.push(body.error);
  }

  if (body.result !== undefined) {
    updates.push('result = ?');
    values.push(JSON.stringify(body.result));
  }

  values.push(id);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return c.json({ success: true });
});

tasksRouter.delete('/:id', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return c.json({ success: true });
});

tasksRouter.post('/:id/pause', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run('paused', Date.now(), id);
  return c.json({ success: true });
});

tasksRouter.post('/:id/resume', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run('running', Date.now(), id);
  return c.json({ success: true });
});
