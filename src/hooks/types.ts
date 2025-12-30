/**
 * Hook System Types
 *
 * Defines types for the event-driven hook infrastructure.
 * Hooks are behavioral only - they cannot block tool execution.
 *
 * @version 5.0.0
 * @author Yoyo Dev Team
 */

/**
 * Supported hook events
 *
 * - sessionStart: Fired when a session begins
 * - sessionEnd: Fired when a session ends or goes idle
 * - preToolUse: Fired before tool execution (log only, cannot block)
 * - postToolUse: Fired after tool execution completes
 * - errorOccurred: Fired when an error is encountered
 * - agentSwitch: Fired when switching between agents
 * - todoUpdated: Fired when a todo item is updated
 * - fileChanged: Fired when a file is modified
 */
export type HookEvent =
  | "sessionStart"
  | "sessionEnd"
  | "preToolUse"
  | "postToolUse"
  | "errorOccurred"
  | "agentSwitch"
  | "todoUpdated"
  | "fileChanged";

/**
 * Hook handler function type
 */
export type HookHandler = (context: HookContext) => Promise<HookResult>;

/**
 * Hook definition
 */
export interface HookDefinition {
  /**
   * Unique hook name (e.g., "todo-continuation-enforcer")
   */
  name: string;

  /**
   * Event that triggers this hook
   */
  event: HookEvent;

  /**
   * Priority order (lower = earlier execution)
   * Default: 100
   */
  priority: number;

  /**
   * Whether the hook is enabled
   */
  enabled: boolean;

  /**
   * Hook handler function
   */
  handler: HookHandler;

  /**
   * Optional configuration for the hook
   */
  config?: Record<string, unknown>;
}

/**
 * Context passed to hook handlers
 */
export interface HookContext {
  /**
   * The event that triggered this hook
   */
  event: HookEvent;

  /**
   * Unique session identifier
   */
  sessionId: string;

  /**
   * Current agent name (if applicable)
   */
  agentName?: string;

  /**
   * Tool name (for tool-related events)
   */
  toolName?: string;

  /**
   * Tool execution result (for postToolUse event)
   */
  toolResult?: unknown;

  /**
   * Error object (for errorOccurred event)
   */
  error?: Error;

  /**
   * Timestamp when the event occurred
   */
  timestamp: Date;

  /**
   * Additional metadata
   */
  metadata: Record<string, unknown>;
}

/**
 * Result returned by hook handlers
 */
export interface HookResult {
  /**
   * Action to take after hook execution
   * - continue: Proceed normally
   * - log: Log a message
   * - notify: Send a notification/message injection
   */
  action: "continue" | "log" | "notify";

  /**
   * Optional message (for log/notify actions)
   */
  message?: string;

  /**
   * Optional data to pass along
   */
  data?: unknown;
}

/**
 * Hook registry options
 */
export interface HookRegistryOptions {
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Hook execution result (internal)
 */
export interface HookExecutionResult {
  /**
   * Hook name
   */
  hookName: string;

  /**
   * Whether execution succeeded
   */
  success: boolean;

  /**
   * Hook result (if successful)
   */
  result?: HookResult;

  /**
   * Error (if failed)
   */
  error?: Error;

  /**
   * Execution time in milliseconds
   */
  durationMs: number;
}

/**
 * Configuration for hooks from config.yml
 */
export interface HookConfig {
  /**
   * Whether hooks are enabled globally
   */
  enabled: boolean;

  /**
   * Individual hook configurations by name
   */
  hooks?: Record<
    string,
    {
      enabled?: boolean;
      priority?: number;
      config?: Record<string, unknown>;
    }
  >;
}

/**
 * Todo item type (for todo-related hooks)
 */
export interface Todo {
  content: string;
  activeForm: string;
  status: "pending" | "in_progress" | "completed";
}
