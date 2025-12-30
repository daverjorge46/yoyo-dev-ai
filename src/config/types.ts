/**
 * Configuration Types
 *
 * Type definitions for the hierarchical configuration system.
 * Supports three-tier config loading: user defaults -> project config -> local agent files.
 */

import type { AgentConfig, AgentMetadata, AgentMode } from "../agents/types.js";

/**
 * Config source priority (highest to lowest)
 */
export type ConfigSource =
  | "local" // .yoyo-dev/agents/*.yml - Project-specific agent overrides
  | "project" // .yoyo-dev/config.yml - Project configuration
  | "user" // ~/.yoyo-dev/config/agents.yml - User-level defaults
  | "builtin"; // src/agents/registry.ts - Built-in defaults (fallback)

/**
 * Priority order for config sources (lower index = higher priority)
 */
export const CONFIG_PRIORITY: ConfigSource[] = [
  "local",
  "project",
  "user",
  "builtin",
];

/**
 * Agent override configuration from YAML files
 * Partial agent config that can override specific properties
 */
export interface AgentOverride {
  /** Agent name (required for identification) */
  name: string;

  /** Override temperature (0-1) */
  temperature?: number;

  /** Override model (format: provider/model-name) */
  model?: string;

  /** Override fallback model */
  fallbackModel?: string;

  /** Override tool access list (supports wildcards and negations) */
  tools?: string[];

  /** Override role description */
  role?: string;

  /** Override execution mode */
  mode?: AgentMode;

  /** Override system prompt path */
  systemPromptPath?: string;

  /** Enable/disable agent */
  enabled?: boolean;

  /** Override preferFallback setting */
  preferFallback?: boolean;

  /** Override fallbackOnRateLimit setting */
  fallbackOnRateLimit?: boolean;

  /** Override UI display color */
  color?: string;

  /** Override metadata */
  metadata?: Partial<AgentMetadata>;
}

/**
 * Agent config file structure (single agent per file)
 * Example: .yoyo-dev/agents/oracle.yml
 */
export interface AgentConfigFile {
  /** Agent name (file stem typically matches) */
  name: string;

  /** Override properties */
  overrides: Omit<AgentOverride, "name">;
}

/**
 * User-level agents config file structure
 * Example: ~/.yoyo-dev/config/agents.yml
 */
export interface UserAgentsConfigFile {
  /** Agent overrides by name */
  agents: Record<string, Omit<AgentOverride, "name">>;
}

/**
 * Project-level config.yml agent section
 */
export interface ProjectAgentsConfig {
  /** Agent overrides by name */
  agents?: Record<string, Omit<AgentOverride, "name">>;

  /** Global defaults applied to all agents */
  defaults?: {
    temperature?: number;
    preferFallback?: boolean;
    fallbackOnRateLimit?: boolean;
  };
}

/**
 * Merged agent configuration with source tracking
 */
export interface MergedAgentConfig extends AgentConfig {
  /** Sources contributing to this config (highest priority first) */
  sources: ConfigSource[];

  /** Per-property source tracking */
  propertySource: Record<keyof AgentConfig, ConfigSource>;

  /** Whether this is a custom (non-builtin) agent */
  isCustom: boolean;
}

/**
 * Config loader options
 */
export interface ConfigLoaderOptions {
  /** Project root directory */
  projectRoot?: string;

  /** User home directory (default: process.env.HOME) */
  userHome?: string;

  /** Skip loading from specific sources */
  skipSources?: ConfigSource[];

  /** Enable caching */
  enableCache?: boolean;
}

/**
 * Config file location info
 */
export interface ConfigFileInfo {
  /** File path */
  path: string;

  /** Config source type */
  source: ConfigSource;

  /** Whether file exists */
  exists: boolean;

  /** Agent name (for local agent files) */
  agentName?: string;
}

/**
 * Config loading result
 */
export interface ConfigLoadResult {
  /** Merged agent configurations */
  agents: Record<string, MergedAgentConfig>;

  /** Files that were loaded */
  loadedFiles: ConfigFileInfo[];

  /** Errors encountered during loading */
  errors: ConfigError[];

  /** Warnings encountered during loading */
  warnings: ConfigWarning[];
}

/**
 * Config validation error
 */
export interface ConfigError {
  /** Error message */
  message: string;

  /** File path where error occurred */
  file?: string;

  /** Agent name if applicable */
  agent?: string;

  /** Property name if applicable */
  property?: string;

  /** Error code */
  code: ConfigErrorCode;
}

/**
 * Config error codes
 */
export type ConfigErrorCode =
  | "INVALID_YAML" // YAML parsing error
  | "INVALID_SCHEMA" // Schema validation error
  | "INVALID_TEMPERATURE" // Temperature out of bounds
  | "INVALID_MODEL_FORMAT" // Model not in provider/name format
  | "INVALID_TOOL_NEGATION" // Tool negation without wildcard
  | "FILE_READ_ERROR" // Could not read file
  | "AGENT_NOT_FOUND" // Agent referenced doesn't exist in builtin
  | "DUPLICATE_AGENT"; // Same agent defined in multiple files at same level

/**
 * Config warning (non-fatal issues)
 */
export interface ConfigWarning {
  /** Warning message */
  message: string;

  /** File path where warning occurred */
  file?: string;

  /** Agent name if applicable */
  agent?: string;

  /** Warning code */
  code: ConfigWarningCode;
}

/**
 * Config warning codes
 */
export type ConfigWarningCode =
  | "UNKNOWN_PROPERTY" // Unknown property in config
  | "DEPRECATED_PROPERTY" // Deprecated property used
  | "OVERRIDE_SHADOWED" // Lower priority override shadowed by higher
  | "CUSTOM_AGENT_NO_PROMPT"; // Custom agent without system prompt

/**
 * Config cache entry
 */
export interface ConfigCacheEntry {
  /** Cached config result */
  result: ConfigLoadResult;

  /** Cache timestamp */
  timestamp: number;

  /** File modification times at cache time */
  fileMtimes: Record<string, number>;
}

/**
 * Discovered local agent info
 */
export interface DiscoveredAgent {
  /** Agent name (from filename) */
  name: string;

  /** File path */
  path: string;

  /** Parsed override config */
  override: AgentOverride;

  /** Is this a custom agent (not in builtin) */
  isCustom: boolean;
}
