/**
 * Tasks API Routes
 *
 * Provides access to tasks across all specifications.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const tasksRoutes = new Hono();

// =============================================================================
// Types
// =============================================================================

interface TaskGroup {
  id: string;
  title: string;
  tasks: Task[];
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  subtasks?: string[];
}

interface ParsedTasks {
  specId: string;
  specName: string;
  groups: TaskGroup[];
  totalTasks: number;
  completedTasks: number;
}

// =============================================================================
// Helpers
// =============================================================================

function parseTasksFile(content: string): TaskGroup[] {
  const groups: TaskGroup[] = [];
  let currentGroup: TaskGroup | null = null;
  let currentTask: Task | null = null;

  const lines = content.split('\n');

  for (const line of lines) {
    // Task group header: ## 1. Group Title
    const groupMatch = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (groupMatch) {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        id: groupMatch[1],
        title: groupMatch[2].trim(),
        tasks: [],
        completed: false,
      };
      currentTask = null;
      continue;
    }

    // Task item: - [ ] or - [x]
    const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch && currentGroup) {
      const isCompleted = taskMatch[1].toLowerCase() === 'x';
      currentTask = {
        id: `${currentGroup.id}.${currentGroup.tasks.length + 1}`,
        title: taskMatch[2].trim(),
        status: isCompleted ? 'completed' : 'pending',
        subtasks: [],
      };
      currentGroup.tasks.push(currentTask);
      continue;
    }

    // Subtask: starts with spaces and has checkbox
    const subtaskMatch = line.match(/^\s+-\s+\[([ xX])\]\s+(.+)$/);
    if (subtaskMatch && currentTask) {
      currentTask.subtasks = currentTask.subtasks || [];
      currentTask.subtasks.push(subtaskMatch[2].trim());
      continue;
    }
  }

  // Don't forget the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  // Mark groups as completed if all tasks are completed
  for (const group of groups) {
    group.completed = group.tasks.length > 0 &&
      group.tasks.every(t => t.status === 'completed');
  }

  return groups;
}

function getAllTasks(projectRoot: string): ParsedTasks[] {
  const specsPath = join(projectRoot, '.yoyo-dev', 'specs');
  if (!existsSync(specsPath)) {
    return [];
  }

  const allTasks: ParsedTasks[] = [];

  try {
    const dirs = readdirSync(specsPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse();

    for (const dirName of dirs) {
      const tasksPath = join(specsPath, dirName, 'tasks.md');
      if (!existsSync(tasksPath)) {
        continue;
      }

      const content = readFileSync(tasksPath, 'utf-8');
      const groups = parseTasksFile(content);

      // Extract spec name from dir
      const nameMatch = dirName.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
      const specName = nameMatch ? nameMatch[1] : dirName;

      let totalTasks = 0;
      let completedTasks = 0;

      for (const group of groups) {
        totalTasks += group.tasks.length;
        completedTasks += group.tasks.filter(t => t.status === 'completed').length;
      }

      allTasks.push({
        specId: dirName,
        specName,
        groups,
        totalTasks,
        completedTasks,
      });
    }
  } catch {
    // Ignore
  }

  return allTasks;
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/tasks - List all tasks across specs
tasksRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const allTasks = getAllTasks(projectRoot);

  const totalSpecs = allTasks.length;
  const totalTasks = allTasks.reduce((sum, t) => sum + t.totalTasks, 0);
  const completedTasks = allTasks.reduce((sum, t) => sum + t.completedTasks, 0);

  return c.json({
    specs: allTasks,
    summary: {
      totalSpecs,
      totalTasks,
      completedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
  });
});

// GET /api/tasks/:specId - Get tasks for a specific spec
tasksRoutes.get('/:specId', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const specId = c.req.param('specId');

  const tasksPath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'tasks.md');
  if (!existsSync(tasksPath)) {
    return c.json({ error: 'Tasks not found' }, 404);
  }

  const content = readFileSync(tasksPath, 'utf-8');
  const groups = parseTasksFile(content);

  let totalTasks = 0;
  let completedTasks = 0;

  for (const group of groups) {
    totalTasks += group.tasks.length;
    completedTasks += group.tasks.filter(t => t.status === 'completed').length;
  }

  return c.json({
    specId,
    groups,
    totalTasks,
    completedTasks,
    progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  });
});

// PATCH /api/tasks/:specId/:groupId/:taskId - Update task status
tasksRoutes.patch('/:specId/:groupId/:taskId', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const { specId, groupId, taskId } = c.req.param();

  const body = await c.req.json<{ status: 'pending' | 'completed' }>();
  if (!body.status || !['pending', 'completed'].includes(body.status)) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const tasksPath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'tasks.md');
  if (!existsSync(tasksPath)) {
    return c.json({ error: 'Tasks not found' }, 404);
  }

  let content = readFileSync(tasksPath, 'utf-8');
  const lines = content.split('\n');
  let inTargetGroup = false;
  let taskCount = 0;
  const targetTaskNum = parseInt(taskId, 10);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for group header
    const groupMatch = line.match(/^##\s+(\d+)\.\s+/);
    if (groupMatch) {
      inTargetGroup = groupMatch[1] === groupId;
      taskCount = 0;
      continue;
    }

    // Check for task
    if (inTargetGroup) {
      const taskMatch = line.match(/^(-\s+\[)([ xX])(\]\s+.+)$/);
      if (taskMatch) {
        taskCount++;
        if (taskCount === targetTaskNum) {
          const newCheckbox = body.status === 'completed' ? 'x' : ' ';
          lines[i] = `${taskMatch[1]}${newCheckbox}${taskMatch[3]}`;
          break;
        }
      }
    }
  }

  content = lines.join('\n');
  writeFileSync(tasksPath, content, 'utf-8');

  return c.json({ success: true, specId, groupId, taskId, status: body.status });
});
