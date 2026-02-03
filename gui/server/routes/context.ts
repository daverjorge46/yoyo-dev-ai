/**
 * Context Routes
 *
 * Provides GUI context information including mode (dev/ai) and configuration.
 */

import { Hono } from 'hono';
import type { Variables } from '../types.js';

export type GuiMode = 'dev' | 'ai';

export interface GuiContext {
  mode: GuiMode;
  port: number;
  projectRoot: string;
  version: string;
  features: {
    specs: boolean;
    fixes: boolean;
    roadmap: boolean;
    memory: boolean;
    skills: boolean;
    chat: boolean;
    agents: boolean;
    terminals: boolean;
    qa: boolean;
  };
}

const contextRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /api/context
 * Returns the current GUI context including mode and available features
 */
contextRoutes.get('/', (c) => {
  const mode = (process.env.YOYO_GUI_MODE as GuiMode) || 'dev';
  const port = parseInt(process.env.YOYO_GUI_PORT || '3456', 10);
  const projectRoot = c.get('projectRoot') || process.cwd();
  const version = process.env.YOYO_VERSION || '7.0.0';

  // Features vary by mode
  const features = mode === 'dev'
    ? {
        // yoyo-dev features: development-focused
        specs: true,
        fixes: true,
        roadmap: true,
        memory: true,
        skills: true,
        chat: true,
        agents: true,
        terminals: true,
        qa: true,
      }
    : {
        // yoyo-ai features: AI assistant-focused
        specs: false,
        fixes: false,
        roadmap: false,
        memory: true,
        skills: true,
        chat: true,
        agents: true,
        terminals: false,
        qa: false,
      };

  const context: GuiContext = {
    mode,
    port,
    projectRoot,
    version,
    features,
  };

  return c.json(context);
});

export { contextRoutes };
