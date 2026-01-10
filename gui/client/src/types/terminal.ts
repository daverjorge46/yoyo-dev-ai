/**
 * Terminal Types
 *
 * Types for the Agent Terminal system that provides:
 * - Multi-agent terminal management (up to 12 concurrent)
 * - One-click task context injection
 * - Real-time streaming output
 * - Session persistence
 */

// =============================================================================
// Agent Types
// =============================================================================

export type AgentType =
  | 'yoyo-ai'           // Primary orchestrator
  | 'dave-engineer'     // Frontend/UI specialist
  | 'arthas-oracle'     // Strategic advisor, debugging
  | 'alma-librarian'    // External research
  | 'alvaro-explore'    // Codebase search
  | 'angeles-writer'    // Documentation
  | 'implementer'       // Implementation coordinator
  | 'qa-reviewer'       // QA validation
  | 'qa-fixer';         // QA issue resolution

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  'yoyo-ai': 'Yoyo AI (Orchestrator)',
  'dave-engineer': 'Dave (Frontend)',
  'arthas-oracle': 'Arthas (Oracle)',
  'alma-librarian': 'Alma (Research)',
  'alvaro-explore': 'Alvaro (Codebase)',
  'angeles-writer': 'Angeles (Docs)',
  'implementer': 'Implementer',
  'qa-reviewer': 'QA Reviewer',
  'qa-fixer': 'QA Fixer',
};

export const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  'yoyo-ai': 'orange',
  'dave-engineer': 'blue',
  'arthas-oracle': 'purple',
  'alma-librarian': 'green',
  'alvaro-explore': 'cyan',
  'angeles-writer': 'pink',
  'implementer': 'yellow',
  'qa-reviewer': 'teal',
  'qa-fixer': 'red',
};

// =============================================================================
// Terminal Status
// =============================================================================

export type TerminalStatus =
  | 'idle'        // Created but not started
  | 'running'     // Actively executing
  | 'paused'      // Temporarily stopped
  | 'completed'   // Finished successfully
  | 'error'       // Finished with error
  | 'cancelled';  // User cancelled

// =============================================================================
// Terminal Context
// =============================================================================

export interface TerminalContext {
  /** Spec summary from spec-lite.md */
  specSummary?: string;
  /** Current task description */
  taskDescription?: string;
  /** Relevant codebase files/patterns */
  codebaseContext?: string;
  /** Context from memory system */
  memoryContext?: string;
  /** Tech stack from tech-stack.md */
  techStackContext?: string;
  /** Custom user-provided context */
  customContext?: string;
}

// =============================================================================
// Output Line
// =============================================================================

export interface OutputLine {
  /** Unique line ID */
  id: string;
  /** Line content (may contain ANSI codes) */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Stream type */
  stream: 'stdout' | 'stderr' | 'system';
}

// =============================================================================
// Terminal
// =============================================================================

export interface AgentTerminal {
  /** Unique terminal ID */
  id: string;
  /** Display name (auto-generated or custom) */
  name: string;
  /** Agent type running in terminal */
  agentType: AgentType;
  /** Current status */
  status: TerminalStatus;

  // Session management
  /** Created timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Started timestamp (when execution began) */
  startedAt?: Date;
  /** Completed timestamp */
  completedAt?: Date;

  // Task binding
  /** Associated Kanban task ID */
  boundTaskId?: string;
  /** Associated specification ID */
  boundSpecId?: string;

  // Worktree isolation
  /** Git worktree path */
  worktreePath?: string;
  /** Branch name (yoyo-dev/{spec-name}) */
  worktreeBranch?: string;

  // Context
  /** Injected context for the agent */
  injectedContext?: TerminalContext;

  // Progress
  /** Execution progress (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Exit code if completed */
  exitCode?: number;

  // Output (not stored in full, just preview)
  /** Last output line for preview */
  lastOutputLine?: string;
  /** Total output line count */
  outputLineCount: number;
}

// =============================================================================
// Terminal Pool Configuration
// =============================================================================

export interface TerminalPoolConfig {
  /** Maximum concurrent terminals (default: 12) */
  maxConcurrent: number;
  /** Auto-cleanup idle terminals after hours (default: 24) */
  autoCleanupHours: number;
  /** Default agent type for new terminals */
  defaultAgent: AgentType;
  /** Enable worktree isolation by default */
  worktreeEnabled: boolean;
}

export const DEFAULT_TERMINAL_POOL_CONFIG: TerminalPoolConfig = {
  maxConcurrent: 12,
  autoCleanupHours: 24,
  defaultAgent: 'yoyo-ai',
  worktreeEnabled: true,
};

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface SpawnTerminalRequest {
  /** Agent type to use */
  agentType: AgentType;
  /** Optional custom name */
  name?: string;
  /** Optional task binding */
  taskId?: string;
  /** Optional spec binding */
  specId?: string;
  /** Optional context to inject */
  context?: TerminalContext;
  /** Use worktree isolation */
  useWorktree?: boolean;
}

export interface InjectContextRequest {
  /** Context to inject */
  context: TerminalContext;
  /** Append to existing context (default: replace) */
  append?: boolean;
}

export interface TerminalListResponse {
  /** List of terminals */
  terminals: AgentTerminal[];
  /** Pool statistics */
  stats: {
    total: number;
    running: number;
    paused: number;
    completed: number;
    error: number;
    maxConcurrent: number;
  };
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

export type TerminalWSMessageType =
  | 'terminal:output'      // New output line
  | 'terminal:status'      // Status change
  | 'terminal:progress'    // Progress update
  | 'terminal:error'       // Error occurred
  | 'terminal:completed';  // Terminal completed

export interface TerminalWSMessage {
  type: TerminalWSMessageType;
  terminalId: string;
  timestamp: Date;
}

export interface TerminalOutputMessage extends TerminalWSMessage {
  type: 'terminal:output';
  line: OutputLine;
}

export interface TerminalStatusMessage extends TerminalWSMessage {
  type: 'terminal:status';
  status: TerminalStatus;
  previousStatus: TerminalStatus;
}

export interface TerminalProgressMessage extends TerminalWSMessage {
  type: 'terminal:progress';
  progress: number;
  message?: string;
}

export interface TerminalErrorMessage extends TerminalWSMessage {
  type: 'terminal:error';
  errorMessage: string;
}

export interface TerminalCompletedMessage extends TerminalWSMessage {
  type: 'terminal:completed';
  exitCode: number;
  success: boolean;
}

export type TerminalWSPayload =
  | TerminalOutputMessage
  | TerminalStatusMessage
  | TerminalProgressMessage
  | TerminalErrorMessage
  | TerminalCompletedMessage;
