/**
 * Tasks API Routes
 *
 * Provides access to tasks across all specifications.
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Variables } from '../types.js';

export const tasksRoutes = new Hono<{ Variables: Variables }>();

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

type ColumnId = 'backlog' | 'in_progress' | 'review' | 'completed';

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

/**
 * Map Kanban column to task status.
 * - backlog -> pending (unchecked)
 * - in_progress -> pending (unchecked) - visual only in Kanban
 * - review -> pending (unchecked) - visual only in Kanban
 * - completed -> completed (checked)
 */
function columnToStatus(column: ColumnId): 'pending' | 'completed' {
  return column === 'completed' ? 'completed' : 'pending';
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

// PATCH /api/tasks/:specId/:groupId/:taskId/column - Update task column (Kanban)
tasksRoutes.patch('/:specId/:groupId/:taskId/column', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const { specId, groupId, taskId } = c.req.param();

  const body = await c.req.json<{ column: ColumnId }>();

  // Validate column
  const validColumns: ColumnId[] = ['backlog', 'in_progress', 'review', 'completed'];
  if (!body.column || !validColumns.includes(body.column)) {
    return c.json({ error: 'Invalid column. Must be one of: backlog, in_progress, review, completed' }, 400);
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
  let updated = false;

  // Determine the new status based on column
  const newStatus = columnToStatus(body.column);
  const newCheckbox = newStatus === 'completed' ? 'x' : ' ';

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
      const taskMatch = line.match(/^(-\s+\[)([ xX])(\]\s+)(.+)$/);
      if (taskMatch) {
        taskCount++;
        if (taskCount === targetTaskNum) {
          lines[i] = `${taskMatch[1]}${newCheckbox}${taskMatch[3]}${taskMatch[4]}`;
          updated = true;
          break;
        }
      }
    }
  }

  if (!updated) {
    return c.json({ error: 'Task not found' }, 404);
  }

  content = lines.join('\n');
  writeFileSync(tasksPath, content, 'utf-8');

  return c.json({
    success: true,
    specId,
    groupId,
    taskId,
    column: body.column,
    status: newStatus,
  });
});

// PATCH /api/tasks/:specId/:groupId/:taskId - Update task status or title
tasksRoutes.patch('/:specId/:groupId/:taskId', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const { specId, groupId, taskId } = c.req.param();

  const body = await c.req.json<{ status?: 'pending' | 'completed'; title?: string }>();

  const tasksPath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'tasks.md');
  if (!existsSync(tasksPath)) {
    return c.json({ error: 'Tasks not found' }, 404);
  }

  let content = readFileSync(tasksPath, 'utf-8');
  const lines = content.split('\n');
  let inTargetGroup = false;
  let taskCount = 0;
  const targetTaskNum = parseInt(taskId, 10);
  let updated = false;

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
      const taskMatch = line.match(/^(-\s+\[)([ xX])(\]\s+)(.+)$/);
      if (taskMatch) {
        taskCount++;
        if (taskCount === targetTaskNum) {
          let newCheckbox = taskMatch[2];
          let newTitle = taskMatch[4];

          if (body.status) {
            newCheckbox = body.status === 'completed' ? 'x' : ' ';
          }
          if (body.title) {
            newTitle = body.title;
          }

          lines[i] = `${taskMatch[1]}${newCheckbox}${taskMatch[3]}${newTitle}`;
          updated = true;
          break;
        }
      }
    }
  }

  if (!updated) {
    return c.json({ error: 'Task not found' }, 404);
  }

  content = lines.join('\n');
  writeFileSync(tasksPath, content, 'utf-8');

  return c.json({ success: true, specId, groupId, taskId, ...body });
});

// POST /api/tasks/:specId/:groupId/bulk - Bulk update tasks in a group
tasksRoutes.post('/:specId/:groupId/bulk', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const { specId, groupId } = c.req.param();

  const body = await c.req.json<{ action: 'complete_all' | 'reset_all' }>();
  if (!body.action || !['complete_all', 'reset_all'].includes(body.action)) {
    return c.json({ error: 'Invalid action' }, 400);
  }

  const tasksPath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'tasks.md');
  if (!existsSync(tasksPath)) {
    return c.json({ error: 'Tasks not found' }, 404);
  }

  let content = readFileSync(tasksPath, 'utf-8');
  const lines = content.split('\n');
  let inTargetGroup = false;
  let updatedCount = 0;
  const newCheckbox = body.action === 'complete_all' ? 'x' : ' ';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for group header
    const groupMatch = line.match(/^##\s+(\d+)\.\s+/);
    if (groupMatch) {
      inTargetGroup = groupMatch[1] === groupId;
      continue;
    }

    // Update all tasks in group
    if (inTargetGroup) {
      const taskMatch = line.match(/^(-\s+\[)([ xX])(\]\s+.+)$/);
      if (taskMatch) {
        lines[i] = `${taskMatch[1]}${newCheckbox}${taskMatch[3]}`;
        updatedCount++;
      }

      // Also update subtasks
      const subtaskMatch = line.match(/^(\s+-\s+\[)([ xX])(\]\s+.+)$/);
      if (subtaskMatch) {
        lines[i] = `${subtaskMatch[1]}${newCheckbox}${subtaskMatch[3]}`;
      }
    }
  }

  content = lines.join('\n');
  writeFileSync(tasksPath, content, 'utf-8');

  return c.json({ success: true, specId, groupId, action: body.action, updatedCount });
});

// POST /api/tasks/:specId/bulk - Bulk update all tasks in a spec
tasksRoutes.post('/:specId/bulk', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const { specId } = c.req.param();

  const body = await c.req.json<{ action: 'complete_all' | 'reset_all' | 'expand_all' | 'collapse_all' }>();
  if (!body.action) {
    return c.json({ error: 'Invalid action' }, 400);
  }

  // expand_all and collapse_all are client-side only operations
  if (body.action === 'expand_all' || body.action === 'collapse_all') {
    return c.json({ success: true, specId, action: body.action, clientSideOnly: true });
  }

  const tasksPath = join(projectRoot, '.yoyo-dev', 'specs', specId, 'tasks.md');
  if (!existsSync(tasksPath)) {
    return c.json({ error: 'Tasks not found' }, 404);
  }

  let content = readFileSync(tasksPath, 'utf-8');
  const lines = content.split('\n');
  let updatedCount = 0;
  const newCheckbox = body.action === 'complete_all' ? 'x' : ' ';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Update all tasks
    const taskMatch = line.match(/^(-\s+\[)([ xX])(\]\s+.+)$/);
    if (taskMatch) {
      lines[i] = `${taskMatch[1]}${newCheckbox}${taskMatch[3]}`;
      updatedCount++;
    }

    // Also update subtasks
    const subtaskMatch = line.match(/^(\s+-\s+\[)([ xX])(\]\s+.+)$/);
    if (subtaskMatch) {
      lines[i] = `${subtaskMatch[1]}${newCheckbox}${subtaskMatch[3]}`;
    }
  }

  content = lines.join('\n');
  writeFileSync(tasksPath, content, 'utf-8');

  return c.json({ success: true, specId, action: body.action, updatedCount });
});
