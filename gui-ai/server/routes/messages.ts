import { Hono } from 'hono';

export const messagesRouter = new Hono();

messagesRouter.get('/channels', (c) => {
  return c.json({ channels: [] });
});

messagesRouter.get('/:channelId', (c) => {
  return c.json({ messages: [] });
});

messagesRouter.post('/:channelId/send', async (c) => {
  return c.json({ error: 'Message sending is not available. Connect a messaging provider to enable this feature.' }, 501);
});

messagesRouter.get('/search', async (c) => {
  return c.json({ results: [] });
});
