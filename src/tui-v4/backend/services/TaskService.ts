/**
 * Task Service
 *
 * Parses tasks.md files and builds hierarchical task tree.
 * Handles both spec tasks and fix tasks.
 */

import { readFile, stat } from 'node:fs/promises';
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

      // Find most recent tasks.md (by folder date)
      const sortedFiles = allTaskFiles.sort().reverse();
      const mostRecentFile = sortedFiles[0];

      if (!mostRecentFile) {
        return [];
      }

      // Parse most recent tasks file
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
        return {
          tasks: [],
          totalTasks: 0,
          completedTasks: 0,
          totalSubtasks: 0,
          completedSubtasks: 0,
          progress: 0,
        };
      }

      const content = await readFile(filePath, 'utf-8');
      const tasks: Task[] = [];

      // Split content by parent task headers
      // Match: ## Task N: Name or ## Task N: Name (completed markers)
      const taskPattern = /^##\s+Task\s+(\d+):\s+(.+?)(\s+[✅✓])?\s*$/gm;
      const sections = content.split(/^##\s+Task\s+\d+:/gm);

      // Find all task headers
      const headers: { number: string; name: string; completed: boolean }[] = [];
      let match: RegExpExecArray | null;
      
      while ((match = taskPattern.exec(content)) !== null) {
        if (match[1] && match[2]) {
          headers.push({
            number: match[1],
            name: match[2].trim(),
            completed: !!match[3],
          });
        }
      }

      // Process each section (skip first which is before any task)
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (!header) continue;
        
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

      const taskTemplate = `task-${header.number}`;
      }

      // Calculate totals
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const totalSubtasks = tasks.reduce((sum, task) => sum + task.children.length, 0);
      const completedSubtasks = tasks.reduce(
        (sum, task) => sum + task.children.filter(c => c.status === 'completed').length,
        0,
      );
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        tasks,
        totalTasks,
        completedTasks,
        totalSubtasks,
        completedSubtasks,
        progress,
      };
    } catch (error) {
      console.error(`[TaskService] Error parsing ${filePath}:`, error);
      return {
        tasks: [],
        totalTasks: 0,
        completedTasks: 0,
        totalSubtasks: 0,
        completedSubtasks: 0,
        progress: 0,
      };
    }
  }

  /**
   * Parse subtasks from a task section
   */
  private parseSubtasks(content: string, parentNumber: string): Task[] {
    const subtasks: Task[] = [];
    
    // Split by lines and look for checkbox patterns
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match: - [ ] Task name or - [x] Task name
      const checkboxMatch = trimmedLine.match(/^-\s+\[([ x✓✓])\]\s+(.+)$/);
      if (checkboxMatch) {
        const isCompleted = checkboxMatch[1] !== ' ' && checkboxMatch[1] !== 'x';
        const taskTitle = checkboxMatch[2].trim();
        
        if (taskTitle) {
          subtasks.push({
            id: `task-${parentNumber}-${subtasks.length + 1}`,
            number: Number.parseInt(parentNumber + '.' + (subtasks.length + 1)), // Decimal numbering
            title: taskTitle,
            status: isCompleted ? 'completed' : 'pending',
            dependencies: [],
            children: [],
          });
        }
      }
    }
    
    return subtasks;
  }
}

export const taskService = new TaskService();