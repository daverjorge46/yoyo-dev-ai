/**
 * Execution Progress API Routes
 *
 * Provides current task execution progress by reading state.json and tasks.md
 */

import { Hono } from 'hono';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Variables } from '../types.js';

const executionRoutes = new Hono<{ Variables: Variables }>();

interface ParsedTask {
  id: string;
  title: string;
  subtasks: string[];
}

interface ExecutionProgress {
  isRunning: boolean;
  specOrFixName: string | null;
  type: 'spec' | 'fix' | null;
  currentPhase: string | null;
  currentParentTask: string | null;
  currentSubtask: string | null;
  totalParentTasks: number;
  completedParentTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  percentage: number;
  currentAction: string | null;
  startedAt: string | null;
  lastUpdated: string | null;
}

/**
 * Parse tasks.md to extract task structure
 */
function parseTasksMd(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const lines = content.split('\n');

  let currentTask: ParsedTask | null = null;

  for (const line of lines) {
    // Match parent task: "- [ ] 1. **Title**" or "- [x] 1. **Title**"
    const parentMatch = line.match(/^- \[[ x]\] (\d+)\.\s+\*\*(.+?)\*\*/);
    if (parentMatch) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      currentTask = {
        id: parentMatch[1],
        title: parentMatch[2],
        subtasks: [],
      };
      continue;
    }

    // Match subtask: "  - [ ] 1.1 Description" or "  - [x] 1.1 Description"
    const subtaskMatch = line.match(/^\s+- \[[ x]\] (\d+\.\d+)\s+(.+)/);
    if (subtaskMatch && currentTask) {
      currentTask.subtasks.push(`${subtaskMatch[1]} ${subtaskMatch[2]}`);
    }
  }

  // Don't forget the last task
  if (currentTask) {
    tasks.push(currentTask);
  }

  return tasks;
}

/**
 * Find the current task based on completed tasks
 */
function findCurrentTask(
  tasks: ParsedTask[],
  completedTaskIds: string[]
): { task: ParsedTask | null; index: number } {
  for (let i = 0; i < tasks.length; i++) {
    if (!completedTaskIds.includes(tasks[i].id)) {
      return { task: tasks[i], index: i };
    }
  }
  return { task: null, index: -1 };
}

/**
 * Find the most recently modified spec or fix folder
 */
async function findActiveWork(
  projectRoot: string
): Promise<{
  folder: string;
  type: 'spec' | 'fix';
  stateFile: string;
  tasksFile: string;
  state: Record<string, unknown>;
} | null> {
  const specsDir = join(projectRoot, '.yoyo-dev', 'specs');
  const fixesDir = join(projectRoot, '.yoyo-dev', 'fixes');

  const candidates: Array<{
    folder: string;
    type: 'spec' | 'fix';
    stateFile: string;
    tasksFile: string;
    mtime: number;
  }> = [];

  // Check specs
  if (existsSync(specsDir)) {
    try {
      const folders = await readdir(specsDir);
      for (const folder of folders) {
        const stateFile = join(specsDir, folder, 'state.json');
        const tasksFile = join(specsDir, folder, 'tasks.md');
        if (existsSync(stateFile)) {
          try {
            const statInfo = await stat(stateFile);
            candidates.push({
              folder,
              type: 'spec',
              stateFile,
              tasksFile,
              mtime: statInfo.mtimeMs,
            });
          } catch {
            // Skip if can't stat
          }
        }
      }
    } catch {
      // Skip if can't read directory
    }
  }

  // Check fixes
  if (existsSync(fixesDir)) {
    try {
      const folders = await readdir(fixesDir);
      for (const folder of folders) {
        const stateFile = join(fixesDir, folder, 'state.json');
        const tasksFile = join(fixesDir, folder, 'tasks.md');
        if (existsSync(stateFile)) {
          try {
            const statInfo = await stat(stateFile);
            candidates.push({
              folder,
              type: 'fix',
              stateFile,
              tasksFile,
              mtime: statInfo.mtimeMs,
            });
          } catch {
            // Skip if can't stat
          }
        }
      }
    } catch {
      // Skip if can't read directory
    }
  }

  // Sort by modification time (newest first)
  candidates.sort((a, b) => b.mtime - a.mtime);

  // Find first active (not completed) work
  for (const candidate of candidates) {
    try {
      const stateContent = await readFile(candidate.stateFile, 'utf-8');
      const state = JSON.parse(stateContent);

      // Check if execution is in progress (started but not completed)
      const isActive =
        state.execution_started &&
        !state.execution_completed &&
        (state.current_phase === 'executing' ||
          state.current_phase === 'implementation' ||
          state.current_phase === 'in_progress');

      if (isActive) {
        return {
          folder: candidate.folder,
          type: candidate.type,
          stateFile: candidate.stateFile,
          tasksFile: candidate.tasksFile,
          state,
        };
      }
    } catch {
      // Skip if can't parse state
    }
  }

  // If no active work, return the most recent one for display
  if (candidates.length > 0) {
    try {
      const candidate = candidates[0];
      const stateContent = await readFile(candidate.stateFile, 'utf-8');
      const state = JSON.parse(stateContent);
      return {
        folder: candidate.folder,
        type: candidate.type,
        stateFile: candidate.stateFile,
        tasksFile: candidate.tasksFile,
        state,
      };
    } catch {
      // Skip
    }
  }

  return null;
}

/**
 * GET /api/execution - Get current execution progress
 */
executionRoutes.get('/', async (c) => {
  const projectRoot = (c.get('projectRoot') as string) || process.cwd();

  const progress: ExecutionProgress = {
    isRunning: false,
    specOrFixName: null,
    type: null,
    currentPhase: null,
    currentParentTask: null,
    currentSubtask: null,
    totalParentTasks: 0,
    completedParentTasks: 0,
    totalSubtasks: 0,
    completedSubtasks: 0,
    percentage: 0,
    currentAction: null,
    startedAt: null,
    lastUpdated: null,
  };

  // First try cache file (for backward compatibility)
  const progressFile = join(projectRoot, '.yoyo-dev', '.cache', 'execution-progress.json');

  if (existsSync(progressFile)) {
    try {
      const content = await readFile(progressFile, 'utf-8');
      const data = JSON.parse(content);

      // Only use cache if it's recent (within last 5 minutes) and running
      const lastUpdated = data.last_updated ? new Date(data.last_updated) : null;
      const now = new Date();
      const isRecent = lastUpdated && (now.getTime() - lastUpdated.getTime()) < 5 * 60 * 1000;

      if (data.is_running && isRecent) {
        progress.isRunning = data.is_running ?? false;
        progress.specOrFixName = data.spec_or_fix_name ?? null;
        progress.type = data.type ?? null;
        progress.currentPhase = data.current_phase ?? null;
        progress.currentParentTask = data.current_parent_task ?? null;
        progress.currentSubtask = data.current_subtask ?? null;
        progress.totalParentTasks = data.total_parent_tasks ?? 0;
        progress.completedParentTasks = data.completed_parent_tasks ?? 0;
        progress.totalSubtasks = data.total_subtasks ?? 0;
        progress.completedSubtasks = data.completed_subtasks ?? 0;
        progress.percentage = data.percentage ?? 0;
        progress.currentAction = data.current_action ?? null;
        progress.startedAt = data.started_at ?? null;
        progress.lastUpdated = data.last_updated ?? null;

        return c.json(progress);
      }
    } catch (error) {
      console.error('[Execution] Error reading progress file:', error);
    }
  }

  // Read from state.json and tasks.md directly
  try {
    const activeWork = await findActiveWork(projectRoot);

    if (activeWork) {
      const { folder, type, tasksFile, state } = activeWork;

      progress.specOrFixName = folder;
      progress.type = type;
      progress.currentPhase = (state.current_phase as string) || null;
      progress.startedAt = (state.execution_started as string) || null;

      // Determine if actively running
      const isActive = Boolean(
        state.execution_started &&
        !state.execution_completed &&
        (state.current_phase === 'executing' ||
          state.current_phase === 'implementation' ||
          state.current_phase === 'in_progress')
      );

      progress.isRunning = isActive;

      // Get completed tasks
      const completedTaskIds: string[] = Array.isArray(state.completed_tasks)
        ? (state.completed_tasks as string[])
        : [];
      progress.completedParentTasks = completedTaskIds.length;

      // Get active task from state if available
      if (state.active_task) {
        progress.currentParentTask = state.active_task as string;
        progress.currentAction = `Executing task ${state.active_task}`;
      }

      // Parse tasks.md for total count and current task details
      if (existsSync(tasksFile)) {
        try {
          const tasksContent = await readFile(tasksFile, 'utf-8');
          const tasks = parseTasksMd(tasksContent);

          progress.totalParentTasks = tasks.length;

          // Count total subtasks
          progress.totalSubtasks = tasks.reduce((sum, t) => sum + t.subtasks.length, 0);

          // Calculate percentage
          if (tasks.length > 0) {
            progress.percentage = Math.round((completedTaskIds.length / tasks.length) * 100);
          }

          // Find current task if not set in state
          if (!progress.currentParentTask && isActive) {
            const { task } = findCurrentTask(tasks, completedTaskIds);
            if (task) {
              progress.currentParentTask = `${task.id}. ${task.title}`;
              progress.currentAction = `Working on task ${task.id}`;

              // Set first subtask as current if available
              if (task.subtasks.length > 0) {
                progress.currentSubtask = task.subtasks[0];
              }
            }
          }

          // Get last modified time as lastUpdated
          try {
            const tasksStatInfo = await stat(tasksFile);
            progress.lastUpdated = tasksStatInfo.mtime.toISOString();
          } catch {
            // Skip
          }
        } catch (error) {
          console.error('[Execution] Error parsing tasks.md:', error);
        }
      }

      // If completed, show completion status
      if (state.execution_completed) {
        progress.isRunning = false;
        progress.currentPhase = 'completed';
        progress.percentage = 100;
        progress.currentAction = 'Execution completed';
      }
    }
  } catch (error) {
    console.error('[Execution] Error checking active work:', error);
  }

  return c.json(progress);
});

export { executionRoutes };
