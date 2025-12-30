/**
 * Hook Registry
 *
 * Event-driven registry for behavioral hooks with priority ordering.
 * Hooks can observe and react to events but cannot block tool execution.
 *
 * @version 5.0.0
 * @author Yoyo Dev Team
 */

import type {
  HookDefinition,
  HookEvent,
  HookContext,
  HookExecutionResult,
  HookRegistryOptions,
} from "./types.js";

/**
 * Hook Registry
 *
 * Manages registration and execution of hooks for various events.
 * Hooks execute in priority order (lower priority number = earlier execution).
 *
 * @example
 * ```typescript
 * import { hookRegistry } from './registry.js';
 *
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
 * await hookRegistry.execute('sessionStart', { sessionId: 'abc', timestamp: new Date(), metadata: {} });
 * ```
 */
export class HookRegistry {
  /**
   * Map of hook name to hook definition
   */
  private hooks: Map<string, HookDefinition> = new Map();

  /**
   * Index of hooks by event type for fast lookup
   */
  private hooksByEvent: Map<HookEvent, Set<string>> = new Map();

  /**
   * Registry options
   */
  private options: HookRegistryOptions;

  constructor(options: HookRegistryOptions = {}) {
    this.options = options;
  }

  /**
   * Register a hook
   *
   * If a hook with the same name already exists, it will be replaced.
   *
   * @param hook - Hook definition to register
   */
  register(hook: HookDefinition): void {
    // If hook with same name exists, unregister it first
    if (this.hooks.has(hook.name)) {
      this.unregister(hook.name);
    }

    // Store the hook
    this.hooks.set(hook.name, hook);

    // Index by event type
    if (!this.hooksByEvent.has(hook.event)) {
      this.hooksByEvent.set(hook.event, new Set());
    }
    this.hooksByEvent.get(hook.event)!.add(hook.name);

    if (this.options.debug) {
      console.log(`[HookRegistry] Registered hook: ${hook.name} for event: ${hook.event}`);
    }
  }

  /**
   * Unregister a hook by name
   *
   * @param name - Name of the hook to unregister
   * @returns True if the hook was found and removed, false otherwise
   */
  unregister(name: string): boolean {
    const hook = this.hooks.get(name);
    if (!hook) {
      return false;
    }

    // Remove from main map
    this.hooks.delete(name);

    // Remove from event index
    const eventHooks = this.hooksByEvent.get(hook.event);
    if (eventHooks) {
      eventHooks.delete(name);
      if (eventHooks.size === 0) {
        this.hooksByEvent.delete(hook.event);
      }
    }

    if (this.options.debug) {
      console.log(`[HookRegistry] Unregistered hook: ${name}`);
    }

    return true;
  }

  /**
   * Execute all hooks for an event
   *
   * Hooks execute in priority order (lower priority = earlier).
   * Execution continues even if individual hooks fail.
   *
   * @param event - Event type to trigger
   * @param context - Context to pass to hooks (event field added automatically)
   * @returns Array of execution results
   */
  async execute(
    event: HookEvent,
    context: Omit<HookContext, "event">
  ): Promise<HookExecutionResult[]> {
    const results: HookExecutionResult[] = [];
    const hooks = this.getByEvent(event);

    // Filter to enabled hooks only
    const enabledHooks = hooks.filter((hook) => hook.enabled);

    // Build full context with event
    const fullContext: HookContext = {
      ...context,
      event,
    };

    // Execute hooks sequentially in priority order
    for (const hook of enabledHooks) {
      const startTime = Date.now();

      try {
        const result = await hook.handler(fullContext);
        results.push({
          hookName: hook.name,
          success: true,
          result,
          durationMs: Date.now() - startTime,
        });

        if (this.options.debug) {
          console.log(
            `[HookRegistry] Hook ${hook.name} executed successfully:`,
            result.action
          );
        }
      } catch (error) {
        const hookError = error instanceof Error ? error : new Error(String(error));
        results.push({
          hookName: hook.name,
          success: false,
          error: hookError,
          durationMs: Date.now() - startTime,
        });

        // Log error but continue execution
        console.error(
          `[HookRegistry] Hook ${hook.name} failed:`,
          hookError.message
        );
      }
    }

    return results;
  }

  /**
   * Get all hooks for an event, sorted by priority
   *
   * @param event - Event type
   * @returns Array of hook definitions, sorted by priority (lower first)
   */
  getByEvent(event: HookEvent): HookDefinition[] {
    const hookNames = this.hooksByEvent.get(event);
    if (!hookNames || hookNames.size === 0) {
      return [];
    }

    const hooks: HookDefinition[] = [];
    const namesArray = Array.from(hookNames);
    for (const name of namesArray) {
      const hook = this.hooks.get(name);
      if (hook) {
        hooks.push(hook);
      }
    }

    // Sort by priority (lower = earlier), then by registration order (implicit via Map iteration)
    return hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a specific hook by name
   *
   * @param name - Hook name
   * @returns Hook definition or undefined if not found
   */
  get(name: string): HookDefinition | undefined {
    return this.hooks.get(name);
  }

  /**
   * Check if a hook is registered
   *
   * @param name - Hook name
   * @returns True if the hook is registered
   */
  has(name: string): boolean {
    return this.hooks.has(name);
  }

  /**
   * Enable a hook
   *
   * @param name - Hook name
   * @returns True if the hook was found and enabled
   */
  enable(name: string): boolean {
    const hook = this.hooks.get(name);
    if (!hook) {
      return false;
    }
    hook.enabled = true;
    return true;
  }

  /**
   * Disable a hook
   *
   * @param name - Hook name
   * @returns True if the hook was found and disabled
   */
  disable(name: string): boolean {
    const hook = this.hooks.get(name);
    if (!hook) {
      return false;
    }
    hook.enabled = false;
    return true;
  }

  /**
   * List all registered hooks
   *
   * @returns Array of all hook definitions
   */
  listAll(): HookDefinition[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Clear all registered hooks
   */
  clear(): void {
    this.hooks.clear();
    this.hooksByEvent.clear();

    if (this.options.debug) {
      console.log("[HookRegistry] All hooks cleared");
    }
  }

  /**
   * Get registry statistics
   *
   * @returns Object with hook counts by event
   */
  getStats(): Record<HookEvent, number> {
    const stats: Partial<Record<HookEvent, number>> = {};

    const entries = Array.from(this.hooksByEvent.entries());
    for (const [event, hookNames] of entries) {
      stats[event] = hookNames.size;
    }

    return stats as Record<HookEvent, number>;
  }
}

/**
 * Singleton hook registry instance
 *
 * Use this for the default registry shared across the application.
 */
export const hookRegistry = new HookRegistry();
