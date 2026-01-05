/**
 * CLI Configuration Loader
 *
 * Loads configuration from multiple sources with hierarchy:
 * 1. Default config
 * 2. Global config (~/.yoyo-ai/settings.json)
 * 3. Project config (.yoyo-ai/settings.json)
 * 4. Environment variables
 * 5. CLI arguments
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { CLIArgs, CLIConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

// =============================================================================
// Path Helpers
// =============================================================================

/**
 * Get the global config directory.
 */
export function getGlobalConfigDir(): string {
  return join(homedir(), '.yoyo-ai');
}

/**
 * Get the global settings file path.
 */
export function getGlobalSettingsPath(): string {
  return join(getGlobalConfigDir(), 'settings.json');
}

/**
 * Get the project settings file path.
 *
 * @param cwd - Current working directory
 */
export function getProjectSettingsPath(cwd: string): string {
  return join(cwd, '.yoyo-ai', 'settings.json');
}

// =============================================================================
// Config Loading
// =============================================================================

/**
 * Load JSON config file if it exists.
 *
 * @param path - Path to config file
 * @returns Parsed config or null if file doesn't exist or is invalid
 */
function loadJsonConfig(path: string): Partial<CLIConfig> | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as Partial<CLIConfig>;
  } catch (error) {
    // Log error to help users debug config issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to load config from ${path}: ${errorMessage}`);
    return null;
  }
}

/**
 * Load configuration from environment variables.
 *
 * Environment variables:
 * - YOYO_MODEL: Default model
 * - YOYO_DEBUG: Enable debug mode
 * - YOYO_LOG_LEVEL: Log level
 * - YOYO_API_URL: API base URL
 * - YOYO_NO_COLOR: Disable colors
 *
 * @returns Partial config from environment
 */
function loadEnvConfig(): Partial<CLIConfig> {
  const config: Partial<CLIConfig> = {};

  if (process.env.YOYO_MODEL) {
    config.defaultModel = process.env.YOYO_MODEL;
  }

  if (process.env.YOYO_DEBUG === 'true' || process.env.YOYO_DEBUG === '1') {
    config.debug = {
      ...DEFAULT_CONFIG.debug,
      enabled: true,
    };
  }

  if (process.env.YOYO_LOG_LEVEL) {
    const level = process.env.YOYO_LOG_LEVEL as CLIConfig['debug']['logLevel'];
    if (['error', 'warn', 'info', 'debug'].includes(level)) {
      config.debug = {
        ...DEFAULT_CONFIG.debug,
        ...config.debug,
        logLevel: level,
      };
    }
  }

  if (process.env.YOYO_API_URL) {
    config.api = {
      ...DEFAULT_CONFIG.api,
      baseUrl: process.env.YOYO_API_URL,
    };
  }

  if (process.env.NO_COLOR || process.env.YOYO_NO_COLOR) {
    config.ui = {
      ...DEFAULT_CONFIG.ui,
      colors: false,
    };
  }

  return config;
}

/**
 * Apply CLI arguments to config.
 *
 * @param args - Parsed CLI arguments
 * @returns Partial config from arguments
 */
function loadArgsConfig(args: CLIArgs): Partial<CLIConfig> {
  const config: Partial<CLIConfig> = {};

  if (args.model) {
    config.defaultModel = args.model;
  }

  if (args.verbose) {
    config.debug = {
      ...DEFAULT_CONFIG.debug,
      enabled: true,
      logLevel: 'debug',
    };
  }

  return config;
}

/**
 * Deep merge two config objects.
 *
 * @param base - Base config
 * @param override - Override config
 * @returns Merged config
 */
function deepMerge(base: CLIConfig, override: Partial<CLIConfig>): CLIConfig {
  return {
    defaultModel: override.defaultModel ?? base.defaultModel,
    memory: override.memory ? { ...base.memory, ...override.memory } : base.memory,
    ui: override.ui ? { ...base.ui, ...override.ui } : base.ui,
    api: override.api ? { ...base.api, ...override.api } : base.api,
    debug: override.debug ? { ...base.debug, ...override.debug } : base.debug,
  };
}

/**
 * Load full configuration with hierarchy.
 *
 * Priority (lowest to highest):
 * 1. Default config
 * 2. Global config
 * 3. Project config
 * 4. Environment variables
 * 5. CLI arguments
 *
 * @param args - Parsed CLI arguments
 * @returns Complete configuration
 */
export function loadConfig(args: CLIArgs): CLIConfig {
  // Start with defaults
  let config: CLIConfig = { ...DEFAULT_CONFIG };

  // Load and merge global config
  const globalConfig = loadJsonConfig(getGlobalSettingsPath());
  if (globalConfig) {
    config = deepMerge(config, globalConfig);
  }

  // Load and merge project config
  const projectConfig = loadJsonConfig(getProjectSettingsPath(args.cwd));
  if (projectConfig) {
    config = deepMerge(config, projectConfig);
  }

  // Apply environment variables
  const envConfig = loadEnvConfig();
  config = deepMerge(config, envConfig);

  // Apply CLI arguments
  const argsConfig = loadArgsConfig(args);
  config = deepMerge(config, argsConfig);

  // Expand paths
  config.memory.globalPath = config.memory.globalPath.replace('~', homedir());
  config.memory.projectPath = join(args.cwd, config.memory.projectPath.replace(/^\.\//, ''));

  return config;
}

/**
 * Check if a config file exists.
 *
 * @param path - Path to check
 * @returns True if config file exists
 */
export function configExists(path: string): boolean {
  return existsSync(path);
}

/**
 * Get config file locations for display.
 *
 * @param cwd - Current working directory
 * @returns Object with config file paths and their existence status
 */
export function getConfigLocations(cwd: string): {
  global: { path: string; exists: boolean };
  project: { path: string; exists: boolean };
} {
  const globalPath = getGlobalSettingsPath();
  const projectPath = getProjectSettingsPath(cwd);

  return {
    global: {
      path: globalPath,
      exists: existsSync(globalPath),
    },
    project: {
      path: projectPath,
      exists: existsSync(projectPath),
    },
  };
}
