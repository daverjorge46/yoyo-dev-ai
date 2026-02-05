import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';

export const chatRouter = new Hono();

// Get chat history from local SQLite (for persistence across page reloads)
chatRouter.get('/history', (c) => {
  const db = getDatabase();
  const messages = db.prepare(`
    SELECT id, role, content, attachments, suggested_actions as suggestedActions, timestamp
    FROM chat_history
    ORDER BY timestamp ASC
    LIMIT 100
  `).all();

  return c.json({
    messages: messages.map((m: any) => ({
      ...m,
      attachments: m.attachments ? JSON.parse(m.attachments as string) : [],
      suggestedActions: m.suggestedActions ? JSON.parse(m.suggestedActions as string) : [],
      timestamp: new Date(m.timestamp as number).toISOString(),
    })),
  });
});

// Store a message in local SQLite (called by the frontend after WebSocket chat)
chatRouter.post('/store', async (c) => {
  const db = getDatabase();
  const body = await c.req.json();
  const { id, role, content, attachments, suggestedActions } = body;

  const messageId = id || generateId('msg_');
  const timestamp = Date.now();

  db.prepare(`
    INSERT OR REPLACE INTO chat_history (id, role, content, attachments, suggested_actions, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    messageId,
    role,
    content,
    attachments ? JSON.stringify(attachments) : null,
    suggestedActions ? JSON.stringify(suggestedActions) : null,
    timestamp,
  );

  return c.json({
    id: messageId,
    role,
    content,
    timestamp: new Date(timestamp).toISOString(),
  });
});

// Clear chat history
chatRouter.delete('/history', (c) => {
  const db = getDatabase();
  db.prepare('DELETE FROM chat_history').run();
  return c.json({ success: true });
});
