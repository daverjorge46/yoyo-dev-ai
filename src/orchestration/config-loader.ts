/**
 * Configuration Loader for Global Orchestration Mode
 * @version 6.2.0
 * @description Loads and parses orchestration configuration from config.yml
 */

import * as fs from 'fs';
import * as path from 'path';
import { OrchestrationConfig, RouterConfig, AgentName } from './types';

// Default orchestration configuration
const DEFAULT_CONFIG: OrchestrationConfig = {
  enabled: true,
  globalMode: true,
  showPrefixes: true,
  confidenceThreshold: 0.6,

  intentClassification: {
    enabled: true,
    maxLatencyMs: 10,
  },

  routing: {
    frontendDelegation: {
      enabled: true,
      agent: 'dave-engineer' as AgentName,
    },
    researchDelegation: {
      enabled: true,
      agent: 'alma-librarian' as AgentName,
      background: true,
    },
    codebaseDelegation: {
      enabled: true,
      agent: 'alvaro-explore' as AgentName,
    },
    failureEscalation: {
      enabled: true,
      agent: 'arthas-oracle' as AgentName,
      afterFailures: 3,
    },
  },

  backgroundTasks: {
    enabled: true,
    maxConcurrent: 3,
    notificationOnComplete: true,
  },
};

// Simple YAML parser for our specific config structure
// This avoids adding a dependency on the yaml package
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [
    { obj: result, indent: -1 },
  ];

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Calculate indentation
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Skip if no content
    if (!trimmed) continue;

    // Pop stack until we find the right parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    // Check if this is a key: value pair or just a key (object start)
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    const valueStr = trimmed.substring(colonIndex + 1).trim();

    if (valueStr === '' || valueStr === '|' || valueStr === '>') {
      // This is an object start
      const newObj: Record<string, unknown> = {};
      parent[key] = newObj;
      stack.push({ obj: newObj, indent });
    } else {
      // This is a value
      let value: unknown;

      if (valueStr === 'true') {
        value = true;
      } else if (valueStr === 'false') {
        value = false;
      } else if (valueStr === 'null') {
        value = null;
      } else if (/^-?\d+$/.test(valueStr)) {
        value = parseInt(valueStr, 10);
      } else if (/^-?\d+\.\d+$/.test(valueStr)) {
        value = parseFloat(valueStr);
      } else if (
        (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith("'") && valueStr.endsWith("'"))
      ) {
        value = valueStr.slice(1, -1);
      } else {
        value = valueStr;
      }

      parent[key] = value;
    }
  }

  return result;
}

export class ConfigLoader {
  private configPath: string;
  private config: OrchestrationConfig | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.configPath = path.join(projectRoot, '.yoyo-dev', 'config.yml');
  }

  /**
   * Load orchestration configuration
   * Priority: Environment variable > Config file > Defaults
   */
  load(): OrchestrationConfig {
    if (this.config) {
      return this.config;
    }

    // Check environment override
    if (process.env.YOYO_ORCHESTRATION === 'false') {
      this.config = { ...DEFAULT_CONFIG, enabled: false };
      return this.config;
    }

    // Try to load from file
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = parseSimpleYaml(content);
        const orchestrationSection = (parsed?.orchestration ?? {}) as Partial<OrchestrationConfig>;
        this.config = this.mergeConfig(DEFAULT_CONFIG, orchestrationSection);
      } else {
        this.config = DEFAULT_CONFIG;
      }
    } catch (error) {
      console.warn('[config-loader] Failed to load config, using defaults:', error);
      this.config = DEFAULT_CONFIG;
    }

    return this.config;
  }

  /**
   * Deep merge configuration with defaults
   */
  private mergeConfig(
    defaults: OrchestrationConfig,
    overrides: Partial<OrchestrationConfig>
  ): OrchestrationConfig {
    return {
      enabled: overrides.enabled ?? defaults.enabled,
      globalMode: overrides.globalMode ?? defaults.globalMode,
      showPrefixes: overrides.showPrefixes ?? defaults.showPrefixes,
      confidenceThreshold: overrides.confidenceThreshold ?? defaults.confidenceThreshold,

      intentClassification: {
        ...defaults.intentClassification,
        ...((overrides.intentClassification as Partial<OrchestrationConfig['intentClassification']>) ?? {}),
      },

      routing: this.mergeRoutingConfig(
        defaults.routing,
        (overrides.routing as Partial<RouterConfig>) ?? {}
      ),

      backgroundTasks: {
        ...defaults.backgroundTasks,
        ...((overrides.backgroundTasks as Partial<OrchestrationConfig['backgroundTasks']>) ?? {}),
      },
    };
  }

  /**
   * Merge routing configuration
   */
  private mergeRoutingConfig(
    defaults: RouterConfig,
    overrides: Partial<RouterConfig>
  ): RouterConfig {
    return {
      frontendDelegation: {
        ...defaults.frontendDelegation,
        ...(overrides.frontendDelegation ?? {}),
      },
      researchDelegation: {
        ...defaults.researchDelegation,
        ...(overrides.researchDelegation ?? {}),
      },
      codebaseDelegation: {
        ...defaults.codebaseDelegation,
        ...(overrides.codebaseDelegation ?? {}),
      },
      failureEscalation: {
        ...defaults.failureEscalation,
        ...(overrides.failureEscalation ?? {}),
      },
    };
  }

  /**
   * Force reload configuration from file
   */
  reload(): OrchestrationConfig {
    this.config = null;
    return this.load();
  }

  /**
   * Get the path to the config file
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if config file exists
   */
  configFileExists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Get default configuration
   */
  static getDefaults(): OrchestrationConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Check if orchestration is enabled
   * Considers both config and environment
   */
  isOrchestrationEnabled(): boolean {
    const config = this.load();
    return config.enabled && config.globalMode;
  }
}
