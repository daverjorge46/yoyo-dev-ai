/**
 * Terminal Server Types
 *
 * Server-side types for the Agent Terminal system.
 */

import type { ChildProcess } from 'child_process';

// =============================================================================
// Agent Types (shared with client)
// =============================================================================

export type AgentType =
  | 'yoyo-ai'
  | 'dave-engineer'
  | 'arthas-oracle'
  | 'alma-librarian'
  | 'alvaro-explore'
  | 'angeles-writer'
  | 'implementer'
  | 'qa-reviewer'
  | 'qa-fixer';

export type TerminalStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

// =============================================================================
// Terminal Context
// =============================================================================

export interface TerminalContext {
  specSummary?: string;
  taskDescription?: string;
  codebaseContext?: string;
  memoryContext?: string;
  techStackContext?: string;
  customContext?: string;
}

// =============================================================================
// Output Line
// =============================================================================

export interface OutputLine {
  id: string;
  content: string;
  timestamp: Date;
  stream: 'stdout' | 'stderr' | 'system';
}

// =============================================================================
// Terminal Session (Server-side)
// =============================================================================

export interface TerminalSession {
  /** Unique terminal ID */
  id: string;
  /** Display name */
  name: string;
  /** Agent type */
  agentType: AgentType;
  /** Current status */
  status: TerminalStatus;

  // Timestamps
  createdAt: Date;
  lastActivityAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Task binding
  boundTaskId?: string;
  boundSpecId?: string;

  // Worktree
  worktreePath?: string;
  worktreeBranch?: string;

  // Context
  injectedContext?: TerminalContext;

  // Progress
  progress: number;
  errorMessage?: string;
  exitCode?: number;

  // Output
  lastOutputLine?: string;
  outputLineCount: number;

  // Server-side process reference (not serialized)
  process?: ChildProcess;

  // Output buffer (in-memory, configurable size)
  outputBuffer: OutputLine[];
  maxBufferSize: number;
}

// =============================================================================
// Database Schema
// =============================================================================

export interface TerminalDBRow {
  id: string;
  name: string;
  agent_type: AgentType;
  status: TerminalStatus;
  created_at: string;
  last_activity_at: string;
  started_at: string | null;
  completed_at: string | null;
  bound_task_id: string | null;
  bound_spec_id: string | null;
  worktree_path: string | null;
  worktree_branch: string | null;
  injected_context: string | null; // JSON
  progress: number;
  error_message: string | null;
  exit_code: number | null;
  last_output_line: string | null;
  output_line_count: number;
}

// =============================================================================
// Pool Configuration
// =============================================================================

export interface TerminalPoolConfig {
  maxConcurrent: number;
  autoCleanupHours: number;
  defaultAgent: AgentType;
  worktreeEnabled: boolean;
  outputBufferSize: number;
  projectRoot: string;
}

export const DEFAULT_POOL_CONFIG: Omit<TerminalPoolConfig, 'projectRoot'> = {
  maxConcurrent: 12,
  autoCleanupHours: 24,
  defaultAgent: 'yoyo-ai',
  worktreeEnabled: true,
  outputBufferSize: 1000, // Keep last 1000 lines in memory
};

// =============================================================================
// Spawn Options
// =============================================================================

export interface SpawnOptions {
  agentType: AgentType;
  name?: string;
  taskId?: string;
  specId?: string;
  context?: TerminalContext;
  useWorktree?: boolean;
}

// =============================================================================
// Agent Command Mapping
// =============================================================================

export const AGENT_COMMAND_MAP: Record<AgentType, { command: string; args: string[] }> = {
  'yoyo-ai': {
    command: 'claude',
    args: ['--agent', 'yoyo-ai'],
  },
  'dave-engineer': {
    command: 'claude',
    args: ['--agent', 'dave-engineer'],
  },
  'arthas-oracle': {
    command: 'claude',
    args: ['--agent', 'arthas-oracle'],
  },
  'alma-librarian': {
    command: 'claude',
    args: ['--agent', 'alma-librarian'],
  },
  'alvaro-explore': {
    command: 'claude',
    args: ['--agent', 'alvaro-explore'],
  },
  'angeles-writer': {
    command: 'claude',
    args: ['--agent', 'angeles-writer'],
  },
  'implementer': {
    command: 'claude',
    args: ['--agent', 'implementer'],
  },
  'qa-reviewer': {
    command: 'claude',
    args: ['--agent', 'qa-reviewer'],
  },
  'qa-fixer': {
    command: 'claude',
    args: ['--agent', 'qa-fixer'],
  },
};

// =============================================================================
// WebSocket Events
// =============================================================================

export interface TerminalEvent {
  type: string;
  terminalId: string;
  timestamp: Date;
  payload: unknown;
}

export interface OutputEvent extends TerminalEvent {
  type: 'terminal:output';
  payload: OutputLine;
}

export interface StatusEvent extends TerminalEvent {
  type: 'terminal:status';
  payload: {
    status: TerminalStatus;
    previousStatus: TerminalStatus;
  };
}

export interface ProgressEvent extends TerminalEvent {
  type: 'terminal:progress';
  payload: {
    progress: number;
    message?: string;
  };
}

export interface ErrorEvent extends TerminalEvent {
  type: 'terminal:error';
  payload: {
    errorMessage: string;
  };
}

export interface CompletedEvent extends TerminalEvent {
  type: 'terminal:completed';
  payload: {
    exitCode: number;
    success: boolean;
  };
}
