import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';

export const chatRouter = new Hono();

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
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      suggestedActions: m.suggestedActions ? JSON.parse(m.suggestedActions) : [],
      timestamp: new Date(m.timestamp).toISOString(),
    })),
  });
});

chatRouter.post('/message', async (c) => {
  const db = getDatabase();
  const formData = await c.req.formData();
  const content = formData.get('content') as string;
  const attachmentFiles = formData.getAll('attachments') as File[];

  // Store user message
  const userMessageId = generateId('msg_');
  const timestamp = Date.now();

  const attachments = attachmentFiles.map((file, i) => ({
    id: `att_${timestamp}_${i}`,
    name: file.name,
    type: file.type,
    size: file.size,
  }));

  db.prepare(`
    INSERT INTO chat_history (id, role, content, attachments, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(userMessageId, 'user', content, JSON.stringify(attachments), timestamp);

  // Generate AI response (mock for now, would integrate with OpenClaw)
  const assistantMessageId = generateId('msg_');
  const assistantResponse = generateMockResponse(content);

  db.prepare(`
    INSERT INTO chat_history (id, role, content, suggested_actions, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    assistantMessageId,
    'assistant',
    assistantResponse.content,
    JSON.stringify(assistantResponse.suggestedActions),
    Date.now()
  );

  return c.json({
    userMessage: {
      id: userMessageId,
      role: 'user',
      content,
      attachments,
      timestamp: new Date(timestamp).toISOString(),
    },
    assistantMessage: {
      id: assistantMessageId,
      role: 'assistant',
      content: assistantResponse.content,
      suggestedActions: assistantResponse.suggestedActions,
      timestamp: new Date().toISOString(),
    },
  });
});

chatRouter.post('/voice', async (c) => {
  const formData = await c.req.formData();
  const audio = formData.get('audio') as File;

  // In a real implementation, this would transcribe the audio
  // For now, return a mock transcription
  const transcription = 'This is a mock transcription of your voice message.';

  // Process as a regular message
  const db = getDatabase();
  const userMessageId = generateId('msg_');
  const timestamp = Date.now();

  db.prepare(`
    INSERT INTO chat_history (id, role, content, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(userMessageId, 'user', transcription, timestamp);

  // Generate response
  const assistantMessageId = generateId('msg_');
  const assistantResponse = generateMockResponse(transcription);

  db.prepare(`
    INSERT INTO chat_history (id, role, content, suggested_actions, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    assistantMessageId,
    'assistant',
    assistantResponse.content,
    JSON.stringify(assistantResponse.suggestedActions),
    Date.now()
  );

  return c.json({
    transcription,
    userMessage: {
      id: userMessageId,
      role: 'user',
      content: transcription,
      timestamp: new Date(timestamp).toISOString(),
    },
    assistantMessage: {
      id: assistantMessageId,
      role: 'assistant',
      content: assistantResponse.content,
      suggestedActions: assistantResponse.suggestedActions,
      timestamp: new Date().toISOString(),
    },
  });
});

chatRouter.delete('/history', (c) => {
  const db = getDatabase();
  db.prepare('DELETE FROM chat_history').run();
  return c.json({ success: true });
});

// Mock response generator
function generateMockResponse(input: string): { content: string; suggestedActions: any[] } {
  const responses = [
    {
      content: `I understand you're asking about "${input.slice(0, 50)}...". I can help you with that! Here's what I can do:\n\n1. Analyze the request\n2. Create a task for it\n3. Schedule an automation\n\nWould you like me to proceed with any of these options?`,
      suggestedActions: [
        { id: 'action_1', label: 'Create Task', action: 'create_task' },
        { id: 'action_2', label: 'Schedule', action: 'schedule' },
      ],
    },
    {
      content: `Great question! Based on your request, I've analyzed several options. Here's my recommendation:\n\n\`\`\`javascript\n// Example code\nconst result = await processRequest("${input.slice(0, 20)}");\nconsole.log(result);\n\`\`\`\n\nLet me know if you'd like me to explain further or take action.`,
      suggestedActions: [
        { id: 'action_1', label: 'Run Code', action: 'run_code' },
        { id: 'action_2', label: 'Explain More', action: 'explain' },
      ],
    },
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
