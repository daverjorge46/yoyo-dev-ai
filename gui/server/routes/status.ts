/**
 * Status API Routes
 *
 * Provides project and system status information.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { openDatabase, queryOne } from '../lib/database.js';
import type { Variables } from '../types.js';

export const statusRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface ProjectStatus {
  name: string;
  path: string;
  framework: FrameworkStatus;
  memory: MemoryStatus;
  skills: SkillsStatus;
}

interface FrameworkStatus {
  installed: boolean;
  hasProduct: boolean;
  specsCount: number;
  fixesCount: number;
}

interface MemoryStatus {
  initialized: boolean;
  blocksCount: number;
  databasePath: string | null;
}

interface SkillsStatus {
  initialized: boolean;
  skillsCount: number;
  databasePath: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

function getProjectName(projectRoot: string): string {
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.name || projectRoot.split('/').pop() || 'Unknown';
    } catch {
      // Fall through
    }
  }
  return projectRoot.split('/').pop() || 'Unknown';
}

function getFrameworkStatus(projectRoot: string): FrameworkStatus {
  const yoyoDevPath = join(projectRoot, '.yoyo-dev');
  const installed = existsSync(yoyoDevPath);

  let hasProduct = false;
  let specsCount = 0;
  let fixesCount = 0;

  if (installed) {
    hasProduct = existsSync(join(yoyoDevPath, 'product', 'mission.md'));

    const specsPath = join(yoyoDevPath, 'specs');
    if (existsSync(specsPath)) {
      try {
        specsCount = readdirSync(specsPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .length;
      } catch {
        // Ignore
      }
    }

    const fixesPath = join(yoyoDevPath, 'fixes');
    if (existsSync(fixesPath)) {
      try {
        fixesCount = readdirSync(fixesPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .length;
      } catch {
        // Ignore
      }
    }
  }

  return { installed, hasProduct, specsCount, fixesCount };
}

async function getMemoryStatus(projectRoot: string): Promise<MemoryStatus> {
  const memoryDbPath = join(projectRoot, '.yoyo-dev', 'memory', 'memory.db');
  const initialized = existsSync(memoryDbPath);

  let blocksCount = 0;
  if (initialized) {
    try {
      const db = await openDatabase(memoryDbPath);
      if (db) {
        const row = queryOne<{ count: number }>(db, 'SELECT COUNT(*) as count FROM memory_blocks');
        blocksCount = row?.count || 0;
        db.close();
      }
    } catch {
      // Ignore
    }
  }

  return {
    initialized,
    blocksCount,
    databasePath: initialized ? memoryDbPath : null,
  };
}

function getSkillsStatus(projectRoot: string): SkillsStatus {
  // Skills are stored as markdown files in .claude/skills/ directory
  const skillsDir = join(projectRoot, '.claude', 'skills');
  const hasSkillsDir = existsSync(skillsDir);

  let skillsCount = 0;
  if (hasSkillsDir) {
    try {
      const files = readdirSync(skillsDir)
        .filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('optimization-report'));
      skillsCount = files.length;
    } catch {
      // Ignore
    }
  }

  // initialized = true if we have at least one skill file
  const initialized = skillsCount > 0;

  return {
    initialized,
    skillsCount,
    databasePath: null, // No database, skills are markdown files
  };
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/status - Full project status
statusRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  const status: ProjectStatus = {
    name: getProjectName(projectRoot),
    path: projectRoot,
    framework: getFrameworkStatus(projectRoot),
    memory: await getMemoryStatus(projectRoot),
    skills: getSkillsStatus(projectRoot),
  };

  return c.json(status);
});

// GET /api/status/framework - Framework status only
statusRoutes.get('/framework', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  return c.json(getFrameworkStatus(projectRoot));
});

// GET /api/status/memory - Memory status only
statusRoutes.get('/memory', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  return c.json(await getMemoryStatus(projectRoot));
});

// GET /api/status/skills - Skills status only
statusRoutes.get('/skills', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  return c.json(getSkillsStatus(projectRoot));
});
