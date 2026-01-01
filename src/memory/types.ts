/**
 * Memory System Type Definitions
 *
 * Core types for the Yoyo AI memory system including memory blocks,
 * scopes, and content schemas.
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Types of memory blocks supported by the system.
 * - persona: Agent behavior and personality
 * - project: Project-specific context (architecture, patterns)
 * - user: User preferences and interaction patterns
 * - corrections: Learnings from feedback and corrections
 */
export type MemoryBlockType = 'persona' | 'project' | 'user' | 'corrections';

/**
 * Memory storage scope.
 * - global: Stored in ~/yoyo-dev/memory/, applies to all projects
 * - project: Stored in .yoyo-dev/memory/, project-specific
 */
export type MemoryScope = 'global' | 'project';

/**
 * Conversation message role.
 */
export type MessageRole = 'user' | 'assistant' | 'system';

// =============================================================================
// Memory Block Content Schemas
// =============================================================================

/**
 * Persona block content - defines how the AI agent should behave.
 */
export interface PersonaContent {
  /** Agent name */
  name: string;
  /** Behavioral traits (e.g., "helpful", "concise", "thorough") */
  traits: string[];
  /** Communication style (e.g., "concise", "detailed", "technical") */
  communication_style: string;
  /** Areas of expertise to focus on */
  expertise_areas: string[];
}

/**
 * Project block content - codebase context and architecture.
 */
export interface ProjectContent {
  /** Project name */
  name: string;
  /** Brief project description */
  description: string;
  /** Technology stack details */
  tech_stack: {
    language: string;
    framework: string;
    database?: string;
    styling?: string;
    testing?: string;
    build_tool?: string;
  };
  /** Architecture pattern (e.g., "monolith", "microservices", "serverless") */
  architecture: string;
  /** Coding patterns in use (e.g., "TDD", "atomic-design", "repository-pattern") */
  patterns: string[];
  /** Important directories and their purposes */
  key_directories: Record<string, string>;
  /** Key files to be aware of */
  key_files?: string[];
}

/**
 * User block content - user preferences and interaction patterns.
 */
export interface UserContent {
  /** Coding style preferences (e.g., "functional", "immutable", "verbose") */
  coding_style: string[];
  /** Key-value preferences */
  preferences: Record<string, string>;
  /** Preferred development tools */
  tools: string[];
  /** Communication preferences */
  communication: {
    /** How verbose responses should be */
    verbosity: 'minimal' | 'normal' | 'detailed';
    /** Whether to include code examples */
    examples: boolean;
    /** Whether to explain reasoning */
    explanations: boolean;
  };
}

/**
 * Single correction entry - a specific learning from feedback.
 */
export interface CorrectionEntry {
  /** What was wrong or suboptimal */
  issue: string;
  /** What to do instead */
  correction: string;
  /** When this correction applies (optional context) */
  context?: string;
  /** When this was learned (ISO date string) */
  date: string;
}

/**
 * Corrections block content - accumulated learnings from user feedback.
 */
export interface CorrectionsContent {
  /** List of corrections learned over time */
  corrections: CorrectionEntry[];
}

/**
 * Union type for all memory block content types.
 */
export type MemoryBlockContent =
  | PersonaContent
  | ProjectContent
  | UserContent
  | CorrectionsContent;

// =============================================================================
// Memory Block
// =============================================================================

/**
 * A memory block - the core unit of persistent memory.
 */
export interface MemoryBlock<T extends MemoryBlockContent = MemoryBlockContent> {
  /** Unique identifier (UUID) */
  id: string;
  /** Type of memory block */
  type: MemoryBlockType;
  /** Storage scope (global or project) */
  scope: MemoryScope;
  /** Block content (type depends on block type) */
  content: T;
  /** Version number for optimistic locking */
  version: number;
  /** When the block was created */
  createdAt: Date;
  /** When the block was last updated */
  updatedAt: Date;
}

/**
 * Typed memory block aliases for convenience.
 */
export type PersonaBlock = MemoryBlock<PersonaContent>;
export type ProjectBlock = MemoryBlock<ProjectContent>;
export type UserBlock = MemoryBlock<UserContent>;
export type CorrectionsBlock = MemoryBlock<CorrectionsContent>;

// =============================================================================
// Conversation Types
// =============================================================================

/**
 * A single conversation message.
 */
export interface ConversationMessage {
  /** Unique identifier (UUID) */
  id: string;
  /** Agent ID this message belongs to */
  agentId: string;
  /** Message role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** When the message was created */
  timestamp: Date;
  /** Optional metadata (tool calls, etc.) */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Agent Types
// =============================================================================

/**
 * Agent state - represents a persistent AI agent.
 */
export interface Agent {
  /** Unique identifier (UUID) */
  id: string;
  /** Agent name (optional) */
  name?: string;
  /** LLM model being used */
  model: string;
  /** IDs of associated memory blocks */
  memoryBlockIds: string[];
  /** Agent-specific settings */
  settings?: Record<string, unknown>;
  /** When the agent was created */
  createdAt: Date;
  /** When the agent was last used */
  lastUsed: Date;
}

// =============================================================================
// Operation Types
// =============================================================================

/**
 * Input for creating/updating a memory block.
 */
export interface MemoryBlockInput {
  type: MemoryBlockType;
  scope: MemoryScope;
  content: MemoryBlockContent;
}

/**
 * Options for the /init command.
 */
export interface InitOptions {
  /** Overwrite existing memory blocks */
  force?: boolean;
  /** Target scope (defaults to 'project') */
  scope?: MemoryScope;
}

/**
 * Options for the /remember command.
 */
export interface RememberOptions {
  /** What to remember */
  instruction: string;
  /** Target block type (auto-detect if not specified) */
  block?: MemoryBlockType;
}

/**
 * Options for the /clear command.
 */
export interface ClearOptions {
  /** Also clear memory blocks (default: false, only clears conversation) */
  includeMemory?: boolean;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Memory operation error codes.
 */
export type MemoryErrorCode =
  | 'DB_ERROR'
  | 'BLOCK_NOT_FOUND'
  | 'SCOPE_ERROR'
  | 'VALIDATION_ERROR'
  | 'INIT_ERROR'
  | 'PERMISSION_ERROR';

/**
 * Memory system error with structured information.
 */
export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly code: MemoryErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

// =============================================================================
// Database Row Types (for SQLite mapping)
// =============================================================================

/**
 * Raw memory block row from SQLite.
 */
export interface MemoryBlockRow {
  id: string;
  type: string;
  scope: string;
  content: string; // JSON string
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Raw conversation row from SQLite.
 */
export interface ConversationRow {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: string | null; // JSON string or null
}

/**
 * Raw agent row from SQLite.
 */
export interface AgentRow {
  id: string;
  name: string | null;
  model: string;
  memory_block_ids: string | null; // JSON array string
  settings: string | null; // JSON string
  created_at: string;
  last_used: string;
}
