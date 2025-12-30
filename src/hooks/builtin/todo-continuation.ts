/**
 * Todo Continuation Hook
 *
 * Built-in hook that notifies when incomplete todos remain at session end.
 * This implements the "todo continuation enforcer" pattern as a proper hook.
 *
 * @version 5.0.0
 * @author Yoyo Dev Team
 */

import type {
  HookDefinition,
  HookContext,
  HookResult,
  Todo,
} from "../types.js";

/**
 * Configuration for the todo continuation hook
 */
export interface TodoContinuationConfig {
  /**
   * Cooldown period between notifications (milliseconds)
   * Default: 3000
   */
  cooldownPeriod: number;

  /**
   * Countdown delay before injecting message (milliseconds)
   * Default: 2000
   */
  countdownDelay: number;

  /**
   * Whether to include detailed todo list in notification
   * Default: true
   */
  includeDetails: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TodoContinuationConfig = {
  cooldownPeriod: 3000,
  countdownDelay: 2000,
  includeDetails: true,
};

/**
 * Session state tracking
 */
interface SessionState {
  lastNotificationTime: number;
  pendingCountdown: NodeJS.Timeout | null;
}

/**
 * Session state map
 */
const sessionStates = new Map<string, SessionState>();

/**
 * Get or create session state
 */
function getSessionState(sessionId: string): SessionState {
  let state = sessionStates.get(sessionId);
  if (!state) {
    state = {
      lastNotificationTime: 0,
      pendingCountdown: null,
    };
    sessionStates.set(sessionId, state);
  }
  return state;
}

/**
 * Clear session state
 */
export function clearSessionState(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state?.pendingCountdown) {
    clearTimeout(state.pendingCountdown);
  }
  sessionStates.delete(sessionId);
}

/**
 * Clear all session states
 */
export function clearAllSessionStates(): void {
  const sessionIds = Array.from(sessionStates.keys());
  for (const sessionId of sessionIds) {
    clearSessionState(sessionId);
  }
}

/**
 * Get todos from session metadata
 *
 * The actual todo data should be passed via context.metadata.todos
 */
function getTodosFromContext(context: HookContext): Todo[] {
  const todos = context.metadata?.todos;
  if (Array.isArray(todos)) {
    return todos as Todo[];
  }
  return [];
}

/**
 * Check if there are incomplete todos
 */
function hasIncompleteTodos(todos: Todo[]): boolean {
  return todos.some(
    (todo) => todo.status === "pending" || todo.status === "in_progress"
  );
}

/**
 * Build notification message for incomplete todos
 */
function buildNotificationMessage(todos: Todo[], includeDetails: boolean): string {
  const incompleteTodos = todos.filter(
    (todo) => todo.status === "pending" || todo.status === "in_progress"
  );

  const pendingCount = incompleteTodos.filter((t) => t.status === "pending").length;
  const inProgressCount = incompleteTodos.filter((t) => t.status === "in_progress").length;

  const lines: string[] = [
    "[SYSTEM REMINDER - TODO CONTINUATION]",
    "",
    "Incomplete tasks remain in your todo list:",
    `- ${inProgressCount} in progress`,
    `- ${pendingCount} pending`,
  ];

  if (includeDetails && incompleteTodos.length > 0) {
    lines.push("");
    lines.push("Next incomplete task:");
    lines.push(incompleteTodos[0]?.content ?? "");
  }

  lines.push("");
  lines.push("**Action Required:**");
  lines.push("1. Continue working on the next pending task");
  lines.push("2. Mark each task complete when finished");
  lines.push("3. Do not stop until all tasks are done");
  lines.push("");
  lines.push("**Rules:**");
  lines.push("- Proceed without asking for permission");
  lines.push("- Mark todos complete IMMEDIATELY after finishing (not batched)");
  lines.push("- Only ONE todo should be in_progress at a time");
  lines.push("- If you encounter failures, apply failure recovery protocol");
  lines.push("");
  lines.push("Continue now.");

  return lines.join("\n");
}

/**
 * Todo continuation hook handler
 */
async function todoContinuationHandler(context: HookContext): Promise<HookResult> {
  const config = {
    ...DEFAULT_CONFIG,
    ...(context.metadata?.hookConfig as Partial<TodoContinuationConfig>),
  };

  const { sessionId } = context;
  const state = getSessionState(sessionId);

  // Get todos from context
  const todos = getTodosFromContext(context);

  // Check if there are incomplete todos
  if (!hasIncompleteTodos(todos)) {
    return {
      action: "continue",
      message: "No incomplete todos",
    };
  }

  // Check cooldown
  const now = Date.now();
  const timeSinceLastNotification = now - state.lastNotificationTime;

  if (timeSinceLastNotification < config.cooldownPeriod) {
    return {
      action: "continue",
      message: `Cooldown active (${config.cooldownPeriod - timeSinceLastNotification}ms remaining)`,
    };
  }

  // Update notification time
  state.lastNotificationTime = now;

  // Build notification message
  const message = buildNotificationMessage(todos, config.includeDetails);

  return {
    action: "notify",
    message,
    data: {
      incompleteCount: todos.filter(
        (t) => t.status === "pending" || t.status === "in_progress"
      ).length,
      pendingCount: todos.filter((t) => t.status === "pending").length,
      inProgressCount: todos.filter((t) => t.status === "in_progress").length,
    },
  };
}

/**
 * Todo continuation hook definition
 *
 * Registers for sessionEnd event to check for incomplete todos.
 */
export const todoContinuationHook: HookDefinition = {
  name: "todo-continuation-enforcer",
  event: "sessionEnd",
  priority: 10, // High priority - execute early
  enabled: true,
  handler: todoContinuationHandler,
  config: DEFAULT_CONFIG as unknown as Record<string, unknown>,
};

/**
 * Create a todo continuation hook with custom configuration
 */
export function createTodoContinuationHook(
  config: Partial<TodoContinuationConfig> = {}
): HookDefinition {
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  return {
    ...todoContinuationHook,
    config: mergedConfig as unknown as Record<string, unknown>,
  };
}

/**
 * Todo updated hook - alternative hook for todoUpdated event
 *
 * Can be used to track todo progress in real-time.
 */
export const todoUpdatedHook: HookDefinition = {
  name: "todo-update-tracker",
  event: "todoUpdated",
  priority: 50,
  enabled: true,
  handler: async (context: HookContext): Promise<HookResult> => {
    const todo = context.metadata?.todo as Todo | undefined;

    if (!todo) {
      return { action: "continue" };
    }

    // Log todo updates for debugging
    return {
      action: "log",
      message: `Todo updated: ${todo.content} -> ${todo.status}`,
      data: { todo },
    };
  },
};
