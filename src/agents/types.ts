/**
 * Agent System Types
 *
 * Defines the type system for multi-agent orchestration.
 * All agents use Claude models (Opus 4.5 primary, Sonnet 4.5 fallback).
 */

/**
 * Agent execution mode
 * - primary: Main orchestrator with full tool access
 * - subagent: Specialized agent with restricted tools
 */
export type AgentMode = "primary" | "subagent";

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent name (e.g., "yoyo-ai", "oracle") */
  name: string;

  /** Agent role description */
  role: string;

  /** Model to use (e.g., "anthropic/claude-opus-4-5") */
  model: string;

  /** Fallback model if primary unavailable */
  fallbackModel?: string;

  /** Temperature (0.0 - 1.0) */
  temperature: number;

  /** Execution mode */
  mode: AgentMode;

  /** Tool access list (supports wildcards and negations) */
  tools: string[];

  /** Path to system prompt markdown file */
  systemPromptPath: string;

  /** Whether agent is enabled */
  enabled?: boolean;

  /** Prefer fallback model by default (cost optimization) */
  preferFallback?: boolean;

  /** Fallback on rate limit errors */
  fallbackOnRateLimit?: boolean;

  /** UI display color (hex) */
  color?: string;

  /** Additional metadata */
  metadata?: AgentMetadata;
}

/**
 * Agent metadata
 */
export interface AgentMetadata {
  /** Agent description */
  description?: string;

  /** Agent version */
  version?: string;

  /** Agent author */
  author?: string;

  /** Creation timestamp */
  createdAt?: Date;

  /** Last modified timestamp */
  updatedAt?: Date;

  /** Tags for categorization */
  tags?: string[];

  /** Mode override (from mode detection) */
  mode?: string;
}

/**
 * Agent permissions
 */
export interface AgentPermissions {
  /** Can read files */
  read?: boolean;

  /** Can write files */
  write?: boolean;

  /** Can execute bash commands */
  bash?: boolean;

  /** Can call other agents */
  callAgent?: boolean;

  /** Can create background tasks */
  backgroundTask?: boolean;

  /** Custom tool permissions */
  tools?: Record<string, boolean>;
}

/**
 * Loaded agent with system prompt
 */
export interface LoadedAgent extends AgentConfig {
  /** Loaded system prompt content */
  systemPrompt: string;

  /** Resolved tool list (after applying wildcards/negations) */
  resolvedTools?: string[];
}

/**
 * Agent execution context
 */
export interface AgentContext {
  /** Agent configuration */
  agent: LoadedAgent;

  /** Session ID */
  sessionId: string;

  /** Parent session ID (for subagents) */
  parentSessionId?: string;

  /** Execution metadata */
  metadata: ExecutionMetadata;
}

/**
 * Agent execution metadata
 */
export interface ExecutionMetadata {
  /** Start time */
  startTime: Date;

  /** End time */
  endTime?: Date;

  /** Duration in milliseconds */
  duration?: number;

  /** Token usage */
  tokenUsage?: TokenUsage;

  /** Tools used */
  toolsUsed?: string[];

  /** Model used (primary or fallback) */
  modelUsed?: string;

  /** Whether fallback was triggered */
  usedFallback?: boolean;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Input tokens */
  input: number;

  /** Output tokens */
  output: number;

  /** Total tokens */
  total: number;

  /** Estimated cost (USD) */
  cost?: number;
}

/**
 * Agent registry interface
 */
export interface AgentRegistry {
  /** Get agent by name */
  getAgent(name: string): AgentConfig | undefined;

  /** Get all agents */
  getAllAgents(): AgentConfig[];

  /** Register new agent */
  registerAgent(agent: AgentConfig): void;

  /** Check if agent exists */
  hasAgent(name: string): boolean;

  /** Get enabled agents only */
  getEnabledAgents(): AgentConfig[];
}

/**
 * Model fallback strategy
 */
export type FallbackStrategy = "graceful" | "immediate";

/**
 * Model fallback configuration
 */
export interface FallbackConfig {
  /** Whether fallback is enabled */
  enabled: boolean;

  /** Fallback strategy */
  strategy: FallbackStrategy;

  /** Max retries before fallback */
  maxRetries: number;

  /** Retry delay in milliseconds */
  retryDelay: number;

  /** Triggers for fallback */
  triggers: FallbackTrigger[];

  /** Agents that should use fallback by default */
  useFallbackFor: string[];
}

/**
 * Fallback trigger types
 */
export type FallbackTrigger =
  | "rate_limit_error"
  | "quota_exceeded"
  | "timeout"
  | "model_unavailable";

/**
 * Agent call options
 */
export interface CallAgentOptions {
  /** Agent to call */
  agent: string;

  /** Prompt for agent */
  prompt: string;

  /** Tool restrictions (override agent defaults) */
  tools?: string[];

  /** Timeout in milliseconds */
  timeout?: number;

  /** Response format */
  format?: "json" | "markdown";

  /** Force specific model */
  model?: string;
}

/**
 * Agent call result
 */
export interface CallAgentResult {
  /** Agent name */
  agent: string;

  /** Response content */
  response: string;

  /** Execution metadata */
  metadata: ExecutionMetadata;

  /** Error if failed */
  error?: AgentError;
}

/**
 * Agent error types
 */
export type AgentErrorCode =
  | "AGENT_NOT_FOUND"
  | "INVALID_CONFIG"
  | "TOOL_ACCESS_DENIED"
  | "CYCLE_DETECTED"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "MODEL_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Agent error
 */
export interface AgentError {
  /** Error code */
  code: AgentErrorCode;

  /** Error message */
  message: string;

  /** Additional details */
  details?: Record<string, unknown>;

  /** Original error */
  cause?: Error;
}

/**
 * Agent validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings?: string[];
}
