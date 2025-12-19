/**
 * Fixes API Routes
 *
 * Provides access to fix documents and CRUD operations.
 * Supports soft delete to .trash/ directory.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import type { Variables } from '../types.js';

export const fixesRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface FixSummary {
  id: string;
  name: string;
  date: string;
  path: string;
  hasAnalysis: boolean;
  hasSolution: boolean;
  hasTasks: boolean;
  hasState: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'unknown';
}

interface FixDetail {
  id: string;
  name: string;
  date: string;
  path: string;
  analysis: string | null;
  solutionLite: string | null;
  tasks: string | null;
  state: FixState | null;
  files: string[];
}

interface FixState {
  fixName: string;
  status: string;
  currentTask?: string;
  completedTasks?: string[];
  startedAt?: string;
  updatedAt?: string;
}

interface CreateFixInput {
  name: string;
  problemSummary: string;
  rootCause?: string;
  affectedFiles?: string[];
}

// =============================================================================
// Helpers
// =============================================================================

function parseFixId(dirName: string): { date: string; name: string } {
  // Format: YYYY-MM-DD-fix-name
  const match = dirName.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (match) {
    return { date: match[1], name: match[2] };
  }
  return { date: '', name: dirName };
}

function getFixStatus(state: FixState | null): FixSummary['status'] {
  if (!state) return 'unknown';
  const status = state.status?.toLowerCase() || '';
  if (status.includes('complete')) return 'completed';
  if (status.includes('progress')) return 'in_progress';
  return 'pending';
}

function getFixSummaries(projectRoot: string): FixSummary[] {
  const fixesPath = join(projectRoot, '.yoyo-dev', 'fixes');
  if (!existsSync(fixesPath)) {
    return [];
  }

  const fixes: FixSummary[] = [];

  try {
    const dirs = readdirSync(fixesPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse(); // Most recent first

    for (const dirName of dirs) {
      const fixDir = join(fixesPath, dirName);
      const { date, name } = parseFixId(dirName);

      // Read state if available
      let state: FixState | null = null;
      const statePath = join(fixDir, 'state.json');
      if (existsSync(statePath)) {
        try {
          state = JSON.parse(readFileSync(statePath, 'utf-8'));
        } catch {
          // Ignore
        }
      }

      fixes.push({
        id: dirName,
        name,
        date,
        path: fixDir,
        hasAnalysis: existsSync(join(fixDir, 'analysis.md')),
        hasSolution: existsSync(join(fixDir, 'solution-lite.md')),
        hasTasks: existsSync(join(fixDir, 'tasks.md')),
        hasState: !!state,
        status: getFixStatus(state),
      });
    }
  } catch {
    // Ignore
  }

  return fixes;
}

function getFixDetail(projectRoot: string, fixId: string): FixDetail | null {
  const fixDir = join(projectRoot, '.yoyo-dev', 'fixes', fixId);
  if (!existsSync(fixDir)) {
    return null;
  }

  const { date, name } = parseFixId(fixId);

  // Read files
  let analysis: string | null = null;
  let solutionLite: string | null = null;
  let tasks: string | null = null;
  let state: FixState | null = null;

  const analysisPath = join(fixDir, 'analysis.md');
  if (existsSync(analysisPath)) {
    analysis = readFileSync(analysisPath, 'utf-8');
  }

  const solutionPath = join(fixDir, 'solution-lite.md');
  if (existsSync(solutionPath)) {
    solutionLite = readFileSync(solutionPath, 'utf-8');
  }

  const tasksPath = join(fixDir, 'tasks.md');
  if (existsSync(tasksPath)) {
    tasks = readFileSync(tasksPath, 'utf-8');
  }

  const statePath = join(fixDir, 'state.json');
  if (existsSync(statePath)) {
    try {
      state = JSON.parse(readFileSync(statePath, 'utf-8'));
    } catch {
      // Ignore
    }
  }

  // Get list of files in directory
  let files: string[] = [];
  try {
    files = readdirSync(fixDir).filter(f => !f.startsWith('.'));
  } catch {
    // Ignore
  }

  return {
    id: fixId,
    name,
    date,
    path: fixDir,
    analysis,
    solutionLite,
    tasks,
    state,
    files,
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/fixes - List all fixes
fixesRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const fixes = getFixSummaries(projectRoot);
  return c.json({ fixes, count: fixes.length });
});

// GET /api/fixes/:id - Get fix details
fixesRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const fixId = c.req.param('id');

  const fix = getFixDetail(projectRoot, fixId);
  if (!fix) {
    return c.json({ error: 'Fix not found' }, 404);
  }

  return c.json(fix);
});

// POST /api/fixes - Create new fix
fixesRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const input = await c.req.json<CreateFixInput>();

  if (!input.name || !input.problemSummary) {
    return c.json({ error: 'Name and problem summary are required' }, 400);
  }

  const fixesPath = join(projectRoot, '.yoyo-dev', 'fixes');
  if (!existsSync(fixesPath)) {
    mkdirSync(fixesPath, { recursive: true });
  }

  const date = formatDate(new Date());
  const slug = slugify(input.name);
  const fixId = `${date}-${slug}`;
  const fixDir = join(fixesPath, fixId);

  if (existsSync(fixDir)) {
    return c.json({ error: 'Fix with this name already exists' }, 409);
  }

  mkdirSync(fixDir, { recursive: true });

  // Create analysis.md
  const analysisContent = `# ${input.name}

## Problem Summary
${input.problemSummary}

## Root Cause Analysis
${input.rootCause || '_To be determined_'}

## Affected Files
${input.affectedFiles?.map(f => `- \`${f}\``).join('\n') || '_To be determined_'}

## Solution Approach
_To be determined_

## Testing Plan
_To be determined_
`;

  writeFileSync(join(fixDir, 'analysis.md'), analysisContent);

  // Create state.json
  const state: FixState = {
    fixName: input.name,
    status: 'pending',
    startedAt: new Date().toISOString(),
  };

  writeFileSync(join(fixDir, 'state.json'), JSON.stringify(state, null, 2));

  return c.json({
    id: fixId,
    name: slug,
    date,
    path: fixDir,
  }, 201);
});

// DELETE /api/fixes/:id - Soft delete fix (move to .trash/)
fixesRoutes.delete('/:id', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const fixId = c.req.param('id');

  // Require confirmation header for safety
  const confirmName = c.req.header('X-Confirm-Name');
  if (!confirmName) {
    return c.json({ error: 'Confirmation required. Send X-Confirm-Name header with fix name.' }, 400);
  }

  const fixDir = join(projectRoot, '.yoyo-dev', 'fixes', fixId);
  if (!existsSync(fixDir)) {
    return c.json({ error: 'Fix not found' }, 404);
  }

  const { name } = parseFixId(fixId);
  if (confirmName !== name && confirmName !== fixId) {
    return c.json({ error: 'Confirmation name does not match' }, 400);
  }

  // Create trash directory if needed
  const trashDir = join(projectRoot, '.yoyo-dev', '.trash');
  if (!existsSync(trashDir)) {
    mkdirSync(trashDir, { recursive: true });
  }

  // Move to trash with timestamp
  const timestamp = Date.now();
  const trashPath = join(trashDir, `${fixId}-deleted-${timestamp}`);

  try {
    renameSync(fixDir, trashPath);
  } catch (err) {
    return c.json({ error: 'Failed to delete fix', details: String(err) }, 500);
  }

  return c.json({
    deleted: true,
    id: fixId,
    trashedTo: trashPath,
  });
});

// GET /api/fixes/:id/analysis - Get analysis content
fixesRoutes.get('/:id/analysis', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const fixId = c.req.param('id');

  const analysisPath = join(projectRoot, '.yoyo-dev', 'fixes', fixId, 'analysis.md');
  if (!existsSync(analysisPath)) {
    return c.json({ error: 'Analysis not found' }, 404);
  }

  const content = readFileSync(analysisPath, 'utf-8');
  return c.json({ fixId, content });
});

// GET /api/fixes/:id/tasks - Get tasks content
fixesRoutes.get('/:id/tasks', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const fixId = c.req.param('id');

  const tasksPath = join(projectRoot, '.yoyo-dev', 'fixes', fixId, 'tasks.md');
  if (!existsSync(tasksPath)) {
    return c.json({ error: 'Tasks not found' }, 404);
  }

  const content = readFileSync(tasksPath, 'utf-8');
  return c.json({ fixId, content });
});

// GET /api/fixes/:id/state - Get state
fixesRoutes.get('/:id/state', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const fixId = c.req.param('id');

  const statePath = join(projectRoot, '.yoyo-dev', 'fixes', fixId, 'state.json');
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
