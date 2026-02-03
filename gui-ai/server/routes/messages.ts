import { Hono } from 'hono';
import { generateId } from '../lib/database.js';

export const messagesRouter = new Hono();

// Mock channels data (in real implementation, this would come from OpenClaw)
const mockChannels = [
  { id: 'ch_sms', type: 'sms', name: 'SMS', connected: true, unreadCount: 3 },
  { id: 'ch_whatsapp', type: 'whatsapp', name: 'WhatsApp', connected: true, unreadCount: 12 },
  { id: 'ch_email', type: 'email', name: 'Email', connected: true, unreadCount: 45 },
  { id: 'ch_slack', type: 'slack', name: 'Slack', connected: false, unreadCount: 0 },
];

// Mock messages per channel
const mockMessages: Record<string, any[]> = {
  ch_sms: [
    { id: 'msg_1', from: '+1234567890', to: 'me', content: 'Hey, are you available for a call?', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: 'msg_2', from: 'me', to: '+1234567890', content: 'Sure, give me 5 minutes', timestamp: new Date(Date.now() - 3500000).toISOString(), read: true },
    { id: 'msg_3', from: '+1234567890', to: 'me', content: 'Perfect, calling now', timestamp: new Date(Date.now() - 3400000).toISOString(), read: false },
  ],
  ch_whatsapp: [
    { id: 'msg_4', from: 'John Doe', to: 'me', content: 'Did you see the project update?', timestamp: new Date(Date.now() - 7200000).toISOString(), read: true },
    { id: 'msg_5', from: 'me', to: 'John Doe', content: 'Yes, looks great! I have some feedback.', timestamp: new Date(Date.now() - 7100000).toISOString(), read: true },
    { id: 'msg_6', from: 'John Doe', to: 'me', content: 'Please share when you can', timestamp: new Date(Date.now() - 7000000).toISOString(), read: false },
  ],
  ch_email: [
    { id: 'msg_7', from: 'newsletter@company.com', to: 'me', content: 'Weekly digest: Top stories from this week...', timestamp: new Date(Date.now() - 86400000).toISOString(), read: true },
    { id: 'msg_8', from: 'boss@company.com', to: 'me', content: 'Re: Q4 Planning - Let\'s discuss this in our meeting tomorrow.', timestamp: new Date(Date.now() - 43200000).toISOString(), read: false },
  ],
  ch_slack: [],
};

messagesRouter.get('/channels', (c) => {
  return c.json({ channels: mockChannels });
});

messagesRouter.get('/:channelId', (c) => {
  const channelId = c.req.param('channelId');
  const messages = mockMessages[channelId] || [];

  return c.json({ messages });
});

messagesRouter.post('/:channelId/send', async (c) => {
  const channelId = c.req.param('channelId');
  const body = await c.req.json();
  const content = body.content;

  const newMessage = {
    id: generateId('msg_'),
    from: 'me',
    to: 'recipient',
    content,
    timestamp: new Date().toISOString(),
    read: true,
  };

  // Add to mock messages
  if (!mockMessages[channelId]) {
    mockMessages[channelId] = [];
  }
  mockMessages[channelId].push(newMessage);

  // In real implementation, this would send via OpenClaw
  return c.json({ message: newMessage }, 201);
});

messagesRouter.get('/search', async (c) => {
  const query = c.req.query('q') || '';
  const results: any[] = [];

  // Search across all channels
  for (const [channelId, messages] of Object.entries(mockMessages)) {
    const channel = mockChannels.find(ch => ch.id === channelId);
    for (const msg of messages) {
      if (msg.content.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          ...msg,
          channelId,
          channelName: channel?.name,
        });
      }
    }
  }

  return c.json({ results });
});
