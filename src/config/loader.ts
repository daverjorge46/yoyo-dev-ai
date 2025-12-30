/**
 * Configuration Loader
 *
 * Hierarchical configuration loading with three-tier priority:
 * 1. Local: .yoyo-dev/agents/*.yml (project-specific overrides)
 * 2. Project: .yoyo-dev/config.yml (project configuration)
 * 3. User: ~/.yoyo-dev/config/agents.yml (user-level defaults)
 * 4. Builtin: src/agents/registry.ts (fallback defaults)
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { homedir } from "node:os";
import yaml from "js-yaml";
import type { AgentConfig } from "../agents/types.js";
import type {
  ConfigSource,
  ConfigLoaderOptions,
  ConfigLoadResult,
  ConfigFileInfo,
  ConfigError,
  ConfigWarning,
  MergedAgentConfig,
  AgentOverride,
  AgentConfigFile,
  UserAgentsConfigFile,
  ProjectAgentsConfig,
  DiscoveredAgent,
  ConfigCacheEntry,
} from "./types.js";
import { validateConfigFile } from "./validator.js";

// =============================================================================
// Constants
// =============================================================================

const LOCAL_AGENTS_DIR = ".yoyo-dev/agents";
const PROJECT_CONFIG_FILE = ".yoyo-dev/config.yml";
const USER_AGENTS_FILE = ".yoyo-dev/config/agents.yml";

// =============================================================================
// Cache
// =============================================================================

let configCache: ConfigCacheEntry | null = null;
let cacheKey: string | null = null;

/**
 * Clear the configuration cache
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheKey = null;
}

/**
 * Get cache key for given options
 */
function getCacheKey(options: ConfigLoaderOptions): string {
  return JSON.stringify({
    projectRoot: options.projectRoot,
    userHome: options.userHome,
    skipSources: options.skipSources?.sort(),
  });
}

// =============================================================================
// Main Loading Functions
// =============================================================================

/**
 * Load all agent configurations with hierarchical merging
 *
 * Priority (highest to lowest):
 * 1. Local: .yoyo-dev/agents/*.yml
 * 2. Project: .yoyo-dev/config.yml
 * 3. User: ~/.yoyo-dev/config/agents.yml
 * 4. Builtin: registry.ts
 *
 * @param options - Loader configuration options
 * @returns Merged agent configurations with source tracking
 */
export async function loadAgentConfigs(
  options: ConfigLoaderOptions = {}
): Promise<ConfigLoadResult> {
  const {
    projectRoot = process.cwd(),
    userHome = homedir(),
    skipSources = [],
    enableCache = false,
  } = options;

  // Check cache
  const key = getCacheKey(options);
  if (enableCache && configCache && cacheKey === key) {
    return configCache.result;
  }

  const errors: ConfigError[] = [];
  const warnings: ConfigWarning[] = [];
  const loadedFiles: ConfigFileInfo[] = [];

  // Start with builtin agents
  const agents: Record<string, MergedAgentConfig> = {};
  const builtinAgents = await getBuiltinAgents();

  for (const [name, config] of Object.entries(builtinAgents)) {
    agents[name] = initializeMergedConfig(config);
  }

  // Load user-level config (lowest priority of overrides)
  if (!skipSources.includes("user")) {
    const userResult = await loadUserConfig(userHome);
    loadedFiles.push(...userResult.files);
    errors.push(...userResult.errors);

    if (userResult.config) {
      applyUserConfig(agents, userResult.config);
    }
  }

  // Load project config (medium priority)
  if (!skipSources.includes("project")) {
    const projectResult = await loadProjectConfig(projectRoot);
    loadedFiles.push(...projectResult.files);
    errors.push(...projectResult.errors);

    if (projectResult.config) {
      applyProjectConfig(agents, projectResult.config);
    }
  }

  // Load local agent overrides (highest priority)
  if (!skipSources.includes("local")) {
    const localResult = await loadLocalAgents(projectRoot, builtinAgents);
    loadedFiles.push(...localResult.files);
    errors.push(...localResult.errors);

    for (const discovered of localResult.agents) {
      applyLocalOverride(agents, discovered);
    }
  }

  const result: ConfigLoadResult = {
    agents,
    loadedFiles,
    errors,
    warnings,
  };

  // Cache result
  if (enableCache) {
    configCache = {
      result,
      timestamp: Date.now(),
      fileMtimes: {},
    };
    cacheKey = key;
  }

  return result;
}

/**
 * Discover local agent files in .yoyo-dev/agents/
 *
 * @param projectRoot - Project root directory
 * @returns Array of discovered agent configurations
 */
export async function discoverLocalAgents(
  projectRoot: string
): Promise<DiscoveredAgent[]> {
  const builtinAgents = await getBuiltinAgents();
  const result = await loadLocalAgents(projectRoot, builtinAgents);
  return result.agents;
}

// =============================================================================
// Config Merging
// =============================================================================

/**
 * Merge an override into an agent configuration
 *
 * @param base - Base agent configuration
 * @param override - Override to apply
 * @param source - Source of the override
 * @returns Merged configuration with source tracking
 */
export function mergeAgentConfig(
  base: AgentConfig | MergedAgentConfig,
  override: AgentOverride,
  source: ConfigSource
): MergedAgentConfig {
  // Initialize or copy property source tracking
  const propertySource: Partial<Record<keyof AgentConfig, ConfigSource>> = {
    ...(isMergedConfig(base) ? base.propertySource : {}),
  };

  // Initialize sources array
  const sources: ConfigSource[] = isMergedConfig(base)
    ? [...base.sources]
    : ["builtin"];

  if (!sources.includes(source)) {
    sources.unshift(source); // Add new source at the beginning (highest priority)
  }

  // Start with base config
  const merged: MergedAgentConfig = {
    ...(base as AgentConfig),
    sources,
    propertySource: propertySource as Record<keyof AgentConfig, ConfigSource>,
    isCustom: isMergedConfig(base) ? base.isCustom : false,
  };

  // Apply overrides and track sources
  const overrideKeys: (keyof AgentOverride)[] = [
    "temperature",
    "model",
    "fallbackModel",
    "tools",
    "role",
    "mode",
    "systemPromptPath",
    "enabled",
    "preferFallback",
    "fallbackOnRateLimit",
    "color",
    "metadata",
  ];

  for (const key of overrideKeys) {
    const value = override[key];
    if (value !== undefined) {
      // Type-safe assignment with proper handling
      switch (key) {
        case "temperature":
          merged.temperature = value as number;
          break;
        case "model":
          merged.model = value as string;
          break;
        case "fallbackModel":
          merged.fallbackModel = value as string;
          break;
        case "tools":
          merged.tools = value as string[];
          break;
        case "role":
          merged.role = value as string;
          break;
        case "mode":
          merged.mode = value as "primary" | "subagent";
          break;
        case "systemPromptPath":
          merged.systemPromptPath = value as string;
          break;
        case "enabled":
          merged.enabled = value as boolean;
          break;
        case "preferFallback":
          merged.preferFallback = value as boolean;
          break;
        case "fallbackOnRateLimit":
          merged.fallbackOnRateLimit = value as boolean;
          break;
        case "color":
          merged.color = value as string;
          break;
        case "metadata":
          merged.metadata = {
            ...merged.metadata,
            ...(value as typeof merged.metadata),
          };
          break;
      }
      merged.propertySource[key as keyof AgentConfig] = source;
    }
  }

  // Set untracked properties to builtin source
  const allProps: (keyof AgentConfig)[] = [
    "name",
    "role",
    "model",
    "fallbackModel",
    "temperature",
    "mode",
    "tools",
    "systemPromptPath",
    "enabled",
    "preferFallback",
    "fallbackOnRateLimit",
    "color",
    "metadata",
  ];

  for (const prop of allProps) {
    if (!(prop in merged.propertySource)) {
      merged.propertySource[prop] = "builtin";
    }
  }

  return merged;
}

// =============================================================================
// Internal Loading Functions
// =============================================================================

/**
 * Get builtin agents from registry
 */
async function getBuiltinAgents(): Promise<Record<string, AgentConfig>> {
  // Dynamic import to avoid circular dependency
  const { getAllAgents } = await import("../agents/registry.js");
  const agents = getAllAgents();

  const result: Record<string, AgentConfig> = {};
  for (const agent of agents) {
    result[agent.name.toLowerCase().replace(/\s+/g, "-")] = agent;
  }

  return result;
}

/**
 * Initialize a merged config from base agent config
 */
function initializeMergedConfig(config: AgentConfig): MergedAgentConfig {
  const propertySource: Partial<Record<keyof AgentConfig, ConfigSource>> = {};

  // All properties start as builtin
  const props: (keyof AgentConfig)[] = [
    "name",
    "role",
    "model",
    "fallbackModel",
    "temperature",
    "mode",
    "tools",
    "systemPromptPath",
    "enabled",
    "preferFallback",
    "fallbackOnRateLimit",
    "color",
    "metadata",
  ];

  for (const prop of props) {
    propertySource[prop] = "builtin";
  }

  return {
    ...config,
    sources: ["builtin"],
    propertySource: propertySource as Record<keyof AgentConfig, ConfigSource>,
    isCustom: false,
  };
}

/**
 * Check if config is already merged
 */
function isMergedConfig(
  config: AgentConfig | MergedAgentConfig
): config is MergedAgentConfig {
  return "sources" in config && Array.isArray(config.sources);
}

/**
 * Load user-level config
 */
async function loadUserConfig(userHome: string): Promise<{
  config: UserAgentsConfigFile | null;
  files: ConfigFileInfo[];
  errors: ConfigError[];
}> {
  const filePath = join(userHome, USER_AGENTS_FILE);
  const files: ConfigFileInfo[] = [];
  const errors: ConfigError[] = [];

  const fileInfo: ConfigFileInfo = {
    path: filePath,
    source: "user",
    exists: existsSync(filePath),
  };
  files.push(fileInfo);

  if (!fileInfo.exists) {
    return { config: null, files, errors };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as UserAgentsConfigFile;

    // Validate
    const validation = validateConfigFile(parsed, "user", filePath);
    if (!validation.valid) {
      errors.push(...validation.errors);
      return { config: null, files, errors };
    }

    return { config: parsed, files, errors };
  } catch (error) {
    errors.push({
      message: `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      file: filePath,
      code: "INVALID_YAML",
    });
    return { config: null, files, errors };
  }
}

/**
 * Load project config
 */
async function loadProjectConfig(projectRoot: string): Promise<{
  config: ProjectAgentsConfig | null;
  files: ConfigFileInfo[];
  errors: ConfigError[];
}> {
  const filePath = join(projectRoot, PROJECT_CONFIG_FILE);
  const files: ConfigFileInfo[] = [];
  const errors: ConfigError[] = [];

  const fileInfo: ConfigFileInfo = {
    path: filePath,
    source: "project",
    exists: existsSync(filePath),
  };
  files.push(fileInfo);

  if (!fileInfo.exists) {
    return { config: null, files, errors };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as Record<string, unknown>;

    // Extract agents section
    const agentsConfig: ProjectAgentsConfig = {
      agents: parsed.agents as Record<string, Omit<AgentOverride, "name">>,
      defaults: parsed.defaults as ProjectAgentsConfig["defaults"],
    };

    // Validate
    const validation = validateConfigFile(agentsConfig, "project", filePath);
    if (!validation.valid) {
      errors.push(...validation.errors);
      return { config: null, files, errors };
    }

    return { config: agentsConfig, files, errors };
  } catch (error) {
    errors.push({
      message: `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      file: filePath,
      code: "INVALID_YAML",
    });
    return { config: null, files, errors };
  }
}

/**
 * Load local agent overrides
 */
async function loadLocalAgents(
  projectRoot: string,
  builtinAgents: Record<string, AgentConfig>
): Promise<{
  agents: DiscoveredAgent[];
  files: ConfigFileInfo[];
  errors: ConfigError[];
}> {
  const agentsDir = join(projectRoot, LOCAL_AGENTS_DIR);
  const agents: DiscoveredAgent[] = [];
  const files: ConfigFileInfo[] = [];
  const errors: ConfigError[] = [];

  if (!existsSync(agentsDir)) {
    return { agents, files, errors };
  }

  const entries = readdirSync(agentsDir);

  for (const entry of entries) {
    const ext = extname(entry).toLowerCase();
    if (ext !== ".yml" && ext !== ".yaml") {
      continue;
    }

    const filePath = join(agentsDir, entry);
    const stat = statSync(filePath);

    if (!stat.isFile()) {
      continue;
    }

    const fileInfo: ConfigFileInfo = {
      path: filePath,
      source: "local",
      exists: true,
      agentName: basename(entry, ext),
    };
    files.push(fileInfo);

    try {
      const content = readFileSync(filePath, "utf-8");
      const parsed = yaml.load(content) as AgentConfigFile;

      // Validate
      const validation = validateConfigFile(parsed, "agent", filePath);
      if (!validation.valid) {
        errors.push(...validation.errors);
        continue;
      }

      const agentName = parsed.name.toLowerCase().replace(/\s+/g, "-");
      const isCustom = !(agentName in builtinAgents);

      agents.push({
        name: agentName,
        path: filePath,
        override: {
          name: agentName,
          ...parsed.overrides,
        },
        isCustom,
      });
    } catch (error) {
      errors.push({
        message: `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
        file: filePath,
        code: "INVALID_YAML",
      });
    }
  }

  return { agents, files, errors };
}

// =============================================================================
// Config Application Functions
// =============================================================================

/**
 * Apply user-level config to agents
 */
function applyUserConfig(
  agents: Record<string, MergedAgentConfig>,
  config: UserAgentsConfigFile
): void {
  if (!config.agents) return;

  for (const [agentName, overrides] of Object.entries(config.agents)) {
    const normalizedName = agentName.toLowerCase().replace(/\s+/g, "-");
    const existing = agents[normalizedName];

    if (existing) {
      agents[normalizedName] = mergeAgentConfig(
        existing,
        { name: normalizedName, ...overrides },
        "user"
      );
    }
    // Note: We don't create new agents from user config (only override existing)
  }
}

/**
 * Apply project-level config to agents
 */
function applyProjectConfig(
  agents: Record<string, MergedAgentConfig>,
  config: ProjectAgentsConfig
): void {
  // Apply defaults to all agents first
  if (config.defaults) {
    for (const [name, agent] of Object.entries(agents)) {
      const defaultOverride: AgentOverride = {
        name,
        ...config.defaults,
      };
      agents[name] = mergeAgentConfig(agent, defaultOverride, "project");
    }
  }

  // Apply specific agent overrides
  if (config.agents) {
    for (const [agentName, overrides] of Object.entries(config.agents)) {
      const normalizedName = agentName.toLowerCase().replace(/\s+/g, "-");
      const existing = agents[normalizedName];

      if (existing) {
        agents[normalizedName] = mergeAgentConfig(
          existing,
          { name: normalizedName, ...overrides },
          "project"
        );
      }
    }
  }
}

/**
 * Apply local agent override
 */
function applyLocalOverride(
  agents: Record<string, MergedAgentConfig>,
  discovered: DiscoveredAgent
): void {
  const existing = agents[discovered.name];

  if (existing) {
    agents[discovered.name] = mergeAgentConfig(
      existing,
      discovered.override,
      "local"
    );
  } else if (discovered.isCustom) {
    // Create new custom agent
    // Custom agents need all required fields
    const customBase: AgentConfig = {
      name: discovered.override.name,
      role: discovered.override.role ?? "Custom Agent",
      model: discovered.override.model ?? "anthropic/claude-sonnet-4-5",
      temperature: discovered.override.temperature ?? 0.5,
      mode: discovered.override.mode ?? "subagent",
      tools: discovered.override.tools ?? ["Read", "Write"],
      systemPromptPath:
        discovered.override.systemPromptPath ??
        `.claude/agents/${discovered.name}.md`,
      enabled: discovered.override.enabled ?? true,
    };

    const merged = initializeMergedConfig(customBase);
    merged.isCustom = true;
    merged.sources = ["local", "builtin"];

    // Override with local values
    agents[discovered.name] = mergeAgentConfig(
      merged,
      discovered.override,
      "local"
    );
  }
}
