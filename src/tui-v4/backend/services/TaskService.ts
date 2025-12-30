/**
 * Task Service
 *
 * Parses tasks.md files and builds hierarchical task tree.
 * Handles both spec tasks and fix tasks.
 */

import { readFile, stat } from 'fs/promises';
import { glob } from 'glob';
import type { Task } from '../state-manager.js';

export interface TaskParseResult {
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  progress: number;
}

export class TaskService {
  /**
   * Get all tasks from specs and fixes directories
   */
  async getTasks(): Promise<Task[]> {
    try {
      // Find all tasks.md files in specs and fixes
      const specTasks = await glob('.yoyo-dev/specs/*/tasks.md');
      const fixTasks = await glob('.yoyo-dev/fixes/*/tasks.md');
      const allTaskFiles = [...specTasks, ...fixTasks];

      if (allTaskFiles.length === 0) {
        return [];
      }

      // Find the most recent tasks.md (by folder date)
      const sortedFiles = allTaskFiles.sort().reverse();
      const mostRecentFile = sortedFiles[0];

      // Parse the most recent tasks file
      const result = await this.parseTaskFile(mostRecentFile);
      return result.tasks;
    } catch (error) {
      console.error('[TaskService] Error loading tasks:', error);
      return [];
    }
  }

  /**
   * Parse a single tasks.md file
   */
  async parseTaskFile(filePath: string): Promise<TaskParseResult> {
    try {
      const fileExists = await stat(filePath).catch(() => null);
      if (!fileExists) {
        return this.emptyResult();
      }

      const content = await readFile(filePath, 'utf-8');
      return this.parseTaskContent(content);
    } catch (error) {
      console.error(`[TaskService] Error parsing ${filePath}:`, error);
      return this.emptyResult();
    }
  }

  /**
   * Parse task content from markdown
   */
  parseTaskContent(content: string): TaskParseResult {
    const tasks: Task[] = [];

    // Split content by parent task headers
    // Match: ## Task N: Name or ## Task N: Name (completed markers)
    const taskPattern = /^##\s+Task\s+(\d+):\s+(.+?)(\s+[✅✓])?\s*$/gm;
    const sections = content.split(/^##\s+Task\s+\d+:/gm);

    // Find all task headers
    const headers: { number: string; name: string; completed: boolean }[] = [];
    let match;
    while ((match = taskPattern.exec(content)) !== null) {
      headers.push({
        number: match[1],
        name: match[2].trim(),
        completed: !!match[3],
      });
    }

    // Process each section (skip first which is before any task)
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const sectionContent = sections[i + 1] || '';

      // Parse subtasks from this section
      const children = this.parseSubtasks(sectionContent, header.number);

      // Determine task status
      let status: Task['status'] = 'pending';
      if (header.completed) {
        status = 'completed';
      } else if (children.some(c => c.status === 'completed')) {
        status = 'in_progress';
      }

      const task: Task = {
        id: `task-${header.number}`,
        number: header.number,
        title: header.name,
        status,
        dependencies: [],
        parallelSafe: true,
        children,
      };

      tasks.push(task);
    }

    // Calculate statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    const allSubtasks = tasks.flatMap(t => t.children);
    const totalSubtasks = allSubtasks.length;
    const completedSubtasks = allSubtasks.filter(s => s.status === 'completed').length;

    // Calculate progress
    let progress = 0;
    if (totalSubtasks > 0) {
      progress = Math.round((completedSubtasks / totalSubtasks) * 100);
    } else if (totalTasks > 0) {
      progress = Math.round((completedTasks / totalTasks) * 100);
    }

    return {
      tasks,
      totalTasks,
      completedTasks,
      totalSubtasks,
      completedSubtasks,
      progress,
    };
  }

  /**
   * Parse subtasks from a task section
   */
  private parseSubtasks(sectionContent: string, parentNumber: string): Task[] {
    const subtasks: Task[] = [];

    // Match: - [x] or - [ ] followed by task text
    const subtaskPattern = /^-\s+\[([x ])\]\s+(.+)$/gm;

    let match;
    let subtaskIndex = 1;
    while ((match = subtaskPattern.exec(sectionContent)) !== null) {
      const isCompleted = match[1].toLowerCase() === 'x';
      const text = match[2].trim();

      subtasks.push({
        id: `task-${parentNumber}.${subtaskIndex}`,
        number: `${parentNumber}.${subtaskIndex}`,
        title: text,
        status: isCompleted ? 'completed' : 'pending',
        dependencies: [],
        parallelSafe: true,
        parent: parentNumber,
        children: [],
      });

      subtaskIndex++;
    }

    return subtasks;
  }

  /**
   * Return empty result
   */
  private emptyResult(): TaskParseResult {
    return {
      tasks: [],
      totalTasks: 0,
      completedTasks: 0,
      totalSubtasks: 0,
      completedSubtasks: 0,
      progress: 0,
    };
  }

  /**
   * Find and parse the most recent tasks.md
   */
  async findAndParseTasks(): Promise<TaskParseResult> {
    try {
      // Priority 1: tasks.md in current directory
      const cwdTasks = 'tasks.md';
      if (await stat(cwdTasks).catch(() => null)) {
        return this.parseTaskFile(cwdTasks);
      }

      // Priority 2: Most recent spec tasks.md
      const specTasks = await glob('.yoyo-dev/specs/*/tasks.md');
      if (specTasks.length > 0) {
        const sorted = specTasks.sort().reverse();
        return this.parseTaskFile(sorted[0]);
      }

      // Priority 3: Most recent fix tasks.md
      const fixTasks = await glob('.yoyo-dev/fixes/*/tasks.md');
      if (fixTasks.length > 0) {
        const sorted = fixTasks.sort().reverse();
        return this.parseTaskFile(sorted[0]);
      }

      return this.emptyResult();
    } catch (error) {
      console.error('[TaskService] Error finding tasks:', error);
      return this.emptyResult();
    }
  }
}

export const taskService = new TaskService();
