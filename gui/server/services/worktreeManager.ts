/**
 * Worktree Manager Service
 *
 * Manages Git worktrees for isolated spec execution:
 * - Create worktree and branch for each spec
 * - Merge completed worktrees back to main
 * - Clean up orphaned worktrees
 */

import { execSync, exec } from 'child_process';
import { join, basename } from 'path';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// Types
// =============================================================================

export interface WorktreeInfo {
  specId: string;
  path: string;
  branch: string;
  createdAt: Date;
  lastCommitAt?: Date;
  commitCount: number;
  status: 'active' | 'completed' | 'orphaned';
  headCommit?: string;
}

export interface MergeResult {
  success: boolean;
  conflicts: boolean;
  conflictFiles?: string[];
  message: string;
}

export interface WorktreeManagerOptions {
  projectRoot: string;
  worktreesDir?: string;
  branchPrefix?: string;
}

// =============================================================================
// Worktree Manager Class
// =============================================================================

export class WorktreeManager {
  private projectRoot: string;
  private worktreesDir: string;
  private branchPrefix: string;

  constructor(options: WorktreeManagerOptions) {
    this.projectRoot = options.projectRoot;
    this.worktreesDir = options.worktreesDir ?? join(this.projectRoot, '.worktrees');
    this.branchPrefix = options.branchPrefix ?? 'yoyo-dev/';
  }

  // ===========================================================================
  // Lifecycle Methods
  // ===========================================================================

  /**
   * Create a worktree for a spec
   */
  async create(specId: string): Promise<WorktreeInfo> {
    const sanitizedId = this.sanitizeSpecId(specId);
    const branch = `${this.branchPrefix}${sanitizedId}`;
    const worktreePath = join(this.worktreesDir, sanitizedId);

    // Ensure worktrees directory exists
    if (!existsSync(this.worktreesDir)) {
      mkdirSync(this.worktreesDir, { recursive: true });
    }

    // Check if worktree already exists
    if (existsSync(worktreePath)) {
      return this.getStatus(specId);
    }

    try {
      // Get current branch to base worktree on
      const currentBranch = this.getCurrentBranch();

      // Create the branch if it doesn't exist
      const branchExists = this.branchExists(branch);
      if (!branchExists) {
        await this.exec(`git branch ${branch} ${currentBranch}`);
      }

      // Create the worktree
      await this.exec(`git worktree add "${worktreePath}" ${branch}`);

      console.log(`[WorktreeManager] Created worktree for ${specId} at ${worktreePath}`);

      return {
        specId,
        path: worktreePath,
        branch,
        createdAt: new Date(),
        commitCount: 0,
        status: 'active',
      };
    } catch (error) {
      console.error(`[WorktreeManager] Failed to create worktree for ${specId}:`, error);
      throw new Error(`Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a worktree
   */
  async delete(specId: string): Promise<void> {
    const sanitizedId = this.sanitizeSpecId(specId);
    const worktreePath = join(this.worktreesDir, sanitizedId);
    const branch = `${this.branchPrefix}${sanitizedId}`;

    try {
      // Remove worktree
      if (existsSync(worktreePath)) {
        await this.exec(`git worktree remove "${worktreePath}" --force`);
      }

      // Optionally delete branch (only if merged or explicitly requested)
      // For now, we keep the branch for reference

      console.log(`[WorktreeManager] Deleted worktree for ${specId}`);
    } catch (error) {
      console.error(`[WorktreeManager] Failed to delete worktree for ${specId}:`, error);
      throw new Error(`Failed to delete worktree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Merge a worktree's branch to target branch
   */
  async merge(specId: string, targetBranch?: string): Promise<MergeResult> {
    const sanitizedId = this.sanitizeSpecId(specId);
    const branch = `${this.branchPrefix}${sanitizedId}`;
    const target = targetBranch ?? this.getCurrentBranch();

    try {
      // Check for uncommitted changes in main repo
      const status = await this.exec('git status --porcelain');
      if (status.stdout.trim()) {
        return {
          success: false,
          conflicts: false,
          message: 'Cannot merge: uncommitted changes in working directory',
        };
      }

      // Try to merge
      try {
        await this.exec(`git merge ${branch} --no-edit`);
        console.log(`[WorktreeManager] Merged ${branch} into ${target}`);

        return {
          success: true,
          conflicts: false,
          message: `Successfully merged ${branch} into ${target}`,
        };
      } catch (mergeError) {
        // Check for conflicts
        const conflictStatus = await this.exec('git status --porcelain');
        const conflictFiles = conflictStatus.stdout
          .split('\n')
          .filter(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD'))
          .map(line => line.slice(3));

        if (conflictFiles.length > 0) {
          // Abort the merge
          await this.exec('git merge --abort');

          return {
            success: false,
            conflicts: true,
            conflictFiles,
            message: `Merge conflicts detected in ${conflictFiles.length} files`,
          };
        }

        throw mergeError;
      }
    } catch (error) {
      console.error(`[WorktreeManager] Failed to merge ${specId}:`, error);
      return {
        success: false,
        conflicts: false,
        message: `Failed to merge: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * List all worktrees
   */
  async list(): Promise<WorktreeInfo[]> {
    const worktrees: WorktreeInfo[] = [];

    try {
      const output = await this.exec('git worktree list --porcelain');
      const entries = output.stdout.split('\n\n').filter(Boolean);

      for (const entry of entries) {
        const lines = entry.split('\n');
        const pathLine = lines.find(l => l.startsWith('worktree '));
        const branchLine = lines.find(l => l.startsWith('branch '));
        const headLine = lines.find(l => l.startsWith('HEAD '));

        if (pathLine && branchLine) {
          const path = pathLine.slice(9);
          const branch = branchLine.slice(7);

          // Only include our worktrees (in .worktrees directory)
          if (path.includes(this.worktreesDir)) {
            const specId = basename(path);
            worktrees.push({
              specId,
              path,
              branch,
              createdAt: this.getWorktreeCreatedAt(path),
              commitCount: await this.getCommitCount(branch),
              status: 'active',
              headCommit: headLine?.slice(5),
            });
          }
        }
      }
    } catch (error) {
      console.error('[WorktreeManager] Failed to list worktrees:', error);
    }

    return worktrees;
  }

  /**
   * Get status of a specific worktree
   */
  async getStatus(specId: string): Promise<WorktreeInfo> {
    const sanitizedId = this.sanitizeSpecId(specId);
    const worktreePath = join(this.worktreesDir, sanitizedId);
    const branch = `${this.branchPrefix}${sanitizedId}`;

    if (!existsSync(worktreePath)) {
      throw new Error(`Worktree for ${specId} does not exist`);
    }

    return {
      specId,
      path: worktreePath,
      branch,
      createdAt: this.getWorktreeCreatedAt(worktreePath),
      commitCount: await this.getCommitCount(branch),
      status: 'active',
    };
  }

  /**
   * Clean up orphaned worktrees
   */
  async cleanupOrphaned(): Promise<number> {
    let cleaned = 0;

    try {
      // Prune stale worktree entries
      await this.exec('git worktree prune');

      // Check for directories without git worktree entries
      if (existsSync(this.worktreesDir)) {
        const entries = readdirSync(this.worktreesDir);
        const worktrees = await this.list();
        const activeSpecIds = new Set(worktrees.map(w => w.specId));

        for (const entry of entries) {
          const entryPath = join(this.worktreesDir, entry);
          if (statSync(entryPath).isDirectory() && !activeSpecIds.has(entry)) {
            // Orphaned directory - remove it
            rmSync(entryPath, { recursive: true, force: true });
            cleaned++;
            console.log(`[WorktreeManager] Cleaned orphaned directory: ${entry}`);
          }
        }
      }
    } catch (error) {
      console.error('[WorktreeManager] Failed to cleanup orphaned worktrees:', error);
    }

    if (cleaned > 0) {
      console.log(`[WorktreeManager] Cleaned up ${cleaned} orphaned worktrees`);
    }

    return cleaned;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Execute git command
   */
  private async exec(command: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync(command, { cwd: this.projectRoot });
  }

  /**
   * Sanitize spec ID for use in branch/directory names
   */
  private sanitizeSpecId(specId: string): string {
    return specId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get current branch name
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      }).trim();
    } catch {
      return 'main';
    }
  }

  /**
   * Check if a branch exists
   */
  private branchExists(branch: string): boolean {
    try {
      execSync(`git rev-parse --verify ${branch}`, {
        cwd: this.projectRoot,
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get worktree creation time (from directory)
   */
  private getWorktreeCreatedAt(path: string): Date {
    try {
      const stat = statSync(path);
      return stat.birthtime;
    } catch {
      return new Date();
    }
  }

  /**
   * Get commit count on a branch since it diverged
   */
  private async getCommitCount(branch: string): Promise<number> {
    try {
      const mainBranch = this.getCurrentBranch();
      const result = await this.exec(`git rev-list ${mainBranch}..${branch} --count`);
      return parseInt(result.stdout.trim(), 10) || 0;
    } catch {
      return 0;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let managerInstance: WorktreeManager | null = null;

export function getWorktreeManager(projectRoot: string): WorktreeManager {
  if (!managerInstance) {
    managerInstance = new WorktreeManager({ projectRoot });
  }
  return managerInstance;
}
