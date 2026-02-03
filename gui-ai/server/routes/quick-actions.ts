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

  // If no actions, generate some suggestions
  if (actions.length === 0) {
    const suggestions = generateSuggestions();
    return c.json({ actions: suggestions });
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

  // In real implementation, this would execute the action via OpenClaw
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

  // Create a task from this action
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

  // Update the action with modified params
  if (body.params) {
    db.prepare(`
      UPDATE quick_actions SET params = ?, actioned_at = ? WHERE id = ?
    `).run(JSON.stringify(body.params), now, id);
  }

  // Then execute
  db.prepare(`
    UPDATE quick_actions SET status = 'executed' WHERE id = ?
  `).run(id);

  return c.json({ success: true, message: 'Action modified and executed' });
});

// Helper to generate mock suggestions
function generateSuggestions() {
  const suggestions = [
    {
      id: generateId('qa_'),
      type: 'email_digest',
      title: 'Summarize unread emails',
      description: 'You have 15 unread emails from your project team. Would you like me to summarize the key points?',
      confidence: 0.85,
      params: { emailCount: 15, category: 'project' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId('qa_'),
      type: 'meeting_prep',
      title: 'Prepare for upcoming meeting',
      description: 'You have a meeting with the marketing team in 2 hours. Should I prepare a briefing?',
      confidence: 0.78,
      params: { meetingId: 'mtg_123', timeUntil: '2 hours' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId('qa_'),
      type: 'task_reminder',
      title: 'Complete overdue task',
      description: 'The "Review Q4 report" task was due yesterday. Would you like me to help you complete it?',
      confidence: 0.92,
      params: { taskId: 'task_456', daysOverdue: 1 },
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ];

  // Store in database
  const db = getDatabase();
  for (const suggestion of suggestions) {
    db.prepare(`
      INSERT OR IGNORE INTO quick_actions (id, type, title, description, confidence, params, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      suggestion.id,
      suggestion.type,
      suggestion.title,
      suggestion.description,
      suggestion.confidence,
      JSON.stringify(suggestion.params),
      suggestion.status,
      Date.now()
    );
  }

  return suggestions;
}
