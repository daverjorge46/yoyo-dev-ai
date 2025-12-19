/**
 * Recaps API Routes
 *
 * Provides access to session recaps stored in .yoyo-dev/recaps/
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Variables } from '../types.js';

export const recapsRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface RecapSummary {
  id: string;
  title: string;
  date: string;
  summary: string;
  specName: string | null;
  taskCount: number;
  linesAdded: number | null;
  linesRemoved: number | null;
}

interface RecapDetail extends RecapSummary {
  content: string;
  keyDecisions: string[];
  lessonsLearned: string[];
}

// =============================================================================
// Helpers
// =============================================================================

function parseRecapFile(filename: string, content: string): RecapDetail | null {
  // Extract date from filename: YYYY-MM-DD-feature-name.md
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  if (!dateMatch) return null;

  const date = dateMatch[1];
  const id = filename.replace('.md', '');

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : dateMatch[2].replace(/-/g, ' ');

  // Extract spec name if mentioned
  const specMatch = content.match(/spec[:\s]+([^\n]+)/i) ||
    content.match(/for\s+(?:spec\s+)?["']?([^"'\n]+)["']?/i);
  const specName = specMatch ? specMatch[1].trim() : null;

  // Extract summary (first paragraph after title)
  const summaryMatch = content.match(/^#[^\n]+\n+([^#\n][^\n]*)/m);
  const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 200) : '';

  // Count tasks mentioned
  const taskMatches = content.match(/- \[[ xX]\]/g);
  const taskCount = taskMatches ? taskMatches.length : 0;

  // Extract lines changed if present
  const linesMatch = content.match(/(\d+)\s*(?:lines?\s*)?(?:added|insertions?)/i);
  const linesRemovedMatch = content.match(/(\d+)\s*(?:lines?\s*)?(?:deleted|removed|deletions?)/i);
  const linesAdded = linesMatch ? parseInt(linesMatch[1], 10) : null;
  const linesRemoved = linesRemovedMatch ? parseInt(linesRemovedMatch[1], 10) : null;

  // Extract key decisions
  const decisionsMatch = content.match(/## (?:Key )?Decisions?\n+([\s\S]*?)(?=\n##|$)/i);
  const keyDecisions: string[] = [];
  if (decisionsMatch) {
    const matches = decisionsMatch[1].matchAll(/[-*]\s+(.+)/g);
    for (const match of matches) {
      keyDecisions.push(match[1].trim());
    }
  }

  // Extract lessons learned
  const lessonsMatch = content.match(/## (?:Lessons? ?Learned|Takeaways?)\n+([\s\S]*?)(?=\n##|$)/i);
  const lessonsLearned: string[] = [];
  if (lessonsMatch) {
    const matches = lessonsMatch[1].matchAll(/[-*]\s+(.+)/g);
    for (const match of matches) {
      lessonsLearned.push(match[1].trim());
    }
  }

  return {
    id,
    title,
    date,
    summary,
    specName,
    taskCount,
    linesAdded,
    linesRemoved,
    content,
    keyDecisions,
    lessonsLearned,
  };
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/recaps - List all recaps
recapsRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const recapsPath = join(projectRoot, '.yoyo-dev', 'recaps');

  if (!existsSync(recapsPath)) {
    return c.json({ recaps: [], count: 0 });
  }

  try {
    const files = readdirSync(recapsPath)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();

    const recaps: RecapSummary[] = [];

    for (const file of files) {
      const content = readFileSync(join(recapsPath, file), 'utf-8');
      const parsed = parseRecapFile(file, content);
      if (parsed) {
        // Return summary only
        recaps.push({
          id: parsed.id,
          title: parsed.title,
          date: parsed.date,
          summary: parsed.summary,
          specName: parsed.specName,
          taskCount: parsed.taskCount,
          linesAdded: parsed.linesAdded,
          linesRemoved: parsed.linesRemoved,
        });
      }
    }

    return c.json({ recaps, count: recaps.length });
  } catch {
    return c.json({ recaps: [], count: 0 });
  }
});

// GET /api/recaps/:id - Get specific recap
recapsRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const recapId = c.req.param('id');
  const recapPath = join(projectRoot, '.yoyo-dev', 'recaps', `${recapId}.md`);

  if (!existsSync(recapPath)) {
    return c.json({ error: 'Recap not found' }, 404);
  }

  try {
    const content = readFileSync(recapPath, 'utf-8');
    const parsed = parseRecapFile(`${recapId}.md`, content);

    if (!parsed) {
      return c.json({ error: 'Failed to parse recap' }, 500);
    }

    return c.json(parsed);
  } catch {
    return c.json({ error: 'Failed to read recap' }, 500);
  }
});
