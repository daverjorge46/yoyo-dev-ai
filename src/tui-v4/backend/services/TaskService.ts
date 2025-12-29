/**
 * Task Service
 *
 * Parses tasks.md files and maintains task tree structure.
 * TODO: Full implementation with markdown parsing
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import type { Task } from '../state-manager.js';

export class TaskService {
  /**
   * Get all tasks from specs directory
   */
  async getTasks(): Promise<Task[]> {
    try {
      // Find all tasks.md files
      const taskFiles = await glob('.yoyo-dev/specs/*/tasks.md');

      if (taskFiles.length === 0) {
        return [];
      }

      // For now, return empty array
      // TODO: Parse tasks.md files and build task tree
      return [];
    } catch (error) {
      console.error('[TaskService] Error loading tasks:', error);
      return [];
    }
  }

  /**
   * Parse a single tasks.md file
   * TODO: Implement markdown parsing logic
   */
  private async parseTaskFile(filePath: string): Promise<Task[]> {
    const content = await readFile(filePath, 'utf-8');
    // TODO: Parse markdown, extract tasks with metadata
    return [];
  }
}

export const taskService = new TaskService();
