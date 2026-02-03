import { Hono } from 'hono';
import { getDatabase } from '../lib/database.js';

export const settingsRouter = new Hono();

settingsRouter.get('/', (c) => {
  const db = getDatabase();

  const notifications = db.prepare("SELECT value FROM settings WHERE key = 'notifications'").get() as any;
  const appearance = db.prepare("SELECT value FROM settings WHERE key = 'appearance'").get() as any;
  const privacy = db.prepare("SELECT value FROM settings WHERE key = 'privacy'").get() as any;
  const data = db.prepare("SELECT value FROM settings WHERE key = 'data'").get() as any;

  return c.json({
    notifications: notifications ? JSON.parse(notifications.value) : {
      taskComplete: true,
      suggestions: true,
      messages: true,
      browserNotifications: false,
    },
    appearance: appearance ? JSON.parse(appearance.value) : {
      theme: 'dark',
      compactMode: false,
    },
    privacy: privacy ? JSON.parse(privacy.value) : {
      analytics: false,
      crashReports: false,
    },
    data: data ? JSON.parse(data.value) : {
      autoBackup: true,
      retentionDays: 90,
    },
  });
});

settingsRouter.put('/', async (c) => {
  const db = getDatabase();
  const body = await c.req.json();

  const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  if (body.notifications) {
    updateSetting.run('notifications', JSON.stringify(body.notifications));
  }
  if (body.appearance) {
    updateSetting.run('appearance', JSON.stringify(body.appearance));
  }
  if (body.privacy) {
    updateSetting.run('privacy', JSON.stringify(body.privacy));
  }
  if (body.data) {
    updateSetting.run('data', JSON.stringify(body.data));
  }

  return c.json({ success: true });
});

settingsRouter.post('/clear/:type', (c) => {
  const db = getDatabase();
  const type = c.req.param('type');

  switch (type) {
    case 'chat':
      db.prepare('DELETE FROM chat_history').run();
      break;
    case 'tasks':
      db.prepare('DELETE FROM tasks').run();
      break;
    case 'all':
      db.prepare('DELETE FROM chat_history').run();
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM automations').run();
      db.prepare('DELETE FROM quick_actions').run();
      db.prepare('DELETE FROM documents').run();
      break;
    default:
      return c.json({ error: 'Invalid clear type' }, 400);
  }

  return c.json({ success: true });
});

settingsRouter.get('/export', (c) => {
  const db = getDatabase();

  const exportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    chatHistory: db.prepare('SELECT * FROM chat_history').all(),
    tasks: db.prepare('SELECT * FROM tasks').all(),
    automations: db.prepare('SELECT * FROM automations').all(),
    connections: db.prepare('SELECT * FROM connections').all(),
    settings: db.prepare('SELECT * FROM settings').all(),
  };

  return c.json(exportData);
});

settingsRouter.post('/import', async (c) => {
  const db = getDatabase();
  const body = await c.req.json();

  // Validate import data
  if (!body.version || !body.exportedAt) {
    return c.json({ error: 'Invalid import data' }, 400);
  }

  // Import settings
  if (body.settings) {
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const setting of body.settings) {
      insertSetting.run(setting.key, setting.value);
    }
  }

  // Note: In a real implementation, you'd want more careful handling of
  // other data types to avoid duplicates and conflicts

  return c.json({ success: true, message: 'Settings imported successfully' });
});
