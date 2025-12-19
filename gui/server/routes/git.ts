/**
 * Git Status API Routes
 *
 * Provides git repository status information.
 */

import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Variables } from '../types.js';

const execAsync = promisify(exec);

const gitRoutes = new Hono<{ Variables: Variables }>();

interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  clean: boolean;
  uncommitted: number;
  staged: number;
  untracked: number;
  conflicts: number;
  ahead: number;
  behind: number;
  remoteUrl: string | null;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  } | null;
}

/**
 * Execute git command in project directory
 */
async function gitCommand(projectRoot: string, command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${command}`, {
      cwd: projectRoot,
      encoding: 'utf-8',
    });
    return stdout.trim();
  } catch (error: any) {
    // Git command failed - might not be a repo
    if (error.stderr?.includes('not a git repository')) {
      throw new Error('NOT_A_REPO');
    }
    throw error;
  }
}

/**
 * GET /api/git - Get git repository status
 */
gitRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();

  const status: GitStatus = {
    isRepo: false,
    branch: null,
    clean: true,
    uncommitted: 0,
    staged: 0,
    untracked: 0,
    conflicts: 0,
    ahead: 0,
    behind: 0,
    remoteUrl: null,
    lastCommit: null,
  };

  try {
    // Check if it's a git repo
    await gitCommand(projectRoot, 'rev-parse --git-dir');
    status.isRepo = true;

    // Get current branch
    try {
      status.branch = await gitCommand(projectRoot, 'branch --show-current');
      if (!status.branch) {
        // Detached HEAD state
        status.branch = await gitCommand(projectRoot, 'rev-parse --short HEAD');
      }
    } catch {
      status.branch = null;
    }

    // Get status counts
    try {
      const statusOutput = await gitCommand(projectRoot, 'status --porcelain');
      const lines = statusOutput.split('\n').filter(Boolean);

      for (const line of lines) {
        const indexStatus = line[0];
        const workTreeStatus = line[1];

        // Staged changes
        if (indexStatus !== ' ' && indexStatus !== '?') {
          status.staged++;
        }

        // Unstaged changes (modified in work tree)
        if (workTreeStatus === 'M' || workTreeStatus === 'D') {
          status.uncommitted++;
        }

        // Untracked files
        if (indexStatus === '?' && workTreeStatus === '?') {
          status.untracked++;
        }

        // Conflicts
        if (indexStatus === 'U' || workTreeStatus === 'U') {
          status.conflicts++;
        }
      }

      status.clean = lines.length === 0;
      status.uncommitted = status.staged + status.uncommitted + status.untracked;
    } catch {
      // Ignore status errors
    }

    // Get ahead/behind counts
    try {
      const tracking = await gitCommand(projectRoot, 'rev-parse --abbrev-ref @{upstream}');
      if (tracking) {
        const counts = await gitCommand(projectRoot, 'rev-list --left-right --count @{upstream}...HEAD');
        const [behind, ahead] = counts.split('\t').map(Number);
        status.ahead = ahead || 0;
        status.behind = behind || 0;
      }
    } catch {
      // No upstream tracking
    }

    // Get remote URL
    try {
      status.remoteUrl = await gitCommand(projectRoot, 'config --get remote.origin.url');
    } catch {
      // No remote
    }

    // Get last commit
    try {
      const logOutput = await gitCommand(
        projectRoot,
        'log -1 --format="%H|%s|%an|%ai"'
      );
      if (logOutput) {
        const [hash, message, author, date] = logOutput.split('|');
        status.lastCommit = {
          hash: hash.substring(0, 7),
          message,
          author,
          date,
        };
      }
    } catch {
      // No commits yet
    }

    return c.json(status);
  } catch (error: any) {
    if (error.message === 'NOT_A_REPO') {
      return c.json(status);
    }
    console.error('[Git] Error:', error);
    return c.json({ error: true, message: 'Failed to get git status' }, 500);
  }
});

export { gitRoutes };
