/**
 * Specifications API Routes
 *
 * Provides access to specification documents and their tasks.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export const specsRoutes = new Hono();

// =============================================================================
// Types
// =============================================================================

interface SpecSummary {
  id: string;
  name: string;
  date: string;
  path: string;
  hasSpec: boolean;
  hasTasks: boolean;
  hasState: boolean;
}

interface SpecDetail {
  id: string;
  name: string;
  date: string;
  path: string;
  spec: string | null;
  specLite: string | null;
  tasks: string | null;
  state: SpecState | null;
}

interface SpecState {
  specId: string;
  status: string;
  currentTask?: string;
  completedTasks?: string[];
  startedAt?: string;
  updatedAt?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function parseSpecId(dirName: string): { date: string; name: string } {
  // Format: YYYY-MM-DD-spec-name
  const match = dirName.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (match) {
    return { date: match[1], name: match[2] };
  }
  return { date: '', name: dirName };
}

function getSpecSummaries(projectRoot: string): SpecSummary[] {
  const specsPath = join(projectRoot, '.yoyo-dev', 'specs');
  if (!existsSync(specsPath)) {
    return [];
  }

  const specs: SpecSummary[] = [];

  try {
    const dirs = readdirSync(specsPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse(); // Most recent first

    for (const dirName of dirs) {
      const specDir = join(specsPath, dirName);
      const { date, name } = parseSpecId(dirName);

      specs.push({
        id: dirName,
        name,
        date,
        path: specDir,
        hasSpec: existsSync(join(specDir, 'spec.md')),
        hasTasks: existsSync(join(specDir, 'tasks.md')),
        hasState: existsSync(join(specDir, 'state.json')),
      });
    }
  } catch {
    // Ignore
  }

  return specs;
}

function getSpecDetail(projectRoot: string, specId: string): SpecDetail | null {
  const specDir = join(projectRoot, '.yoyo-dev', 'specs', specId);
  if (!existsSync(specDir)) {
    return null;
  }

  const { date, name } = parseSpecId(specId);

  // Read files
  let spec: string | null = null;
  let specLite: string | null = null;
  let tasks: string | null = null;
  let state: SpecState | null = null;

  const specPath = join(specDir, 'spec.md');
  if (existsSync(specPath)) {
    spec = readFileSync(specPath, 'utf-8');
  }

  const specLitePath = join(specDir, 'spec-lite.md');
  if (existsSync(specLitePath)) {
    specLite = readFileSync(specLitePath, 'utf-8');
  }

  const tasksPath = join(specDir, 'tasks.md');
  if (existsSync(tasksPath)) {
    tasks = readFileSync(tasksPath, 'utf-8');
  }

  const statePath = join(specDir, 'state.json');
  if (existsSync(statePath)) {
    try {
      state = JSON.parse(readFileSync(statePath, 'utf-8'));
    } catch {
      // Ignore
    }
  }

  return {
    id: specId,
    name,
    date,
    path: specDir,
    spec,
    specLite,
    tasks,
    state,
  };
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/specs - List all specifications
specsRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specs = getSpecSummaries(projectRoot);
  return c.json({ specs, count: specs.length });
});

// GET /api/specs/:id - Get specification details
specsRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('id');

  const spec = getSpecDetail(projectRoot, specId);
  if (!spec) {
    return c.json({ error: 'Specification not found' }, 404);
  }

  return c.json(spec);
});

// GET /api/specs/:id/tasks - Get tasks content for a spec
specsRoutes.get('/:id/tasks', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('id');

  const tasksPath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'tasks.md');
  if (!existsSync(tasksPath)) {
    return c.json({ error: 'Tasks not found' }, 404);
  }

  const content = readFileSync(tasksPath, 'utf-8');
  return c.json({ specId, content });
});

// GET /api/specs/:id/state - Get state for a spec
specsRoutes.get('/:id/state', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('id');

  const statePath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'state.json');
  if (!existsSync(statePath)) {
    return c.json({ error: 'State not found' }, 404);
  }

  try {
    const state = JSON.parse(readFileSync(statePath, 'utf-8'));
    return c.json(state);
  } catch {
    return c.json({ error: 'Invalid state file' }, 500);
  }
});
