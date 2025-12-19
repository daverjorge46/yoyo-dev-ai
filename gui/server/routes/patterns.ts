/**
 * Patterns API Routes
 *
 * Provides access to learned patterns stored in .yoyo-dev/patterns/
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Variables } from '../types.js';

export const patternsRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface PatternSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  usageCount: number;
  tags: string[];
}

interface PatternDetail extends PatternSummary {
  content: string;
  examples: string[];
  relatedPatterns: string[];
}

// =============================================================================
// Helpers
// =============================================================================

function parsePatternFile(filename: string, content: string): PatternDetail | null {
  const id = filename.replace('.md', '');

  // Parse YAML frontmatter if present
  let category = 'general';
  let usageCount = 0;
  const tags: string[] = [];

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    const categoryMatch = frontmatter.match(/category:\s*(.+)/);
    if (categoryMatch) category = categoryMatch[1].trim();

    const usageMatch = frontmatter.match(/usage_count:\s*(\d+)/);
    if (usageMatch) usageCount = parseInt(usageMatch[1], 10);

    const tagsMatch = frontmatter.match(/tags:\s*\[(.*)\]/);
    if (tagsMatch) {
      tagsMatch[1].split(',').forEach(t => {
        const tag = t.trim().replace(/['"]/g, '');
        if (tag) tags.push(tag);
      });
    }
  }

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : id.replace(/-/g, ' ');

  // Extract description (first paragraph after title)
  const descMatch = content.match(/^#[^\n]+\n+([^#\n][^\n]*)/m);
  const description = descMatch ? descMatch[1].trim().slice(0, 200) : '';

  // Extract examples from code blocks or example sections
  const examples: string[] = [];
  const exampleSectionMatch = content.match(/## Examples?\n+([\s\S]*?)(?=\n##|$)/i);
  if (exampleSectionMatch) {
    const codeBlocks = exampleSectionMatch[1].matchAll(/```[\s\S]*?```/g);
    for (const block of codeBlocks) {
      examples.push(block[0]);
    }
  }

  // If no example section, look for any code blocks
  if (examples.length === 0) {
    const codeBlocks = content.matchAll(/```[\s\S]*?```/g);
    for (const block of codeBlocks) {
      examples.push(block[0]);
      if (examples.length >= 2) break;
    }
  }

  // Extract related patterns
  const relatedPatterns: string[] = [];
  const relatedMatch = content.match(/## (?:Related|See Also)\n+([\s\S]*?)(?=\n##|$)/i);
  if (relatedMatch) {
    const links = relatedMatch[1].matchAll(/[-*]\s+(?:\[([^\]]+)\]|([^\n]+))/g);
    for (const link of links) {
      relatedPatterns.push((link[1] || link[2]).trim());
    }
  }

  return {
    id,
    title,
    category,
    description,
    usageCount,
    tags,
    content,
    examples,
    relatedPatterns,
  };
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/patterns - List all patterns
patternsRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const patternsPath = join(projectRoot, '.yoyo-dev', 'patterns');

  if (!existsSync(patternsPath)) {
    return c.json({ patterns: [], count: 0, categories: [] });
  }

  try {
    const files = readdirSync(patternsPath)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .sort();

    const patterns: PatternSummary[] = [];
    const categorySet = new Set<string>();

    for (const file of files) {
      const content = readFileSync(join(patternsPath, file), 'utf-8');
      const parsed = parsePatternFile(file, content);
      if (parsed) {
        categorySet.add(parsed.category);
        patterns.push({
          id: parsed.id,
          title: parsed.title,
          category: parsed.category,
          description: parsed.description,
          usageCount: parsed.usageCount,
          tags: parsed.tags,
        });
      }
    }

    // Sort by category then by title
    patterns.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.title.localeCompare(b.title);
    });

    return c.json({
      patterns,
      count: patterns.length,
      categories: Array.from(categorySet).sort(),
    });
  } catch {
    return c.json({ patterns: [], count: 0, categories: [] });
  }
});

// GET /api/patterns/:id - Get specific pattern
patternsRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const patternId = c.req.param('id');
  const patternPath = join(projectRoot, '.yoyo-dev', 'patterns', `${patternId}.md`);

  if (!existsSync(patternPath)) {
    return c.json({ error: 'Pattern not found' }, 404);
  }

  try {
    const content = readFileSync(patternPath, 'utf-8');
    const parsed = parsePatternFile(`${patternId}.md`, content);

    if (!parsed) {
      return c.json({ error: 'Failed to parse pattern' }, 500);
    }

    return c.json(parsed);
  } catch {
    return c.json({ error: 'Failed to read pattern' }, 500);
  }
});
