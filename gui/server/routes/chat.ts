/**
 * Chat API Routes
 *
 * Provides chat endpoints for codebase exploration.
 */

import { Hono } from 'hono';
import type { Variables } from '../types.js';
import { getChatService, type ChatRequest } from '../services/chat.js';

export const chatRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface PostChatBody {
  message: string;
  context?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/chat
 *
 * Send a chat message and get a response from Claude.
 */
chatRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  try {
    // Parse request body
    const body = await c.req.json<PostChatBody>();

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

    // Build request
    const request: ChatRequest = {
      message,
      context: body.context,
    };

    // Send to Claude
    const response = await chatService.chat(request);

    return c.json(response);
  } catch (error) {
    console.error('[Chat API] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return c.json(
      { error: errorMessage },
      500
    );
  }
});

/**
 * POST /api/chat/configure
 *
 * Configure API key for chat service.
 */
chatRoutes.post('/configure', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  try {
    // Parse request body
    const body = await c.req.json<{ apiKey?: unknown }>();

    // Validate apiKey field exists
    if (body.apiKey === undefined || body.apiKey === null) {
      return c.json(
        { error: 'API key is required' },
        400
      );
    }

    // Validate apiKey is string
    if (typeof body.apiKey !== 'string') {
      return c.json(
        { error: 'API key must be a string' },
        400
      );
    }

    // Get chat service
    const chatService = getChatService(projectRoot);

    // Update API key (service will validate if it's valid)
    const success = await chatService.updateApiKey(body.apiKey);

    if (success) {
      return c.json({ success: true });
    } else {
      return c.json({
        success: false,
        error: 'Invalid API key or configuration failed',
      });
    }
  } catch (error) {
    console.error('[Chat API] Configuration error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return c.json(
      { error: errorMessage },
      500
    );
  }
});

/**
 * GET /api/chat/status
 *
 * Check if chat service is available.
 */
chatRoutes.get('/status', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const chatService = getChatService(projectRoot);

  return c.json({
    available: chatService.isAvailable(),
    message: chatService.isAvailable()
      ? 'Chat service is ready'
      : 'Chat feature requires ANTHROPIC_API_KEY environment variable',
  });
});
