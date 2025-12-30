/**
 * Configuration System
 *
 * Hierarchical configuration loading for agent configurations.
 * Supports three-tier priority: local > project > user > builtin.
 */

// Types
export type {
  ConfigSource,
  AgentOverride,
  AgentConfigFile,
  UserAgentsConfigFile,
  ProjectAgentsConfig,
  MergedAgentConfig,
  ConfigLoaderOptions,
  ConfigFileInfo,
  ConfigLoadResult,
  ConfigError,
  ConfigErrorCode,
  ConfigWarning,
  ConfigWarningCode,
  ConfigCacheEntry,
  DiscoveredAgent,
} from "./types.js";

export { CONFIG_PRIORITY } from "./types.js";

// Loader
export {
  loadAgentConfigs,
  discoverLocalAgents,
  clearConfigCache,
  mergeAgentConfig,
} from "./loader.js";

// Validator
export {
  validateAgentOverride,
  validateConfigFile,
  validateTemperature,
  validateModelFormat,
  validateToolNegations,
  agentOverrideSchema,
  agentConfigFileSchema,
  userAgentsConfigSchema,
  projectAgentsConfigSchema,
} from "./validator.js";
export type { ValidationResult, ConfigValidationResult } from "./validator.js";
