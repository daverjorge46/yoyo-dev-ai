/**
 * Git Service
 *
 * Executes git commands and parses output:
 * - `git status --porcelain` for file changes
 * - `git branch --show-current` for current branch
 * - Caches results with 5s TTL
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { GitStatus } from '../state-manager.js';

const execAsync = promisify(exec);

const CACHE_TTL = 5000; // 5 seconds

export class GitService {
  private cache: GitStatus | null = null;
  private cacheTimestamp: number = 0;

  /**
   * Get current git status with caching
   */
  async getStatus(): Promise<GitStatus> {
    // Return cached result if still valid
    if (this.cache && Date.now() - this.cacheTimestamp < CACHE_TTL) {
      return this.cache;
    }

    try {
      // Get current branch
      const branch = await this.getCurrentBranch();

      // Get file status
      const { modified, added, deleted } = await this.getFileStatus();

      // Get ahead/behind status
      const { ahead, behind } = await this.getAheadBehind();

      const status: GitStatus = {
        branch,
        modified,
        added,
        deleted,
        ahead,
        behind,
      };

      // Update cache
      this.cache = status;
      this.cacheTimestamp = Date.now();

      return status;
    } catch (error) {
      // Return empty status if git not available or not a git repo
      return {
        branch: null,
        modified: 0,
        added: 0,
        deleted: 0,
        ahead: 0,
        behind: 0,
      };
    }
  }

  /**
   * Get current branch name
   */
  private async getCurrentBranch(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git branch --show-current');
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Get file status counts
   */
  private async getFileStatus(): Promise<{ modified: number; added: number; deleted: number }> {
    try {
      const { stdout } = await execAsync('git status --porcelain');
      const lines = stdout.split('\n').filter((line) => line.trim());

      let modified = 0;
      let added = 0;
      let deleted = 0;

      lines.forEach((line) => {
        const status = line.substring(0, 2);
        if (status.includes('M')) modified++;
        if (status.includes('A')) added++;
        if (status.includes('D')) deleted++;
      });

      return { modified, added, deleted };
    } catch {
      return { modified: 0, added: 0, deleted: 0 };
    }
  }

  /**
   * Get ahead/behind commit counts
   */
  private async getAheadBehind(): Promise<{ ahead: number; behind: number }> {
    try {
      const { stdout } = await execAsync('git status --porcelain=v2 --branch');
      const branchLine = stdout.split('\n').find((line) => line.startsWith('# branch.ab'));

      if (branchLine) {
        const match = branchLine.match(/\+(\d+) -(\d+)/);
        if (match) {
          return {
            ahead: parseInt(match[1], 10),
            behind: parseInt(match[2], 10),
          };
        }
      }

      return { ahead: 0, behind: 0 };
    } catch {
      return { ahead: 0, behind: 0 };
    }
  }

  /**
   * Clear cache (useful for forcing refresh)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

export const gitService = new GitService();
