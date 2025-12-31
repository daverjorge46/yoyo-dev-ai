/**
 * Chat API Routes
 *
 * Provides chat endpoints using Claude Code CLI integration.
 * Streams responses via Server-Sent Events (SSE).
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Variables } from '../types.js';
import { getChatService } from '../services/chat.js';

export const chatRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface PostChatBody {
  message: string;
  sessionId?: string;
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/chat/status
 *
 * Check if Claude Code CLI is available.
 * Returns availability status with version or error message.
 */
chatRoutes.get('/status', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  try {
    const chatService = getChatService(projectRoot);
    const availability = await chatService.checkClaudeAvailability();

    return c.json(availability);
  } catch (error) {
    console.error('[Chat API] Status check error:', error);

    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to check Claude Code availability' },
      500
    );
  }
});

/**
 * POST /api/chat
 *
 * Send a chat message and stream the response via SSE.
 * Uses Claude Code CLI subprocess for communication.
 */
chatRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  // Parse and validate request body
  let body: PostChatBody;
  try {
    body = await c.req.json<PostChatBody>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Validate message
  if (!body.message || typeof body.message !== 'string') {
    return c.json(
      { error: 'Message is required and must be a string' },
      400
    );
  }

  // Get trimmed message
  const message = body.message.trim();
  if (!message) {
    return c.json(
      { error: 'Message cannot be empty' },
      400
    );
  }

  // Get chat service
  const chatService = getChatService(projectRoot);

  // Extract optional sessionId
  const sessionId = body.sessionId;

  // Stream response via SSE
  return streamSSE(c, async (stream) => {
    try {
      const responseStream = chatService.chat(message, sessionId);

      for await (const chunk of responseStream) {
        await stream.writeSSE({
          data: JSON.stringify({ content: chunk }),
        });
      }

      // Signal completion
      await stream.writeSSE({
        data: '[DONE]',
      });
    } catch (error) {
      console.error('[Chat API] Stream error:', error);

      // Send error event
      await stream.writeSSE({
        data: JSON.stringify({
          error: error instanceof Error ? error.message : 'Stream error',
        }),
      });
    }
  });
});

/**
 * POST /api/chat/abort
 *
 * Abort the current chat request.
 */
chatRoutes.post('/abort', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const chatService = getChatService(projectRoot);

  chatService.abort();

  return c.json({ success: true });
});
