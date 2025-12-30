/**
 * Configuration Validator
 *
 * Validates agent configuration overrides using zod schemas.
 * Enforces rules for temperature bounds, model format, and tool negations.
 */

import { z } from "zod";
import type {
  AgentOverride,
  AgentConfigFile,
  UserAgentsConfigFile,
  ProjectAgentsConfig,
  ConfigError,
  ConfigErrorCode,
} from "./types.js";

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigError[];
  warnings?: string[];
}

// =============================================================================
// Individual Validators
// =============================================================================

/**
 * Validate temperature is within bounds [0, 1]
 */
export function validateTemperature(
  temperature: number | undefined
): ValidationResult {
  if (temperature === undefined) {
    return { valid: true, errors: [] };
  }

  if (typeof temperature !== "number") {
    return {
      valid: false,
      errors: ["Temperature must be a number"],
    };
  }

  if (temperature < 0 || temperature > 1) {
    return {
      valid: false,
      errors: [`Temperature must be between 0 and 1, got ${temperature}`],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate model format is "provider/model-name"
 */
export function validateModelFormat(
  model: string | undefined
): ValidationResult {
  if (model === undefined) {
    return { valid: true, errors: [] };
  }

  if (typeof model !== "string" || model.trim() === "") {
    return {
      valid: false,
      errors: ["Model must be a non-empty string"],
    };
  }

  if (!model.includes("/")) {
    return {
      valid: false,
      errors: [
        `Model must be in format 'provider/model-name', got '${model}'`,
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate tool negations are only used with wildcard
 *
 * Rules:
 * - Negations (tools starting with "!") are only valid when "*" is present
 * - Negations without wildcard have no effect and are likely mistakes
 */
export function validateToolNegations(
  tools: string[] | undefined
): ValidationResult {
  if (tools === undefined || tools.length === 0) {
    return { valid: true, errors: [] };
  }

  const hasWildcard = tools.includes("*");
  const negations = tools.filter((t) => t.startsWith("!"));

  if (negations.length > 0 && !hasWildcard) {
    return {
      valid: false,
      errors: [
        `Tool negation (${negations.join(", ")}) requires wildcard (*). ` +
          `Negations without wildcard have no effect.`,
      ],
    };
  }

  return { valid: true, errors: [] };
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Agent mode schema
 */
const agentModeSchema = z.enum(["primary", "subagent"]);

/**
 * Temperature schema with bounds validation
 */
const temperatureSchema = z
  .number()
  .min(0, "Temperature must be >= 0")
  .max(1, "Temperature must be <= 1")
  .optional();

/**
 * Model format schema (provider/model-name)
 */
const modelSchema = z
  .string()
  .refine(
    (val) => val.includes("/"),
    "Model must be in format 'provider/model-name'"
  )
  .optional();

/**
 * Tools array schema
 */
const toolsSchema = z.array(z.string()).optional();

/**
 * Agent metadata schema
 */
const agentMetadataSchema = z
  .object({
    description: z.string().optional(),
    version: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .optional();

/**
 * Agent override schema (for validating override properties)
 */
export const agentOverrideSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  temperature: temperatureSchema,
  model: modelSchema,
  fallbackModel: modelSchema,
  tools: toolsSchema,
  role: z.string().optional(),
  mode: agentModeSchema.optional(),
  systemPromptPath: z.string().optional(),
  enabled: z.boolean().optional(),
  preferFallback: z.boolean().optional(),
  fallbackOnRateLimit: z.boolean().optional(),
  color: z.string().optional(),
  metadata: agentMetadataSchema,
});

/**
 * Override-only schema (without name, for nested configs)
 */
const overrideOnlySchema = z.object({
  temperature: temperatureSchema,
  model: modelSchema,
  fallbackModel: modelSchema,
  tools: toolsSchema,
  role: z.string().optional(),
  mode: agentModeSchema.optional(),
  systemPromptPath: z.string().optional(),
  enabled: z.boolean().optional(),
  preferFallback: z.boolean().optional(),
  fallbackOnRateLimit: z.boolean().optional(),
  color: z.string().optional(),
  metadata: agentMetadataSchema,
});

/**
 * Agent config file schema (.yoyo-dev/agents/*.yml)
 */
export const agentConfigFileSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  overrides: overrideOnlySchema,
});

/**
 * User agents config schema (~/.yoyo-dev/config/agents.yml)
 */
export const userAgentsConfigSchema = z.object({
  agents: z.record(z.string(), overrideOnlySchema),
});

/**
 * Project defaults schema
 */
const projectDefaultsSchema = z
  .object({
    temperature: temperatureSchema,
    preferFallback: z.boolean().optional(),
    fallbackOnRateLimit: z.boolean().optional(),
  })
  .optional();

/**
 * Project agents config schema (.yoyo-dev/config.yml)
 */
export const projectAgentsConfigSchema = z.object({
  agents: z.record(z.string(), overrideOnlySchema).optional(),
  defaults: projectDefaultsSchema,
});

// =============================================================================
// Main Validation Functions
// =============================================================================

/**
 * Validate an agent override configuration
 *
 * @param override - Agent override to validate
 * @param file - Optional file path for error reporting
 * @returns Validation result with errors
 */
export function validateAgentOverride(
  override: AgentOverride,
  file?: string
): ConfigValidationResult {
  const errors: ConfigError[] = [];

  // Zod schema validation
  const parseResult = agentOverrideSchema.safeParse(override);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        message: issue.message,
        file,
        agent: override.name,
        property: issue.path.join("."),
        code: mapZodErrorToCode(issue),
      });
    }
  }

  // Additional custom validations

  // Temperature bounds
  const tempResult = validateTemperature(override.temperature);
  if (!tempResult.valid) {
    errors.push({
      message: tempResult.errors[0] ?? "Invalid temperature",
      file,
      agent: override.name,
      property: "temperature",
      code: "INVALID_TEMPERATURE",
    });
  }

  // Model format
  const modelResult = validateModelFormat(override.model);
  if (!modelResult.valid) {
    errors.push({
      message: modelResult.errors[0] ?? "Invalid model format",
      file,
      agent: override.name,
      property: "model",
      code: "INVALID_MODEL_FORMAT",
    });
  }

  // Fallback model format
  const fallbackResult = validateModelFormat(override.fallbackModel);
  if (!fallbackResult.valid) {
    errors.push({
      message: fallbackResult.errors[0] ?? "Invalid fallback model format",
      file,
      agent: override.name,
      property: "fallbackModel",
      code: "INVALID_MODEL_FORMAT",
    });
  }

  // Tool negations
  const toolsResult = validateToolNegations(override.tools);
  if (!toolsResult.valid) {
    errors.push({
      message: toolsResult.errors[0] ?? "Invalid tool negation",
      file,
      agent: override.name,
      property: "tools",
      code: "INVALID_TOOL_NEGATION",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a config file based on its type
 *
 * @param config - Config object to validate
 * @param type - Type of config file ("agent", "user", "project")
 * @param file - Optional file path for error reporting
 * @returns Validation result with errors
 */
export function validateConfigFile(
  config: unknown,
  type: "agent" | "user" | "project",
  file?: string
): ConfigValidationResult {
  const errors: ConfigError[] = [];

  switch (type) {
    case "agent":
      return validateAgentConfigFile(config as AgentConfigFile, file);

    case "user":
      return validateUserAgentsConfig(config as UserAgentsConfigFile, file);

    case "project":
      return validateProjectAgentsConfig(config as ProjectAgentsConfig, file);

    default:
      errors.push({
        message: `Unknown config type: ${type}`,
        file,
        code: "INVALID_SCHEMA",
      });
      return { valid: false, errors };
  }
}

/**
 * Validate agent config file (.yoyo-dev/agents/*.yml)
 */
function validateAgentConfigFile(
  config: AgentConfigFile,
  file?: string
): ConfigValidationResult {
  const errors: ConfigError[] = [];

  const parseResult = agentConfigFileSchema.safeParse(config);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        message: issue.message,
        file,
        agent: config?.name,
        property: issue.path.join("."),
        code: mapZodErrorToCode(issue),
      });
    }
    return { valid: false, errors };
  }

  // Validate overrides content
  if (config.overrides) {
    const override: AgentOverride = {
      name: config.name,
      ...config.overrides,
    };
    const overrideResult = validateAgentOverride(override, file);
    // Filter out duplicate name errors since we constructed the override
    const filteredErrors = overrideResult.errors.filter(
      (e) => e.property !== "name" || !e.message.includes("required")
    );
    errors.push(...filteredErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user agents config (~/.yoyo-dev/config/agents.yml)
 */
function validateUserAgentsConfig(
  config: UserAgentsConfigFile,
  file?: string
): ConfigValidationResult {
  const errors: ConfigError[] = [];

  const parseResult = userAgentsConfigSchema.safeParse(config);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        message: issue.message,
        file,
        property: issue.path.join("."),
        code: mapZodErrorToCode(issue),
      });
    }
    return { valid: false, errors };
  }

  // Validate each agent's overrides
  if (config.agents) {
    for (const [agentName, overrides] of Object.entries(config.agents)) {
      const override: AgentOverride = {
        name: agentName,
        ...overrides,
      };
      const overrideResult = validateAgentOverride(override, file);
      // Filter out name errors since we provided the name
      const filteredErrors = overrideResult.errors.filter(
        (e) => e.property !== "name"
      );
      errors.push(...filteredErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate project agents config (.yoyo-dev/config.yml)
 */
function validateProjectAgentsConfig(
  config: ProjectAgentsConfig,
  file?: string
): ConfigValidationResult {
  const errors: ConfigError[] = [];

  const parseResult = projectAgentsConfigSchema.safeParse(config);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        message: issue.message,
        file,
        property: issue.path.join("."),
        code: mapZodErrorToCode(issue),
      });
    }
    return { valid: false, errors };
  }

  // Validate each agent's overrides
  if (config.agents) {
    for (const [agentName, overrides] of Object.entries(config.agents)) {
      const override: AgentOverride = {
        name: agentName,
        ...overrides,
      };
      const overrideResult = validateAgentOverride(override, file);
      // Filter out name errors since we provided the name
      const filteredErrors = overrideResult.errors.filter(
        (e) => e.property !== "name"
      );
      errors.push(...filteredErrors);
    }
  }

  // Validate defaults temperature if present
  if (config.defaults?.temperature !== undefined) {
    const tempResult = validateTemperature(config.defaults.temperature);
    if (!tempResult.valid) {
      errors.push({
        message: tempResult.errors[0] ?? "Invalid defaults temperature",
        file,
        property: "defaults.temperature",
        code: "INVALID_TEMPERATURE",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map zod error to config error code
 */
function mapZodErrorToCode(issue: z.ZodIssue): ConfigErrorCode {
  const path = issue.path.join(".");

  if (path.includes("temperature")) {
    return "INVALID_TEMPERATURE";
  }

  if (path.includes("model")) {
    return "INVALID_MODEL_FORMAT";
  }

  if (path.includes("tools")) {
    return "INVALID_TOOL_NEGATION";
  }

  return "INVALID_SCHEMA";
}
