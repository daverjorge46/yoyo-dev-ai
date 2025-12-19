/**
 * Status API Routes
 *
 * Provides project and system status information.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
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

function getMemoryStatus(projectRoot: string): MemoryStatus {
  const memoryDbPath = join(projectRoot, '.yoyo-ai', 'memory', 'memory.db');
  const initialized = existsSync(memoryDbPath);

  let blocksCount = 0;
  if (initialized) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(memoryDbPath, { readonly: true });
      const row = db.prepare('SELECT COUNT(*) as count FROM memory_blocks').get() as { count: number };
      blocksCount = row.count;
      db.close();
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
  const skillsDbPath = join(projectRoot, '.yoyo-ai', '.skills', 'skills.db');
  const initialized = existsSync(skillsDbPath);

  let skillsCount = 0;
  if (initialized) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(skillsDbPath, { readonly: true });
      const row = db.prepare('SELECT COUNT(*) as count FROM skill_tracking').get() as { count: number };
      skillsCount = row.count;
      db.close();
    } catch {
      // Ignore
    }
  }

  return {
    initialized,
    skillsCount,
    databasePath: initialized ? skillsDbPath : null,
  };
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/status - Full project status
statusRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();

  const status: ProjectStatus = {
    name: getProjectName(projectRoot),
    path: projectRoot,
    framework: getFrameworkStatus(projectRoot),
    memory: getMemoryStatus(projectRoot),
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
statusRoutes.get('/memory', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  return c.json(getMemoryStatus(projectRoot));
});

// GET /api/status/skills - Skills status only
statusRoutes.get('/skills', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  return c.json(getSkillsStatus(projectRoot));
});
