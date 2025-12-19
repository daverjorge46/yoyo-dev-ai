/**
 * Specifications API Routes
 *
 * Provides access to specification documents and their tasks.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'fs';
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

interface CreateSpecInput {
  name: string;
  overview: string;
  scope?: string;
  deliverables?: string[];
  outOfScope?: string[];
}

interface SpecDetailExtended extends SpecDetail {
  files: string[];
  subSpecs: SubSpec[];
  decisions: string | null;
}

interface SubSpec {
  name: string;
  content: string;
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

function getSubSpecs(specDir: string): SubSpec[] {
  const subSpecsDir = join(specDir, 'sub-specs');
  if (!existsSync(subSpecsDir)) {
    return [];
  }

  try {
    return readdirSync(subSpecsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => ({
        name: f.replace('.md', ''),
        content: readFileSync(join(subSpecsDir, f), 'utf-8'),
      }));
  } catch {
    return [];
  }
}

function getSpecDetailExtended(projectRoot: string, specId: string): SpecDetailExtended | null {
  const specDir = join(projectRoot, '.yoyo-dev', 'specs', specId);
  if (!existsSync(specDir)) {
    return null;
  }

  const basic = getSpecDetail(projectRoot, specId);
  if (!basic) return null;

  // Get list of files
  let files: string[] = [];
  try {
    files = readdirSync(specDir).filter(f => !f.startsWith('.'));
  } catch {
    // Ignore
  }

  // Get sub-specs
  const subSpecs = getSubSpecs(specDir);

  // Get decisions
  let decisions: string | null = null;
  const decisionsPath = join(specDir, 'decisions.md');
  if (existsSync(decisionsPath)) {
    decisions = readFileSync(decisionsPath, 'utf-8');
  }

  return {
    ...basic,
    files,
    subSpecs,
    decisions,
  };
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

// GET /api/specs/:id - Get specification details (extended)
specsRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('id');

  const spec = getSpecDetailExtended(projectRoot, specId);
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

// POST /api/specs - Create new specification
specsRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const input = await c.req.json<CreateSpecInput>();

  if (!input.name || !input.overview) {
    return c.json({ error: 'Name and overview are required' }, 400);
  }

  const specsPath = join(projectRoot, '.yoyo-dev', 'specs');
  if (!existsSync(specsPath)) {
    mkdirSync(specsPath, { recursive: true });
  }

  const date = formatDate(new Date());
  const slug = slugify(input.name);
  const specId = `${date}-${slug}`;
  const specDir = join(specsPath, specId);

  if (existsSync(specDir)) {
    return c.json({ error: 'Specification with this name already exists' }, 409);
  }

  mkdirSync(specDir, { recursive: true });
  mkdirSync(join(specDir, 'sub-specs'), { recursive: true });

  // Create spec.md from template
  const specContent = `# ${input.name}

## Overview
${input.overview}

## Scope
${input.scope || '_To be defined_'}

## Deliverables
${input.deliverables?.map(d => `- ${d}`).join('\n') || '- _To be defined_'}

## Out of Scope
${input.outOfScope?.map(o => `- ${o}`).join('\n') || '- _To be defined_'}

## Technical Requirements
_To be defined_

## Success Criteria
_To be defined_

## Dependencies
_To be defined_
`;

  writeFileSync(join(specDir, 'spec.md'), specContent);

  // Create spec-lite.md (condensed version)
  const specLiteContent = `# ${input.name}

${input.overview}

## Scope
${input.scope || '_To be defined_'}

## Key Deliverables
${input.deliverables?.map(d => `- ${d}`).join('\n') || '- _To be defined_'}
`;

  writeFileSync(join(specDir, 'spec-lite.md'), specLiteContent);

  // Create state.json
  const state: SpecState = {
    specId: specId,
    status: 'draft',
    startedAt: new Date().toISOString(),
  };

  writeFileSync(join(specDir, 'state.json'), JSON.stringify(state, null, 2));

  // Create decisions.md
  const decisionsContent = `# Decisions Log

## ${date}

### Initial Setup
- Created specification: ${input.name}

---
_Add technical decisions and their rationale here_
`;

  writeFileSync(join(specDir, 'decisions.md'), decisionsContent);

  // Create placeholder technical-spec.md in sub-specs
  const technicalSpecContent = `# Technical Specification

## Architecture Overview
_To be defined_

## Data Models
_To be defined_

## API Design
_To be defined_

## Implementation Notes
_To be defined_
`;

  writeFileSync(join(specDir, 'sub-specs', 'technical-spec.md'), technicalSpecContent);

  return c.json({
    id: specId,
    name: slug,
    date,
    path: specDir,
  }, 201);
});

// DELETE /api/specs/:id - Soft delete specification
specsRoutes.delete('/:id', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('id');

  // Require confirmation header for safety
  const confirmName = c.req.header('X-Confirm-Name');
  if (!confirmName) {
    return c.json({ error: 'Confirmation required. Send X-Confirm-Name header with spec name.' }, 400);
  }

  const specDir = join(projectRoot, '.yoyo-dev', 'specs', specId);
  if (!existsSync(specDir)) {
    return c.json({ error: 'Specification not found' }, 404);
  }

  const { name } = parseSpecId(specId);
  if (confirmName !== name && confirmName !== specId) {
    return c.json({ error: 'Confirmation name does not match' }, 400);
  }

  // Create trash directory if needed
  const trashDir = join(projectRoot, '.yoyo-dev', '.trash');
  if (!existsSync(trashDir)) {
    mkdirSync(trashDir, { recursive: true });
  }

  // Move to trash with timestamp
  const timestamp = Date.now();
  const trashPath = join(trashDir, `${specId}-deleted-${timestamp}`);

  try {
    renameSync(specDir, trashPath);
  } catch (err) {
    return c.json({ error: 'Failed to delete specification', details: String(err) }, 500);
  }

  return c.json({
    deleted: true,
    id: specId,
    trashedTo: trashPath,
  });
});

// GET /api/specs/:id/sub-specs - Get all sub-specs
specsRoutes.get('/:id/sub-specs', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('id');

  const specDir = join(projectRoot, '.yoyo-dev', 'specs', specId);
  if (!existsSync(specDir)) {
    return c.json({ error: 'Specification not found' }, 404);
  }

  const subSpecs = getSubSpecs(specDir);
  return c.json({ specId, subSpecs, count: subSpecs.length });
});

// GET /api/specs/:id/decisions - Get decisions log
specsRoutes.get('/:id/decisions', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('id');

  const decisionsPath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'decisions.md');
  if (!existsSync(decisionsPath)) {
    return c.json({ error: 'Decisions not found' }, 404);
  }

  const content = readFileSync(decisionsPath, 'utf-8');
  return c.json({ specId, content });
});
