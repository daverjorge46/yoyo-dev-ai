import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/Logger';

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  isDirty: boolean;
  aheadBehind: { ahead: number; behind: number };
  status: string;
}

/**
 * Service for Git operations
 */
export class GitService {
  private logger: Logger;
  private workspaceRoot: string | null = null;

  constructor() {
    this.logger = Logger.getInstance();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
    }
  }

  /**
   * Get current git status
   */
  public async getStatus(): Promise<GitStatus | null> {
    if (!this.workspaceRoot) {
      this.logger.warn('No workspace root found for git operations');
      return null;
    }

    try {
      // Get current branch
      const { stdout: branch } = await execAsync('git branch --show-current', {
        cwd: this.workspaceRoot,
      });

      // Get status (check if dirty)
      const { stdout: status } = await execAsync('git status --porcelain', {
        cwd: this.workspaceRoot,
      });

      // Get ahead/behind
      let ahead = 0;
      let behind = 0;
      try {
        const { stdout: aheadBehindStr } = await execAsync(
          'git rev-list --left-right --count HEAD...@{u}',
          { cwd: this.workspaceRoot }
        );
        const [aheadStr, behindStr] = aheadBehindStr.trim().split('\t');
        ahead = parseInt(aheadStr, 10) || 0;
        behind = parseInt(behindStr, 10) || 0;
      } catch {
        // No upstream configured, ignore
      }

      return {
        branch: branch.trim(),
        isDirty: status.trim().length > 0,
        aheadBehind: { ahead, behind },
        status: status.trim(),
      };
    } catch (error) {
      this.logger.error('Failed to get git status', error as Error);
      return null;
    }
  }

  /**
   * Get short git status summary
   */
  public async getStatusSummary(): Promise<string> {
    const status = await this.getStatus();
    if (!status) {
      return 'Not a git repository';
    }

    const parts: string[] = [status.branch];

    if (status.isDirty) {
      parts.push('(dirty)');
    }

    if (status.aheadBehind.ahead > 0) {
      parts.push(`↑${status.aheadBehind.ahead}`);
    }

    if (status.aheadBehind.behind > 0) {
      parts.push(`↓${status.aheadBehind.behind}`);
    }

    return parts.join(' ');
  }

  /**
   * Dispose service
   */
  public dispose(): void {
    // No cleanup needed
  }
}
