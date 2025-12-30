/**
 * Spec Service
 *
 * Parses spec folders from .yoyo-dev/specs/ directory.
 * Extracts metadata: name, date, status, progress, tasks.
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import type { Spec } from '../state-manager.js';
import { taskService } from './TaskService.js';

export class SpecService {
  private specsDir = '.yoyo-dev/specs';

  /**
   * Get all specs from the specs directory
   */
  async getAllSpecs(): Promise<Spec[]> {
    const specs: Spec[] = [];

    try {
      // Check if specs directory exists
      const dirStat = await stat(this.specsDir).catch(() => null);
      if (!dirStat || !dirStat.isDirectory()) {
        return [];
      }

      // Read all subdirectories
      const entries = await readdir(this.specsDir, { withFileTypes: true });
      const specFolders = entries.filter(e => e.isDirectory());

      // Parse each spec folder
      for (const folder of specFolders) {
        const spec = await this.parseSpecFolder(join(this.specsDir, folder.name));
        if (spec) {
          specs.push(spec);
        }
      }

      // Sort by created date (most recent first)
      specs.sort((a, b) => b.created.localeCompare(a.created));

      return specs;
    } catch (error) {
      console.error('[SpecService] Error loading specs:', error);
      return [];
    }
  }

  /**
   * Get the active spec (most recent incomplete spec)
   */
  async getActiveSpec(): Promise<Spec | null> {
    const specs = await this.getAllSpecs();

    // Find most recent spec that is not completed
    const activeSpec = specs.find(spec => spec.phase !== 'completed');

    return activeSpec || null;
  }

  /**
   * Parse a single spec folder
   */
  private async parseSpecFolder(folderPath: string): Promise<Spec | null> {
    try {
      const folderName = folderPath.split('/').pop() || '';

      // Extract date and name from folder (YYYY-MM-DD-feature-name)
      const created = this.extractDate(folderName);
      const name = this.extractCleanName(folderName);

      // Check if spec.md exists (required)
      const specFile = join(folderPath, 'spec.md');
      const specExists = await stat(specFile).catch(() => null);
      if (!specExists) {
        return null;
      }

      // Parse state.json for phase/status
      const phase = await this.parseStateJson(folderPath);

      // Check if tasks.md exists
      const tasksFile = join(folderPath, 'tasks.md');
      const tasksExist = await stat(tasksFile).catch(() => null);
      const tasksCreated = tasksExist ? created : null;

      return {
        path: folderPath,
        name,
        created,
        phase,
        tasksCreated,
      };
    } catch (error) {
      console.error(`[SpecService] Error parsing spec folder ${folderPath}:`, error);
      return null;
    }
  }

  /**
   * Extract date from folder name (YYYY-MM-DD-name format)
   */
  private extractDate(folderName: string): string {
    const match = folderName.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Extract clean name from folder name (remove date prefix)
   */
  private extractCleanName(folderName: string): string {
    const parts = folderName.split('-');

    // If we have at least 4 parts (YYYY-MM-DD-name), remove date
    if (parts.length >= 4 && parts[0].length === 4 && /^\d+$/.test(parts[0])) {
      return parts.slice(3).join('-');
    }

    return folderName;
  }

  /**
   * Parse state.json to get current phase
   */
  private async parseStateJson(folderPath: string): Promise<string> {
    try {
      const stateFile = join(folderPath, 'state.json');
      const content = await readFile(stateFile, 'utf-8');
      const state = JSON.parse(content);
      return state.phase || state.current_phase || state.status || 'pending';
    } catch {
      return 'pending';
    }
  }
}

export const specService = new SpecService();
