/**
 * Execution Progress API Routes
 *
 * Provides current task execution progress.
 */

import { Hono } from 'hono';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const executionRoutes = new Hono();

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
 * GET /api/execution - Get current execution progress
 */
executionRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();

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

  // Try to read execution progress from cache
  const progressFile = join(projectRoot, '.yoyo-dev', '.cache', 'execution-progress.json');

  if (existsSync(progressFile)) {
    try {
      const content = await readFile(progressFile, 'utf-8');
      const data = JSON.parse(content);

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
    } catch (error) {
      console.error('[Execution] Error reading progress file:', error);
    }
  }

  // If no cache file, try to infer from active specs/fixes
  try {
    const specsDir = join(projectRoot, '.yoyo-dev', 'specs');
    const fixesDir = join(projectRoot, '.yoyo-dev', 'fixes');

    // Check for active spec
    if (existsSync(specsDir)) {
      const { readdir } = await import('fs/promises');
      const specFolders = await readdir(specsDir);

      for (const folder of specFolders.reverse()) { // Most recent first
        const stateFile = join(specsDir, folder, 'state.json');
        if (existsSync(stateFile)) {
          try {
            const stateContent = await readFile(stateFile, 'utf-8');
            const state = JSON.parse(stateContent);

            if (state.current_phase === 'implementation' && !state.execution_completed) {
              progress.isRunning = true;
              progress.specOrFixName = folder;
              progress.type = 'spec';
              progress.currentPhase = state.current_phase;
              progress.startedAt = state.execution_started;

              // Calculate progress from completed_tasks
              if (state.completed_tasks && Array.isArray(state.completed_tasks)) {
                progress.completedParentTasks = state.completed_tasks.length;
                // Rough estimate - would need to parse tasks.md for accurate count
                progress.percentage = Math.min(progress.completedParentTasks * 10, 100);
              }

              break;
            }
          } catch {
            // Ignore individual state file errors
          }
        }
      }
    }

    // Check for active fix if no active spec
    if (!progress.isRunning && existsSync(fixesDir)) {
      const { readdir } = await import('fs/promises');
      const fixFolders = await readdir(fixesDir);

      for (const folder of fixFolders.reverse()) {
        const stateFile = join(fixesDir, folder, 'state.json');
        if (existsSync(stateFile)) {
          try {
            const stateContent = await readFile(stateFile, 'utf-8');
            const state = JSON.parse(stateContent);

            if (state.current_phase === 'implementation' && !state.execution_completed) {
              progress.isRunning = true;
              progress.specOrFixName = folder;
              progress.type = 'fix';
              progress.currentPhase = state.current_phase;
              progress.startedAt = state.execution_started;

              if (state.completed_tasks && Array.isArray(state.completed_tasks)) {
                progress.completedParentTasks = state.completed_tasks.length;
                progress.percentage = Math.min(progress.completedParentTasks * 10, 100);
              }

              break;
            }
          } catch {
            // Ignore individual state file errors
          }
        }
      }
    }
  } catch (error) {
    console.error('[Execution] Error checking active work:', error);
  }

  return c.json(progress);
});

export { executionRoutes };
