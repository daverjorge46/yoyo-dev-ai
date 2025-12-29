/**
 * Todo Continuation Enforcer Hook
 *
 * Automatically prompts the agent to continue working when session goes idle
 * but incomplete todos remain in the todo list.
 *
 * @version 5.0.0
 * @author Yoyo Dev Team
 */

interface Todo {
  content: string;
  activeForm: string;
  status: "pending" | "in_progress" | "completed";
}

interface HookContext {
  sessionId: string;
  event: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

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
 * Get current todos from the session context
 * In production, this would read from the actual todo store
 */
function getCurrentTodos(sessionId: string): Todo[] {
  // TODO: Integrate with actual todo storage system
  // For now, return empty array (will be implemented with todo store integration)
  return [];
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

  const message = `
[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list:
- ${inProgressCount} in progress
- ${pendingCount} pending

Next incomplete task:
${incompleteTodos[0].content}

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

  // TODO: Integrate with Claude Code session message injection API
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
 * Hook handler for session events
 *
 * Listens for session.idle events and triggers todo continuation if needed
 */
export async function todoContinuationEnforcer(
  context: HookContext
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
  const todos = getCurrentTodos(sessionId);

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
 * Cleanup function to clear all timers (call on shutdown)
 */
export function cleanup(): void {
  for (const [sessionId, timer] of countdownTimers.entries()) {
    clearTimeout(timer);
    console.log(
      `[Todo Continuation] Cleaned up timer for session ${sessionId}`
    );
  }
  countdownTimers.clear();
  lastInjectionTimes.clear();
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

// Export types
export type { Todo, HookContext };
