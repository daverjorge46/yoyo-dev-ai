/**
 * Changelog API Routes
 *
 * Provides changelog generation from spec files.
 */

import { Hono } from 'hono';
import type { Variables } from '../types.js';
import { generateChangelog, validateSpec, type ChangelogFormat } from '../services/changelog.js';

export const changelogRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface GenerateChangelogInput {
  specId: string;
  format?: ChangelogFormat;
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/changelog/generate
 *
 * Generates a changelog from a spec's files (spec.md, tasks.md, decisions.md).
 *
 * Request body:
 *   - specId: string (required) - The spec identifier
 *   - format: 'keepachangelog' | 'conventional' | 'plain' (optional, default: 'keepachangelog')
 *
 * Response:
 *   - changelog: string - The generated changelog in markdown format
 *   - sections: ChangelogSection[] - Categorized entries
 *   - specId: string - The spec identifier
 *   - generatedAt: string - ISO timestamp
 */
changelogRoutes.post('/generate', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  let input: GenerateChangelogInput;
  try {
    input = await c.req.json<GenerateChangelogInput>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Validate required fields
  if (!input.specId) {
    return c.json({ error: 'specId is required' }, 400);
  }

  // Validate spec exists
  if (!validateSpec(projectRoot, input.specId)) {
    return c.json({ error: 'Specification not found' }, 404);
  }

  // Validate format
  const validFormats: ChangelogFormat[] = ['keepachangelog', 'conventional', 'plain'];
  const format: ChangelogFormat = input.format && validFormats.includes(input.format)
    ? input.format
    : 'keepachangelog';

  try {
    const result = generateChangelog(projectRoot, input.specId, format);
    return c.json(result);
  } catch (err) {
    console.error('[Changelog] Generation error:', err);
    return c.json(
      { error: 'Failed to generate changelog', details: String(err) },
      500
    );
  }
});

/**
 * GET /api/changelog/formats
 *
 * Returns available changelog formats with descriptions.
 */
changelogRoutes.get('/formats', (c) => {
  return c.json({
    formats: [
      {
        id: 'keepachangelog',
        name: 'Keep a Changelog',
        description: 'Follows keepachangelog.com format with semantic versioning sections',
      },
      {
        id: 'conventional',
        name: 'Conventional Commits',
        description: 'Git-style commit format with type prefixes (feat:, fix:, etc.)',
      },
      {
        id: 'plain',
        name: 'Plain Text',
        description: 'Simple bullet-point list without special formatting',
      },
    ],
  });
});
