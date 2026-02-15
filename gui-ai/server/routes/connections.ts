import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';

export const connectionsRouter = new Hono();

connectionsRouter.get('/', (c) => {
  const db = getDatabase();
  const connections = db.prepare('SELECT * FROM connections ORDER BY created_at DESC').all();

  return c.json({
    connections: connections.map((conn: any) => ({
      id: conn.id,
      type: conn.type,
      provider: conn.provider,
      name: conn.name,
      account: conn.account,
      connected: Boolean(conn.connected),
      permissions: conn.permissions ? JSON.parse(conn.permissions) : [],
      lastSync: conn.last_sync ? new Date(conn.last_sync).toISOString() : null,
      stats: conn.config ? JSON.parse(conn.config).stats : {},
    })),
  });
});

connectionsRouter.get('/:id', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as any;

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404);
  }

  return c.json({
    connection: {
      id: connection.id,
      type: connection.type,
      provider: connection.provider,
      name: connection.name,
      account: connection.account,
      connected: Boolean(connection.connected),
      permissions: connection.permissions ? JSON.parse(connection.permissions) : [],
      lastSync: connection.last_sync ? new Date(connection.last_sync).toISOString() : null,
    },
  });
});

connectionsRouter.post('/', async (c) => {
  const db = getDatabase();
  const body = await c.req.json();
  const id = generateId('conn_');
  const now = Date.now();

  const providerInfo: Record<string, { type: string; name: string }> = {
    gmail: { type: 'email', name: 'Gmail' },
    outlook: { type: 'email', name: 'Outlook' },
    gdrive: { type: 'storage', name: 'Google Drive' },
    dropbox: { type: 'storage', name: 'Dropbox' },
    gcalendar: { type: 'calendar', name: 'Google Calendar' },
    slack: { type: 'messaging', name: 'Slack' },
    todoist: { type: 'tasks', name: 'Todoist' },
  };

  const info = providerInfo[body.provider] || { type: 'other', name: body.provider };

  db.prepare(`
    INSERT INTO connections (id, type, provider, name, connected, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, info.type, body.provider, info.name, 0, now);

  return c.json({
    connection: {
      id,
      type: info.type,
      provider: body.provider,
      name: info.name,
      connected: false,
    },
    authUrl: `https://auth.example.com/oauth/${body.provider}?redirect=${encodeURIComponent('http://localhost:5174/connections')}`,
  }, 201);
});

connectionsRouter.post('/:id/refresh', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');

  db.prepare('UPDATE connections SET last_sync = ? WHERE id = ?').run(Date.now(), id);

  return c.json({ success: true, lastSync: new Date().toISOString() });
});

connectionsRouter.delete('/:id', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  db.prepare('DELETE FROM connections WHERE id = ?').run(id);
  return c.json({ success: true });
});

connectionsRouter.get('/:id/activity', (c) => {
  return c.json({ activities: [] });
});
