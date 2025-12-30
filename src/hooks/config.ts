/**
 * Hook Configuration Loader
 *
 * Loads hook configuration from .yoyo-dev/config.yml and applies
 * settings to registered hooks.
 *
 * @version 5.0.0
 * @author Yoyo Dev Team
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { HookConfig, HookDefinition } from "./types.js";
import { hookRegistry } from "./registry.js";

/**
 * Parse YAML content (simple parser for hook config)
 *
 * Note: For full YAML support, use js-yaml package.
 * This is a lightweight parser for basic hook config.
 */
function parseYamlConfig(content: string): Record<string, unknown> {
  try {
    // Try to dynamically import js-yaml if available
    // Fall back to simple parsing for basic cases
    const lines = content.split("\n");
    const result: Record<string, unknown> = {};
    let currentSection = "";

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith("#") || line.trim() === "") {
        continue;
      }

      const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
      if (match) {
        const [, spaces, key, value] = match;
        const currentIndent = spaces?.length ?? 0;

        if (currentIndent === 0) {
          currentSection = key ?? "";
          if (value && value.trim()) {
            result[currentSection] = value.trim();
          } else {
            result[currentSection] = {};
          }
        } else if (currentIndent > 0 && currentSection) {
          const section = result[currentSection];
          if (typeof section === "object" && section !== null) {
            (section as Record<string, unknown>)[key ?? ""] = parseValue(value ?? "");
          }
        }
      }
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Parse a YAML value
 */
function parseValue(value: string): unknown {
  const trimmed = value.trim();

  // Boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== "") return num;

  // String (remove quotes if present)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed || undefined;
}

/**
 * Default hook configuration
 */
const DEFAULT_HOOK_CONFIG: HookConfig = {
  enabled: true,
  hooks: {
    "todo-continuation-enforcer": {
      enabled: true,
      priority: 10,
      config: {
        cooldownPeriod: 3000,
        countdownDelay: 2000,
        includeDetails: true,
      },
    },
    "todo-update-tracker": {
      enabled: true,
      priority: 50,
    },
  },
};

/**
 * Load hook configuration from config.yml
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Hook configuration
 */
export function loadHookConfig(projectRoot?: string): HookConfig {
  const root = projectRoot ?? process.cwd();
  const configPath = join(root, ".yoyo-dev", "config.yml");

  if (!existsSync(configPath)) {
    console.log("[HookConfig] No config.yml found, using defaults");
    return DEFAULT_HOOK_CONFIG;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = parseYamlConfig(content);

    // Extract hooks section
    const hooksConfig = extractHooksConfig(config);

    console.log("[HookConfig] Loaded configuration from config.yml");
    return hooksConfig;
  } catch (error) {
    console.error("[HookConfig] Failed to load config.yml:", error);
    return DEFAULT_HOOK_CONFIG;
  }
}

/**
 * Extract hooks configuration from parsed YAML
 */
function extractHooksConfig(config: Record<string, unknown>): HookConfig {
  // Check for workflows.task_execution.todo_continuation
  const workflows = config.workflows as Record<string, unknown> | undefined;
  const taskExecution = workflows?.task_execution as Record<string, unknown> | undefined;
  const todoContinuation = taskExecution?.todo_continuation as Record<string, unknown> | undefined;

  // Check for direct hooks section
  const hooks = config.hooks as Record<string, unknown> | undefined;

  const result: HookConfig = {
    enabled: true,
    hooks: {},
  };

  // Apply todo continuation config
  if (todoContinuation) {
    result.hooks = result.hooks ?? {};
    result.hooks["todo-continuation-enforcer"] = {
      enabled: todoContinuation.enabled !== false,
      priority: 10,
      config: {
        cooldownPeriod: (todoContinuation.cooldown as number) ?? 3000,
        countdownDelay: 2000,
        includeDetails: true,
      },
    };
  }

  // Apply direct hooks config (if any)
  if (hooks && typeof hooks === "object") {
    for (const [hookName, hookConfig] of Object.entries(hooks)) {
      if (typeof hookConfig === "object" && hookConfig !== null) {
        const hc = hookConfig as Record<string, unknown>;
        result.hooks = result.hooks ?? {};
        result.hooks[hookName] = {
          enabled: hc.enabled !== false,
          priority: (hc.priority as number) ?? 100,
          config: (hc.config as Record<string, unknown>) ?? undefined,
        };
      }
    }
  }

  return result;
}

/**
 * Apply hook configuration to registered hooks
 *
 * Updates enabled state and priority of hooks based on config.
 *
 * @param config - Hook configuration to apply
 */
export function applyHookConfig(config: HookConfig): void {
  if (!config.enabled) {
    // Disable all hooks
    for (const hook of hookRegistry.listAll()) {
      hookRegistry.disable(hook.name);
    }
    console.log("[HookConfig] All hooks disabled by configuration");
    return;
  }

  // Apply individual hook settings
  if (config.hooks) {
    for (const [hookName, hookSettings] of Object.entries(config.hooks)) {
      const hook = hookRegistry.get(hookName);
      if (!hook) {
        console.log(`[HookConfig] Hook not found: ${hookName}`);
        continue;
      }

      // Update enabled state
      if (hookSettings.enabled === false) {
        hookRegistry.disable(hookName);
        console.log(`[HookConfig] Disabled hook: ${hookName}`);
      } else {
        hookRegistry.enable(hookName);
      }

      // Update priority (requires re-registration)
      if (hookSettings.priority !== undefined && hookSettings.priority !== hook.priority) {
        const updatedHook: HookDefinition = {
          ...hook,
          priority: hookSettings.priority,
        };
        hookRegistry.register(updatedHook);
        console.log(`[HookConfig] Updated priority for ${hookName}: ${hookSettings.priority}`);
      }

      // Update config
      if (hookSettings.config && hook.config) {
        Object.assign(hook.config, hookSettings.config);
        console.log(`[HookConfig] Updated config for ${hookName}`);
      }
    }
  }
}

/**
 * Initialize hooks from configuration
 *
 * Loads config and applies it to the hook registry.
 * Call this during application startup.
 *
 * @param projectRoot - Project root directory
 */
export function initializeHooksFromConfig(projectRoot?: string): void {
  const config = loadHookConfig(projectRoot);
  applyHookConfig(config);
  console.log("[HookConfig] Hooks initialized from configuration");
}

/**
 * Get default hook configuration
 */
export function getDefaultHookConfig(): HookConfig {
  return { ...DEFAULT_HOOK_CONFIG };
}
