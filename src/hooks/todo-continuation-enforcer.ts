/**
 * Todo Continuation Enforcer Hook
 *
 * Automatically prompts the agent to continue working when session goes idle
 * but incomplete todos remain in the todo list.
 *
 * This module has been refactored to use the new hook registry system.
 * The core functionality is now in builtin/todo-continuation.ts.
 *
 * @version 5.0.0
 * @author Yoyo Dev Team
 */

import { hookRegistry } from "./registry.js";
import {
  todoContinuationHook,
  todoUpdatedHook,
  createTodoContinuationHook,
  clearSessionState,
  clearAllSessionStates,
  type TodoContinuationConfig,
} from "./builtin/todo-continuation.js";
import type { Todo, HookContext, HookResult } from "./types.js";

// Re-export types for backward compatibility
export type { Todo, HookContext, HookResult, TodoContinuationConfig };

// =============================================================================
// Legacy Interface (for backward compatibility)
// =============================================================================

// Cooldown tracking: session ID -> last injection timestamp
const lastInjectionTimes = new Map<string, number>();

// Countdown timer tracking: session ID -> timer ID
const countdownTimers = new Map<string, NodeJS.Timeout>();

// Configuration
const CONFIG = {
  COUNTDOWN_DELAY: 2000, // 2 seconds before injection
  COOLDOWN_PERIOD: 3000, // 3 seconds between injections
  IDLE_EVENT: "session.idle",
  MIN_IDLE_TIME: 1000, // Minimum idle time before considering (1 second)
};

/**
 * Initialize the todo continuation enforcer
 *
 * Registers the hook with the global hook registry.
 * Call this once during application startup.
 *
 * @param config - Optional configuration overrides
 */
export function initializeTodoContinuation(
  config?: Partial<TodoContinuationConfig>
): void {
  // Create hook with optional config
  const hook = config
    ? createTodoContinuationHook(config)
    : todoContinuationHook;

  // Register with global registry
  hookRegistry.register(hook);

  // Also register the todo update tracker
  hookRegistry.register(todoUpdatedHook);

  console.log("[Todo Continuation] Initialized with hook registry");
}

/**
 * Check if there are incomplete todos (pending or in_progress)
 */
function hasIncompleteTodos(todos: Todo[]): boolean {
  return todos.some(
    (todo) => todo.status === "pending" || todo.status === "in_progress"
  );
}

/**
 * Check if cooldown period has passed since last injection
 */
function isCooldownExpired(sessionId: string): boolean {
  const lastInjection = lastInjectionTimes.get(sessionId);
  if (!lastInjection) {
    return true;
  }

  const elapsed = Date.now() - lastInjection;
  return elapsed >= CONFIG.COOLDOWN_PERIOD;
}

/**
 * Inject continuation message into the session
 */
async function injectContinuationMessage(
  sessionId: string,
  todos: Todo[]
): Promise<void> {
  const incompleteTodos = todos.filter(
    (todo) => todo.status === "pending" || todo.status === "in_progress"
  );

  const pendingCount = incompleteTodos.filter(
    (t) => t.status === "pending"
  ).length;
  const inProgressCount = incompleteTodos.filter(
    (t) => t.status === "in_progress"
  ).length;

  const firstTodo = incompleteTodos[0];
  const message = `
[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list:
- ${inProgressCount} in progress
- ${pendingCount} pending

Next incomplete task:
${firstTodo?.content ?? "No task content"}

**Action Required:**
1. Continue working on the next pending task
2. Mark each task complete when finished
3. Do not stop until all tasks are done

**Rules:**
- Proceed without asking for permission
- Mark todos complete IMMEDIATELY after finishing (not batched)
- Only ONE todo should be in_progress at a time
- If you encounter failures, apply failure recovery protocol

Continue now.
`.trim();

  // Execute via hook registry
  await hookRegistry.execute("sessionEnd", {
    sessionId,
    timestamp: new Date(),
    metadata: {
      todos,
      triggerSource: "legacy-enforcer",
    },
  });

  // Also log for debugging
  console.log(`[Todo Continuation] Injecting message to session ${sessionId}`);
  console.log(message);

  // Update last injection time
  lastInjectionTimes.set(sessionId, Date.now());
}

/**
 * Start countdown timer for message injection
 */
function startCountdown(sessionId: string, todos: Todo[]): void {
  // Clear any existing countdown for this session
  const existingTimer = countdownTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  console.log(
    `[Todo Continuation] Starting ${CONFIG.COUNTDOWN_DELAY}ms countdown for session ${sessionId}`
  );

  const timer = setTimeout(() => {
    console.log(
      `[Todo Continuation] Countdown expired, injecting message to session ${sessionId}`
    );
    injectContinuationMessage(sessionId, todos);
    countdownTimers.delete(sessionId);
  }, CONFIG.COUNTDOWN_DELAY);

  countdownTimers.set(sessionId, timer);
}

/**
 * Cancel countdown timer (if session becomes active again)
 */
function cancelCountdown(sessionId: string): void {
  const timer = countdownTimers.get(sessionId);
  if (timer) {
    console.log(
      `[Todo Continuation] Cancelling countdown for session ${sessionId}`
    );
    clearTimeout(timer);
    countdownTimers.delete(sessionId);
  }
}

/**
 * Get current todos from the session context
 *
 * @param sessionId - Session ID to get todos for
 * @param todoProvider - Optional function to get todos from external source
 * @returns Array of todos
 */
function getCurrentTodos(
  sessionId: string,
  todoProvider?: (sessionId: string) => Todo[]
): Todo[] {
  if (todoProvider) {
    return todoProvider(sessionId);
  }
  // Default: return empty array (integration point for todo store)
  return [];
}

/**
 * Legacy hook context interface (for backward compatibility)
 */
interface LegacyHookContext {
  sessionId: string;
  event: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Legacy hook handler for session events
 *
 * @deprecated Use hookRegistry.execute() with sessionEnd event instead
 *
 * Listens for session.idle events and triggers todo continuation if needed.
 * This is kept for backward compatibility with existing code.
 */
export async function todoContinuationEnforcer(
  context: LegacyHookContext,
  todoProvider?: (sessionId: string) => Todo[]
): Promise<void> {
  const { sessionId, event, timestamp } = context;

  // Only handle idle events
  if (event !== CONFIG.IDLE_EVENT) {
    // Cancel countdown if session becomes active
    if (event === "session.active" || event === "tool.execute") {
      cancelCountdown(sessionId);
    }
    return;
  }

  console.log(
    `[Todo Continuation] Session ${sessionId} idle at ${timestamp.toISOString()}`
  );

  // Get current todos
  const todos = getCurrentTodos(sessionId, todoProvider);

  // Check if there are incomplete todos
  if (!hasIncompleteTodos(todos)) {
    console.log(
      `[Todo Continuation] No incomplete todos for session ${sessionId}, skipping`
    );
    return;
  }

  // Check cooldown period
  if (!isCooldownExpired(sessionId)) {
    console.log(
      `[Todo Continuation] Cooldown active for session ${sessionId}, skipping`
    );
    return;
  }

  // Start countdown before injection
  startCountdown(sessionId, todos);
}

/**
 * Trigger todo continuation check via hook registry
 *
 * This is the preferred way to trigger todo continuation checks.
 *
 * @param sessionId - Session ID
 * @param todos - Current todos
 */
export async function triggerTodoContinuation(
  sessionId: string,
  todos: Todo[]
): Promise<HookResult[]> {
  const results = await hookRegistry.execute("sessionEnd", {
    sessionId,
    timestamp: new Date(),
    metadata: { todos },
  });

  return results
    .filter((r) => r.success && r.result)
    .map((r) => r.result!);
}

/**
 * Cleanup function to clear all timers (call on shutdown)
 */
export function cleanup(): void {
  // Clear legacy timers
  const timerEntries = Array.from(countdownTimers.entries());
  for (const [sessionId, timer] of timerEntries) {
    clearTimeout(timer);
    console.log(
      `[Todo Continuation] Cleaned up timer for session ${sessionId}`
    );
  }
  countdownTimers.clear();
  lastInjectionTimes.clear();

  // Clear new registry session states
  clearAllSessionStates();

  // Unregister hooks from registry
  hookRegistry.unregister("todo-continuation-enforcer");
  hookRegistry.unregister("todo-update-tracker");

  console.log("[Todo Continuation] Cleanup complete");
}

/**
 * Get hook configuration
 */
export function getConfig() {
  return { ...CONFIG };
}

/**
 * Update hook configuration (for testing)
 */
export function updateConfig(updates: Partial<typeof CONFIG>): void {
  Object.assign(CONFIG, updates);
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export {
  todoContinuationHook,
  todoUpdatedHook,
  createTodoContinuationHook,
  clearSessionState,
  clearAllSessionStates,
};
