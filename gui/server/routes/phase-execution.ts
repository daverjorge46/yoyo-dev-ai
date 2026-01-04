/**
 * Phase Execution API Routes
 *
 * Provides REST endpoints for controlling Ralph phase execution.
 * Routes are mounted at /api/roadmap/ alongside other roadmap routes.
 */

import { Hono } from 'hono';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { Variables } from '../types.js';
import { getPhaseExecutionService } from '../services/phase-execution.js';

export const phaseExecutionRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface ExecuteRequestBody {
  selectedSpecs?: string[];
  options?: {
    continueOnError?: boolean;
    dryRun?: boolean;
  };
}

interface StopRequestBody {
  reason?: string;
}

interface RoadmapPhase {
  id: string;
  number: number;
  title: string;
  goal: string;
  sections: Array<{
    title: string;
    items: Array<{
      title: string;
      completed: boolean;
    }>;
  }>;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse roadmap.md to extract phase info
 */
function parsePhaseFromRoadmap(content: string, phaseId: string): RoadmapPhase | null {
  const lines = content.split('\n');
  const phaseNum = parseInt(phaseId.replace('phase-', ''));

  let currentPhase: RoadmapPhase | null = null;
  let currentSection: { title: string; items: Array<{ title: string; completed: boolean }> } | null = null;
  let inTargetPhase = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Phase heading
    const phaseMatch = trimmed.match(/^## Phase (\d+): (.+)$/);
    if (phaseMatch) {
      if (inTargetPhase && currentPhase) {
        return currentPhase;
      }

      if (parseInt(phaseMatch[1]) === phaseNum) {
        inTargetPhase = true;
        currentPhase = {
          id: phaseId,
          number: phaseNum,
          title: phaseMatch[2],
          goal: '',
          sections: [],
        };
      } else {
        inTargetPhase = false;
      }
      continue;
    }

    if (!inTargetPhase || !currentPhase) continue;

    // Goal line
    if (trimmed.startsWith('**Goal**:')) {
      currentPhase.goal = trimmed.replace('**Goal**:', '').trim();
      continue;
    }

    // Section heading
    if (trimmed.startsWith('### ')) {
      currentSection = { title: trimmed.slice(4), items: [] };
      currentPhase.sections.push(currentSection);
      continue;
    }

    // Item line
    const itemMatch = trimmed.match(/^\d+\.\s+\[([ x])\]\s+\*\*(.+?)\*\*/);
    if (itemMatch && currentSection) {
      currentSection.items.push({
        title: itemMatch[2],
        completed: itemMatch[1] === 'x',
      });
      continue;
    }

    // Simple item
    const simpleMatch = trimmed.match(/^\d+\.\s+\[([ x])\]\s+(.+?)(?:\s*[-—]|`|$)/);
    if (simpleMatch && currentSection) {
      currentSection.items.push({
        title: simpleMatch[2].trim(),
        completed: simpleMatch[1] === 'x',
      });
    }
  }

  return currentPhase;
}

/**
 * Find specs that match roadmap items
 */
function findSpecsForPhaseItems(
  projectRoot: string,
  items: Array<{ title: string }>
): Array<{ title: string; specExists: boolean; specPath: string | null; hasTasks: boolean }> {
  const specsDir = join(projectRoot, '.yoyo-dev', 'specs');
  let specDirs: string[] = [];

  if (existsSync(specsDir)) {
    try {
      specDirs = readdirSync(specsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch {
      // Ignore read errors
    }
  }

  return items.map(item => {
    const titleLower = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Find matching spec
    const matchingSpec = specDirs.find(specDir => {
      const specName = specDir.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      return specName === titleLower || specName.includes(titleLower) || titleLower.includes(specName);
    });

    if (matchingSpec) {
      const specPath = join('.yoyo-dev', 'specs', matchingSpec);
      const tasksPath = join(projectRoot, specPath, 'tasks.md');
      return {
        title: item.title,
        specExists: true,
        specPath,
        hasTasks: existsSync(tasksPath),
      };
    }

    return {
      title: item.title,
      specExists: false,
      specPath: null,
      hasTasks: false,
    };
  });
}

// =============================================================================
// Routes
// =============================================================================

// POST /api/roadmap/phases/:phaseId/execute - Start phase execution
phaseExecutionRoutes.post('/phases/:phaseId/execute', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const phaseId = c.req.param('phaseId');
  const service = getPhaseExecutionService(projectRoot);

  // Parse request body
  let body: ExecuteRequestBody = {};
  try {
    body = await c.req.json();
  } catch {
    // Empty body is valid
  }

  // Read roadmap to get phase info
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');
  if (!existsSync(roadmapPath)) {
    return c.json({ error: 'Roadmap not found' }, 404);
  }

  const roadmapContent = readFileSync(roadmapPath, 'utf-8');
  const phase = parsePhaseFromRoadmap(roadmapContent, phaseId);

  if (!phase) {
    return c.json({ error: 'Phase not found' }, 404);
  }

  // Get all items from phase
  const allItems = phase.sections.flatMap(s => s.items);

  // Find spec info for items
  const itemsWithSpecs = findSpecsForPhaseItems(projectRoot, allItems);

  try {
    const result = await service.startExecution({
      phaseId,
      phaseTitle: phase.title,
      phaseGoal: phase.goal,
      items: itemsWithSpecs,
      selectedSpecs: body.selectedSpecs,
      options: body.options,
    });

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('already in progress')) {
      return c.json({ error: message }, 409);
    }
    if (message.includes('not found')) {
      return c.json({ error: message }, 404);
    }

    return c.json({ error: message }, 500);
  }
});

// POST /api/roadmap/execution/pause - Pause execution
phaseExecutionRoutes.post('/execution/pause', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const service = getPhaseExecutionService(projectRoot);

  try {
    const result = await service.pause();
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

// POST /api/roadmap/execution/resume - Resume execution
phaseExecutionRoutes.post('/execution/resume', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const service = getPhaseExecutionService(projectRoot);

  try {
    const result = await service.resume();
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

// POST /api/roadmap/execution/stop - Stop execution
phaseExecutionRoutes.post('/execution/stop', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const service = getPhaseExecutionService(projectRoot);

  let body: StopRequestBody = {};
  try {
    body = await c.req.json();
  } catch {
    // Empty body is valid
  }

  try {
    const result = await service.stop(body.reason);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

// GET /api/roadmap/execution/status - Get execution status
phaseExecutionRoutes.get('/execution/status', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const service = getPhaseExecutionService(projectRoot);

  const status = service.getStatus();
  return c.json(status);
});

// GET /api/roadmap/execution/logs - Get execution logs
phaseExecutionRoutes.get('/execution/logs', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const service = getPhaseExecutionService(projectRoot);

  // Parse query params
  const limitStr = c.req.query('limit');
  const offsetStr = c.req.query('offset');
  const level = c.req.query('level') as 'info' | 'warn' | 'error' | 'debug' | undefined;

  const options: { limit?: number; offset?: number; level?: 'info' | 'warn' | 'error' | 'debug' } = {};

  if (limitStr) options.limit = parseInt(limitStr, 10);
  if (offsetStr) options.offset = parseInt(offsetStr, 10);
  if (level) options.level = level;

  const logs = service.getLogs(options);
  const total = service.getLogs().length;

  return c.json({
    logs,
    total,
    hasMore: (options.offset || 0) + logs.length < total,
  });
});

// GET /api/roadmap/phases/:phaseId/execution-preview - Preview what would be executed
phaseExecutionRoutes.get('/phases/:phaseId/execution-preview', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const phaseId = c.req.param('phaseId');

  // Read roadmap
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');
  if (!existsSync(roadmapPath)) {
    return c.json({ error: 'Roadmap not found' }, 404);
  }

  const roadmapContent = readFileSync(roadmapPath, 'utf-8');
  const phase = parsePhaseFromRoadmap(roadmapContent, phaseId);

  if (!phase) {
    return c.json({ error: 'Phase not found' }, 404);
  }

  // Get all items and their spec status
  const allItems = phase.sections.flatMap(s => s.items);
  const itemsWithSpecs = findSpecsForPhaseItems(projectRoot, allItems);

  // Count tasks for existing specs
  const items = itemsWithSpecs.map(item => {
    let taskCount = 0;
    let completedTasks = 0;

    if (item.specExists && item.specPath) {
      const tasksPath = join(projectRoot, item.specPath, 'tasks.md');
      if (existsSync(tasksPath)) {
        const tasksContent = readFileSync(tasksPath, 'utf-8');
        const taskMatches = tasksContent.match(/- \[[ x]\]/g) || [];
        taskCount = taskMatches.length;
        completedTasks = (tasksContent.match(/- \[x\]/g) || []).length;
      }
    }

    return {
      title: item.title,
      specExists: item.specExists,
      specPath: item.specPath,
      tasksExist: item.hasTasks,
      taskCount,
      completedTasks,
      willCreate: !item.specExists ? ['spec', 'tasks'] : !item.hasTasks ? ['tasks'] : [],
    };
  });

  // Estimate steps (each item without spec = 2 steps, each item without tasks = 1 step, each task = 1 step)
  const estimatedSteps = items.reduce((sum, item) => {
    let steps = 0;
    if (!item.specExists) steps += 2; // create spec + tasks
    else if (!item.tasksExist) steps += 1; // create tasks
    steps += item.taskCount || 5; // execute tasks (estimate 5 if unknown)
    return sum + steps;
  }, 0);

  return c.json({
    phaseId,
    phaseTitle: phase.title,
    phaseGoal: phase.goal,
    items,
    estimatedSteps,
    estimatedDuration: `${Math.ceil(estimatedSteps / 10)}-${Math.ceil(estimatedSteps / 5)} hours (approximate)`,
  });
});
