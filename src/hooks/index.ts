/**
 * Hook System
 *
 * Event-driven hook infrastructure for behavioral hooks with priority ordering.
 *
 * @version 5.0.0
 * @author Yoyo Dev Team
 *
 * @example
 * ```typescript
 * import { hookRegistry, initializeHooksFromConfig } from './hooks';
 *
 * // Initialize hooks from config.yml
 * initializeHooksFromConfig();
 *
 * // Register a custom hook
 * hookRegistry.register({
 *   name: 'my-hook',
 *   event: 'sessionStart',
 *   priority: 50,
 *   enabled: true,
 *   handler: async (context) => {
 *     console.log('Session started:', context.sessionId);
 *     return { action: 'continue' };
 *   },
 * });
 *
 * // Execute hooks for an event
 * await hookRegistry.execute('sessionStart', {
 *   sessionId: 'abc',
 *   timestamp: new Date(),
 *   metadata: {},
 * });
 * ```
 */

// Core types
export type {
  HookEvent,
  HookHandler,
  HookDefinition,
  HookContext,
  HookResult,
  HookRegistryOptions,
  HookExecutionResult,
  HookConfig,
  Todo,
} from "./types.js";

// Registry
export { HookRegistry, hookRegistry } from "./registry.js";

// Configuration
export {
  loadHookConfig,
  applyHookConfig,
  initializeHooksFromConfig,
  getDefaultHookConfig,
} from "./config.js";

// Built-in hooks
export {
  todoContinuationHook,
  todoUpdatedHook,
  createTodoContinuationHook,
  clearSessionState,
  clearAllSessionStates,
  type TodoContinuationConfig,
} from "./builtin/todo-continuation.js";

// Legacy exports (for backward compatibility)
export {
  todoContinuationEnforcer,
  initializeTodoContinuation,
  triggerTodoContinuation,
  cleanup,
  getConfig,
  updateConfig,
} from "./todo-continuation-enforcer.js";
