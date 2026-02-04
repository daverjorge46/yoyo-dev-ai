import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';
import { openclawProxy } from '../services/openclawProxy.js';

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
  const model = formData.get('model') as string | null;
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

  // Send message to OpenClaw gateway
  let assistantContent = '';
  let suggestedActions: Array<{ id: string; label: string; action: string }> = [];

  try {
    // Check if OpenClaw is healthy
    const isHealthy = await openclawProxy.isHealthy();

    if (isHealthy) {
      // Send message to OpenClaw with optional model
      const response = await openclawProxy.sendMessage(content, {
        attachments: attachments.map(a => ({ name: a.name, type: a.type })),
        model: model || undefined,
      });

      if (response.success && response.data) {
        assistantContent = response.data.response;
        if (response.data.suggestedActions) {
          suggestedActions = response.data.suggestedActions.map((a, i) => ({
            id: `action_${i}`,
            label: a.label,
            action: a.action,
          }));
        }
      } else {
        // OpenClaw returned an error
        assistantContent = `I'm having trouble processing your request. OpenClaw returned: ${response.error || 'Unknown error'}. Please try again or check if OpenClaw is running properly.`;
      }
    } else {
      // OpenClaw not available
      assistantContent = `OpenClaw gateway is not available. Please make sure it's running with: \`yoyo-ai start\`\n\nYour message was: "${content}"`;
      suggestedActions = [
        { id: 'action_1', label: 'Retry', action: 'retry' },
        { id: 'action_2', label: 'Check Status', action: 'check_status' },
      ];
    }
  } catch (error) {
    console.error('Error communicating with OpenClaw:', error);
    assistantContent = `Error communicating with OpenClaw: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if the gateway is running.`;
    suggestedActions = [
      { id: 'action_1', label: 'Retry', action: 'retry' },
    ];
  }

  // Store assistant response
  const assistantMessageId = generateId('msg_');

  db.prepare(`
    INSERT INTO chat_history (id, role, content, suggested_actions, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    assistantMessageId,
    'assistant',
    assistantContent,
    JSON.stringify(suggestedActions),
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
      content: assistantContent,
      suggestedActions,
      timestamp: new Date().toISOString(),
    },
  });
});

chatRouter.post('/voice', async (c) => {
  const formData = await c.req.formData();
  const audio = formData.get('audio') as File;

  // In a real implementation, this would transcribe the audio via OpenClaw or STT service
  // For now, return a message about voice support
  const transcription = '[Voice message received - transcription not yet implemented]';

  // Process as a regular message
  const db = getDatabase();
  const userMessageId = generateId('msg_');
  const timestamp = Date.now();

  db.prepare(`
    INSERT INTO chat_history (id, role, content, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(userMessageId, 'user', transcription, timestamp);

  // Get response from OpenClaw
  let assistantContent = '';
  let suggestedActions: Array<{ id: string; label: string; action: string }> = [];

  try {
    const isHealthy = await openclawProxy.isHealthy();

    if (isHealthy) {
      const response = await openclawProxy.sendMessage(transcription);
      if (response.success && response.data) {
        assistantContent = response.data.response;
      } else {
        assistantContent = 'Voice message received, but I could not process it. Please try typing your message instead.';
      }
    } else {
      assistantContent = 'OpenClaw gateway is not available. Please start it with: yoyo-ai start';
    }
  } catch (error) {
    assistantContent = 'Error processing voice message. Please try again.';
  }

  const assistantMessageId = generateId('msg_');

  db.prepare(`
    INSERT INTO chat_history (id, role, content, suggested_actions, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    assistantMessageId,
    'assistant',
    assistantContent,
    JSON.stringify(suggestedActions),
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
      content: assistantContent,
      suggestedActions,
      timestamp: new Date().toISOString(),
    },
  });
});

chatRouter.delete('/history', (c) => {
  const db = getDatabase();
  db.prepare('DELETE FROM chat_history').run();
  return c.json({ success: true });
});
