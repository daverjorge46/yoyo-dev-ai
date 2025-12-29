/**
 * Cycle Detector
 *
 * Prevents infinite agent delegation loops by tracking call stacks
 * and detecting cycles (A→B→A) or excessive depth.
 */

/**
 * Agent call stack entry
 */
export interface CallStackEntry {
  /** Agent name that was called */
  agent: string;

  /** Agent that made the call */
  caller: string;

  /** Timestamp when call was made */
  timestamp: Date;

  /** Session ID */
  sessionId: string;
}

/**
 * Call stack per session
 */
const sessionCallStacks = new Map<string, CallStackEntry[]>();

/**
 * Maximum call depth (prevent excessive delegation)
 */
const MAX_CALL_DEPTH = 5;

/**
 * Cycle detection result
 */
export interface CycleDetectionResult {
  /** Whether a cycle was detected */
  hasCycle: boolean;

  /** Type of cycle if detected */
  cycleType?: "direct_recursion" | "delegation_loop" | "max_depth_exceeded";

  /** Call path that forms the cycle */
  cyclePath?: string[];

  /** Detailed error message */
  message?: string;
}

/**
 * Initialize call stack for a session
 *
 * @param sessionId - Session ID to initialize
 */
export function initializeCallStack(sessionId: string): void {
  if (!sessionCallStacks.has(sessionId)) {
    sessionCallStacks.set(sessionId, []);
  }
}

/**
 * Get current call stack for a session
 *
 * @param sessionId - Session ID
 * @returns Call stack entries
 */
export function getCallStack(sessionId: string): CallStackEntry[] {
  return sessionCallStacks.get(sessionId) || [];
}

/**
 * Clear call stack for a session (cleanup on completion)
 *
 * @param sessionId - Session ID to clear
 */
export function clearCallStack(sessionId: string): void {
  sessionCallStacks.delete(sessionId);
}

/**
 * Detect if calling an agent would create a cycle
 *
 * @param sessionId - Current session ID
 * @param caller - Agent making the call
 * @param callee - Agent being called
 * @returns Cycle detection result
 *
 * @example
 * // A→A (direct recursion)
 * detectCycle(sessionId, "oracle", "oracle")
 * // { hasCycle: true, cycleType: "direct_recursion", ... }
 *
 * // A→B→A (delegation loop)
 * // Stack: [oracle, librarian]
 * detectCycle(sessionId, "librarian", "oracle")
 * // { hasCycle: true, cycleType: "delegation_loop", cyclePath: ["oracle", "librarian", "oracle"], ... }
 */
export function detectCycle(
  sessionId: string,
  caller: string,
  callee: string
): CycleDetectionResult {
  // 1. Initialize stack if needed
  initializeCallStack(sessionId);

  const stack = getCallStack(sessionId);

  // 2. Check for direct recursion (A→A)
  if (caller === callee) {
    return {
      hasCycle: true,
      cycleType: "direct_recursion",
      cyclePath: [caller, callee],
      message: `Agent '${caller}' attempted to call itself - direct recursion prevented`,
    };
  }

  // 3. Check current call depth
  if (stack.length >= MAX_CALL_DEPTH) {
    const path = stack.map((entry) => entry.agent);
    return {
      hasCycle: true,
      cycleType: "max_depth_exceeded",
      cyclePath: [...path, callee],
      message: `Maximum call depth (${MAX_CALL_DEPTH}) exceeded. Call path: ${path.join(" → ")} → ${callee}`,
    };
  }

  // 4. Check for delegation loop (A→B→...→A)
  const agentsInStack = stack.map((entry) => entry.agent);

  if (agentsInStack.includes(callee)) {
    // Found callee in stack - this would create a cycle
    const cycleStartIndex = agentsInStack.indexOf(callee);
    const cyclePath = [
      ...agentsInStack.slice(cycleStartIndex),
      callee, // Complete the cycle
    ];

    return {
      hasCycle: true,
      cycleType: "delegation_loop",
      cyclePath,
      message: `Delegation cycle detected: ${cyclePath.join(" → ")}`,
    };
  }

  // 5. No cycle detected
  return {
    hasCycle: false,
  };
}

/**
 * Push agent call onto stack
 *
 * @param sessionId - Session ID
 * @param caller - Agent making the call
 * @param callee - Agent being called
 */
export function pushCall(
  sessionId: string,
  caller: string,
  callee: string
): void {
  initializeCallStack(sessionId);

  const stack = sessionCallStacks.get(sessionId)!;
  stack.push({
    agent: callee,
    caller,
    timestamp: new Date(),
    sessionId,
  });
}

/**
 * Pop agent call from stack (on completion)
 *
 * @param sessionId - Session ID
 * @returns Popped call stack entry, or undefined if stack empty
 */
export function popCall(sessionId: string): CallStackEntry | undefined {
  const stack = sessionCallStacks.get(sessionId);
  if (!stack || stack.length === 0) {
    return undefined;
  }

  return stack.pop();
}

/**
 * Get current call depth for a session
 *
 * @param sessionId - Session ID
 * @returns Current call depth
 */
export function getCallDepth(sessionId: string): number {
  const stack = getCallStack(sessionId);
  return stack.length;
}

/**
 * Get call path as string (for error messages)
 *
 * @param sessionId - Session ID
 * @returns Call path string (e.g., "yoyo-ai → oracle → librarian")
 */
export function getCallPathString(sessionId: string): string {
  const stack = getCallStack(sessionId);
  if (stack.length === 0) {
    return "(empty)";
  }

  return stack.map((entry) => entry.agent).join(" → ");
}

/**
 * Validate agent call before execution
 *
 * @param sessionId - Session ID
 * @param caller - Agent making the call
 * @param callee - Agent being called
 * @throws Error if cycle detected
 */
export function validateAgentCall(
  sessionId: string,
  caller: string,
  callee: string
): void {
  const result = detectCycle(sessionId, caller, callee);

  if (result.hasCycle) {
    throw new Error(
      `Agent delegation cycle detected!\n\n${result.message}\n\nCall path: ${result.cyclePath?.join(" → ")}`
    );
  }
}

/**
 * Execute agent call with automatic cycle detection and stack management
 *
 * @param sessionId - Session ID
 * @param caller - Agent making the call
 * @param callee - Agent being called
 * @param fn - Function to execute if no cycle detected
 * @returns Result of function execution
 */
export async function executeWithCycleDetection<T>(
  sessionId: string,
  caller: string,
  callee: string,
  fn: () => Promise<T>
): Promise<T> {
  // 1. Validate no cycle
  validateAgentCall(sessionId, caller, callee);

  // 2. Push call onto stack
  pushCall(sessionId, caller, callee);

  try {
    // 3. Execute function
    const result = await fn();

    // 4. Pop call from stack on success
    popCall(sessionId);

    return result;
  } catch (error) {
    // 5. Pop call from stack on error
    popCall(sessionId);

    // Re-throw error
    throw error;
  }
}

/**
 * Get statistics about call stacks across all sessions
 *
 * @returns Call stack statistics
 */
export function getCallStackStats(): {
  activeSessions: number;
  totalCalls: number;
  maxDepth: number;
  averageDepth: number;
} {
  const sessions = Array.from(sessionCallStacks.values());

  const activeSessions = sessions.length;
  const totalCalls = sessions.reduce((sum, stack) => sum + stack.length, 0);
  const maxDepth = sessions.reduce(
    (max, stack) => Math.max(max, stack.length),
    0
  );
  const averageDepth = activeSessions > 0 ? totalCalls / activeSessions : 0;

  return {
    activeSessions,
    totalCalls,
    maxDepth,
    averageDepth,
  };
}

/**
 * Clear all call stacks (for testing or reset)
 */
export function clearAllCallStacks(): void {
  sessionCallStacks.clear();
}

/**
 * Set maximum call depth (for testing or custom limits)
 *
 * @param depth - New maximum call depth
 */
export function setMaxCallDepth(depth: number): void {
  if (depth < 1) {
    throw new Error("Max call depth must be at least 1");
  }

  // Modify the constant (for runtime configuration)
  Object.defineProperty(exports, "MAX_CALL_DEPTH", {
    value: depth,
    writable: true,
    configurable: true,
  });
}

/**
 * Get maximum call depth
 *
 * @returns Current maximum call depth
 */
export function getMaxCallDepth(): number {
  return MAX_CALL_DEPTH;
}
