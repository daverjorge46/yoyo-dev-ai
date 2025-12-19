/**
 * Skills API Routes
 *
 * Provides access to skills and usage statistics.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

export const skillsRoutes = new Hono();

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
  return join(projectRoot, '.yoyo-ai', '.skills');
}

function getDatabase(projectRoot: string): Database.Database | null {
  const dbPath = getSkillsDbPath(projectRoot);
  if (!existsSync(dbPath)) {
    return null;
  }
  return new Database(dbPath);
}

function parseSkillFile(content: string): Partial<SkillSummary> | null {
  // Parse YAML frontmatter from markdown
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const result: Partial<SkillSummary> = {};

  // Parse simple YAML
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
        // Parse YAML array: [tag1, tag2]
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

  return result;
}

function getSkillsFromFiles(projectRoot: string): SkillSummary[] {
  const skillsDir = getSkillsDir(projectRoot);
  if (!existsSync(skillsDir)) {
    return [];
  }

  const skills: SkillSummary[] = [];

  try {
    const files = readdirSync(skillsDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md');

    for (const file of files) {
      const content = readFileSync(join(skillsDir, file), 'utf-8');
      const parsed = parseSkillFile(content);
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
  const skillPath = join(skillsDir, `${skillId}.md`);

  if (!existsSync(skillPath)) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  const content = readFileSync(skillPath, 'utf-8');
  const parsed = parseSkillFile(content);

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
