import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const modelsRouter = new Hono();

// Default models available when openclaw is not running or doesn't provide models
const DEFAULT_MODELS = [
  // OpenClaw / Local
  { id: 'default', name: 'Default', provider: 'OpenClaw', description: 'Default agent model' },
  // Anthropic Claude
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Latest balanced model' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Fast and capable' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Most powerful' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Fastest responses' },
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Latest multimodal' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Fast GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Quick and efficient' },
  // Google
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Experimental fast' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Advanced reasoning' },
  // Moonshot
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'Moonshot', description: 'Multilingual model' },
];

/**
 * Get available models
 * Tries to fetch from openclaw first, falls back to defaults
 */
modelsRouter.get('/', async (c) => {
  try {
    // Try to get models from openclaw if available
    const { stdout } = await execAsync('openclaw models --json 2>/dev/null', {
      timeout: 5000,
    });

    try {
      const result = JSON.parse(stdout);
      if (result.models && Array.isArray(result.models) && result.models.length > 0) {
        return c.json({ models: result.models });
      }
    } catch {
      // JSON parse failed, use defaults
    }
  } catch {
    // Command failed, use defaults
  }

  return c.json({ models: DEFAULT_MODELS });
});

/**
 * Get current model for the GUI session
 */
modelsRouter.get('/current', (c) => {
  // For now, return default. Could be extended to persist selection
  return c.json({ model: 'default' });
});
