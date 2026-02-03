import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';

export const connectionsRouter = new Hono();

connectionsRouter.get('/', (c) => {
  const db = getDatabase();
  const connections = db.prepare('SELECT * FROM connections ORDER BY created_at DESC').all();

  // If no connections, return some demo ones
  if (connections.length === 0) {
    return c.json({
      connections: [
        {
          id: 'conn_gmail',
          type: 'email',
          provider: 'gmail',
          name: 'Gmail',
          account: 'user@gmail.com',
          connected: true,
          permissions: ['Read emails', 'Send emails', 'Manage labels'],
          lastSync: new Date(Date.now() - 120000).toISOString(),
          stats: { itemsProcessed: 142, actionsToday: 5 },
        },
        {
          id: 'conn_gdrive',
          type: 'storage',
          provider: 'gdrive',
          name: 'Google Drive',
          account: 'user@gmail.com',
          connected: true,
          permissions: ['Read files', 'Write files'],
          lastSync: new Date(Date.now() - 300000).toISOString(),
          stats: { itemsProcessed: 45, actionsToday: 2 },
        },
        {
          id: 'conn_gcalendar',
          type: 'calendar',
          provider: 'gcalendar',
          name: 'Google Calendar',
          account: 'user@gmail.com',
          connected: false,
          permissions: [],
          stats: {},
        },
      ],
    });
  }

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

  // Provider to name/type mapping
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

  // In a real implementation, this would initiate OAuth flow
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
  const id = c.req.param('id');

  // Mock activity data
  const activities = [
    { id: 'act_1', action: 'Synced', count: 25, timestamp: new Date(Date.now() - 300000).toISOString() },
    { id: 'act_2', action: 'Processed emails', count: 12, timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'act_3', action: 'Sent auto-reply', count: 3, timestamp: new Date(Date.now() - 7200000).toISOString() },
  ];

  return c.json({ activities });
});
