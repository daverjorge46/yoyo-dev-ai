/**
 * Skills API Routes
 *
 * Provides access to skills and usage statistics.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import type { Variables } from '../types.js';

export const skillsRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface SkillSummary {
  id: string;
  name: string;
  tags: string[];
  triggers: string[];
  successRate: number;
  usageCount: number;
}

interface SkillStats {
  skillId: string;
  name: string;
  totalUsage: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastUsed: string | null;
}

interface AggregateStats {
  totalSkills: number;
  totalUsage: number;
  averageSuccessRate: number;
  topSkills: SkillStats[];
  recentSkills: SkillStats[];
}

// =============================================================================
// Helpers
// =============================================================================

function getSkillsDbPath(projectRoot: string): string {
  return join(projectRoot, '.yoyo-ai', '.skills', 'skills.db');
}

function getSkillsDir(projectRoot: string): string {
  // Skills are stored in .claude/skills/ directory (Claude Code convention)
  return join(projectRoot, '.claude', 'skills');
}

function getDatabase(projectRoot: string): Database.Database | null {
  const dbPath = getSkillsDbPath(projectRoot);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

function parseSkillFile(content: string, filename: string): Partial<SkillSummary> | null {
  const result: Partial<SkillSummary> = {};

  // Try YAML frontmatter first
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (!key || valueParts.length === 0) continue;

      const value = valueParts.join(':').trim();

      switch (key.trim()) {
        case 'id':
          result.id = value;
          break;
        case 'name':
          result.name = value;
          break;
        case 'successRate':
          result.successRate = parseFloat(value) || 0;
          break;
        case 'usageCount':
          result.usageCount = parseInt(value, 10) || 0;
          break;
        case 'tags':
          const tagMatch = value.match(/\[(.*)\]/);
          if (tagMatch) {
            result.tags = tagMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
          }
          break;
        case 'triggers':
          const triggerMatch = value.match(/\[(.*)\]/);
          if (triggerMatch) {
            result.triggers = triggerMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
          }
          break;
      }
    }
  }

  // Fallback: Parse markdown format (# Title, **Keywords:** ...)
  // Extract name from first H1 heading
  if (!result.name) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      result.name = titleMatch[1].trim();
    }
  }

  // Generate ID from filename if not set
  if (!result.id) {
    result.id = filename.replace(/\.md$/, '');
  }

  // Extract keywords/triggers from **Keywords:** line
  if (!result.triggers || result.triggers.length === 0) {
    const keywordsMatch = content.match(/\*\*Keywords:\*\*\s*(.+)$/m);
    if (keywordsMatch) {
      result.triggers = keywordsMatch[1].split(',').map(k => k.trim());
    }
  }

  // Extract tags from "## What I'll help with" or "## Key Expertise" sections
  if (!result.tags || result.tags.length === 0) {
    const tags: string[] = [];

    // Look for section headers to derive tags
    if (content.includes('bash') || content.includes('shell')) tags.push('bash');
    if (content.includes('python') || content.includes('pip')) tags.push('python');
    if (content.includes('git') || content.includes('commit')) tags.push('git');
    if (content.includes('test') || content.includes('pytest')) tags.push('testing');
    if (content.includes('tui') || content.includes('textual')) tags.push('tui');

    result.tags = tags;
  }

  // Only return if we have at least id and name
  if (result.id && result.name) {
    return result;
  }

  return null;
}

function getSkillsFromFiles(projectRoot: string): SkillSummary[] {
  const skillsDir = getSkillsDir(projectRoot);
  if (!existsSync(skillsDir)) {
    return [];
  }

  const skills: SkillSummary[] = [];

  try {
    const files = readdirSync(skillsDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('optimization-report'));

    for (const file of files) {
      const content = readFileSync(join(skillsDir, file), 'utf-8');
      const parsed = parseSkillFile(content, file);
      if (parsed && parsed.id && parsed.name) {
        skills.push({
          id: parsed.id,
          name: parsed.name,
          tags: parsed.tags || [],
          triggers: parsed.triggers || [],
          successRate: parsed.successRate || 0,
          usageCount: parsed.usageCount || 0,
        });
      }
    }
  } catch {
    // Ignore
  }

  return skills;
}

function getStatsFromDb(projectRoot: string): SkillStats[] {
  const db = getDatabase(projectRoot);
  if (!db) {
    return [];
  }

  try {
    const rows = db.prepare(`
      SELECT
        skill_id as skillId,
        name,
        total_usage as totalUsage,
        success_count as successCount,
        failure_count as failureCount,
        success_rate as successRate,
        last_used as lastUsed
      FROM skill_tracking
      ORDER BY total_usage DESC
    `).all() as SkillStats[];

    db.close();
    return rows;
  } catch {
    db.close();
    return [];
  }
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/skills - List all skills
skillsRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  // Get skills from markdown files
  const skills = getSkillsFromFiles(projectRoot);

  // Merge with database stats
  const dbStats = getStatsFromDb(projectRoot);
  const statsMap = new Map(dbStats.map(s => [s.skillId, s]));

  for (const skill of skills) {
    const stats = statsMap.get(skill.id);
    if (stats) {
      skill.successRate = stats.successRate;
      skill.usageCount = stats.totalUsage;
    }
  }

  return c.json({
    skills,
    count: skills.length,
    hasDatabase: dbStats.length > 0,
  });
});

// GET /api/skills/stats - Get aggregate statistics
skillsRoutes.get('/stats', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  const db = getDatabase(projectRoot);
  if (!db) {
    return c.json({
      initialized: false,
      stats: null,
      message: 'Skills database not initialized',
    });
  }

  try {
    // Get all stats
    const allStats = db.prepare(`
      SELECT
        skill_id as skillId,
        name,
        total_usage as totalUsage,
        success_count as successCount,
        failure_count as failureCount,
        success_rate as successRate,
        last_used as lastUsed
      FROM skill_tracking
    `).all() as SkillStats[];

    // Calculate aggregates
    const totalSkills = allStats.length;
    const totalUsage = allStats.reduce((sum, s) => sum + s.totalUsage, 0);
    const averageSuccessRate = totalSkills > 0
      ? allStats.reduce((sum, s) => sum + s.successRate, 0) / totalSkills
      : 0;

    // Top skills by usage
    const topSkills = [...allStats]
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, 5);

    // Recent skills
    const recentSkills = [...allStats]
      .filter(s => s.lastUsed)
      .sort((a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''))
      .slice(0, 5);

    db.close();

    return c.json({
      initialized: true,
      stats: {
        totalSkills,
        totalUsage,
        averageSuccessRate,
        topSkills,
        recentSkills,
      } as AggregateStats,
    });
  } catch (error) {
    db.close();
    return c.json({ error: 'Failed to get statistics' }, 500);
  }
});

// GET /api/skills/:id - Get skill details
skillsRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const skillId = c.req.param('id');

  const skillsDir = getSkillsDir(projectRoot);
  const filename = `${skillId}.md`;
  const skillPath = join(skillsDir, filename);

  if (!existsSync(skillPath)) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  const content = readFileSync(skillPath, 'utf-8');
  const parsed = parseSkillFile(content, filename);

  if (!parsed) {
    return c.json({ error: 'Invalid skill file' }, 500);
  }

  // Get stats from database
  const db = getDatabase(projectRoot);
  let stats: SkillStats | null = null;

  if (db) {
    try {
      stats = db.prepare(`
        SELECT
          skill_id as skillId,
          name,
          total_usage as totalUsage,
          success_count as successCount,
          failure_count as failureCount,
          success_rate as successRate,
          last_used as lastUsed
        FROM skill_tracking
        WHERE skill_id = ?
      `).get(skillId) as SkillStats | undefined || null;
      db.close();
    } catch {
      db.close();
    }
  }

  return c.json({
    id: parsed.id,
    name: parsed.name,
    tags: parsed.tags || [],
    triggers: parsed.triggers || [],
    content: content,
    stats,
  });
});

// PUT /api/skills/:id - Update skill content
skillsRoutes.put('/:id', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const skillId = c.req.param('id');

  const skillsDir = getSkillsDir(projectRoot);
  const filename = `${skillId}.md`;
  const skillPath = join(skillsDir, filename);

  if (!existsSync(skillPath)) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  try {
    const body = await c.req.json<{ content: string }>();

    if (!body.content || typeof body.content !== 'string') {
      return c.json({ error: 'Content is required' }, 400);
    }

    writeFileSync(skillPath, body.content, 'utf-8');

    return c.json({ success: true, message: 'Skill updated successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to update skill' }, 500);
  }
});

// DELETE /api/skills/:id - Delete a skill
skillsRoutes.delete('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const skillId = c.req.param('id');

  const skillsDir = getSkillsDir(projectRoot);
  const filename = `${skillId}.md`;
  const skillPath = join(skillsDir, filename);

  if (!existsSync(skillPath)) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  try {
    unlinkSync(skillPath);
    return c.json({ success: true, message: 'Skill deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to delete skill' }, 500);
  }
});
