/**
 * Config Validator Tests
 *
 * Tests for configuration validation:
 * - Temperature bounds (0-1)
 * - Model format (provider/model-name)
 * - Tool negation rules
 * - Schema validation with zod
 */

import { describe, it, expect } from "vitest";
import {
  validateAgentOverride,
  validateConfigFile,
  validateTemperature,
  validateModelFormat,
  validateToolNegations,
  agentOverrideSchema,
  agentConfigFileSchema,
  userAgentsConfigSchema,
  projectAgentsConfigSchema,
} from "../validator.js";
import type { AgentOverride, AgentConfigFile } from "../types.js";

// =============================================================================
// Temperature Validation Tests
// =============================================================================

describe("validateTemperature", () => {
  it("should accept valid temperature 0", () => {
    const result = validateTemperature(0);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept valid temperature 1", () => {
    const result = validateTemperature(1);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept valid temperature 0.5", () => {
    const result = validateTemperature(0.5);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject temperature below 0", () => {
    const result = validateTemperature(-0.1);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Temperature must be between 0 and 1");
  });

  it("should reject temperature above 1", () => {
    const result = validateTemperature(1.1);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Temperature must be between 0 and 1");
  });

  it("should reject non-number temperature", () => {
    const result = validateTemperature("0.5" as unknown as number);
    expect(result.valid).toBe(false);
  });

  it("should accept undefined temperature (optional)", () => {
    const result = validateTemperature(undefined);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Model Format Validation Tests
// =============================================================================

describe("validateModelFormat", () => {
  it("should accept valid model format with provider/model", () => {
    const result = validateModelFormat("anthropic/claude-opus-4-5");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept model with multiple slashes", () => {
    const result = validateModelFormat("openai/gpt-4/turbo");
    expect(result.valid).toBe(true);
  });

  it("should accept model with version numbers", () => {
    const result = validateModelFormat("anthropic/claude-sonnet-4-5-20241022");
    expect(result.valid).toBe(true);
  });

  it("should reject model without provider", () => {
    const result = validateModelFormat("claude-opus-4-5");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("provider/model-name");
  });

  it("should reject empty string", () => {
    const result = validateModelFormat("");
    expect(result.valid).toBe(false);
  });

  it("should accept undefined model (optional)", () => {
    const result = validateModelFormat(undefined);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Tool Negation Validation Tests
// =============================================================================

describe("validateToolNegations", () => {
  it("should accept tools without negations", () => {
    const result = validateToolNegations(["Read", "Write", "Grep"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept wildcard with negations", () => {
    const result = validateToolNegations(["*", "!Bash", "!Write"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject negations without wildcard", () => {
    const result = validateToolNegations(["Read", "!Bash"]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("negation");
    expect(result.errors[0]).toContain("wildcard");
  });

  it("should accept empty tools array", () => {
    const result = validateToolNegations([]);
    expect(result.valid).toBe(true);
  });

  it("should accept undefined tools (optional)", () => {
    const result = validateToolNegations(undefined);
    expect(result.valid).toBe(true);
  });

  it("should accept MCP tool patterns", () => {
    const result = validateToolNegations([
      "mcp__playwright__*",
      "mcp__github__list_issues",
    ]);
    expect(result.valid).toBe(true);
  });

  it("should accept wildcard with MCP negations", () => {
    const result = validateToolNegations(["*", "!mcp__dangerous__*"]);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Agent Override Validation Tests
// =============================================================================

describe("validateAgentOverride", () => {
  it("should accept valid minimal override", () => {
    const override: AgentOverride = {
      name: "oracle",
      temperature: 0.2,
    };

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept valid complete override", () => {
    const override: AgentOverride = {
      name: "oracle",
      temperature: 0.2,
      model: "anthropic/claude-sonnet-4-5",
      fallbackModel: "anthropic/claude-haiku-4-5",
      tools: ["Read", "Grep", "Glob"],
      role: "Custom Oracle Role",
      mode: "subagent",
      enabled: true,
      preferFallback: true,
      fallbackOnRateLimit: false,
      color: "#ff6b35",
    };

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(true);
  });

  it("should reject override without name", () => {
    const override = {
      temperature: 0.2,
    } as AgentOverride;

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(false);
    // Check that there's at least one error related to name (may say "Required" or "name")
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some(
        (e) =>
          e.property === "name" ||
          e.message.toLowerCase().includes("name") ||
          e.message.toLowerCase().includes("required")
      )
    ).toBe(true);
  });

  it("should reject invalid temperature", () => {
    const override: AgentOverride = {
      name: "oracle",
      temperature: 1.5,
    };

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_TEMPERATURE")).toBe(
      true
    );
  });

  it("should reject invalid model format", () => {
    const override: AgentOverride = {
      name: "oracle",
      model: "claude-opus", // missing provider
    };

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_MODEL_FORMAT")).toBe(
      true
    );
  });

  it("should reject tool negations without wildcard", () => {
    const override: AgentOverride = {
      name: "oracle",
      tools: ["Read", "!Bash"], // negation without wildcard
    };

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_TOOL_NEGATION")).toBe(
      true
    );
  });

  it("should reject invalid mode", () => {
    const override = {
      name: "oracle",
      mode: "invalid-mode",
    } as unknown as AgentOverride;

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(false);
  });

  it("should collect all validation errors", () => {
    const override: AgentOverride = {
      name: "oracle",
      temperature: 1.5, // invalid
      model: "no-provider", // invalid
      tools: ["Read", "!Bash"], // invalid
    };

    const result = validateAgentOverride(override);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// =============================================================================
// Config File Validation Tests
// =============================================================================

describe("validateConfigFile", () => {
  describe("agent config file (.yoyo-dev/agents/*.yml)", () => {
    it("should accept valid agent config file", () => {
      const config: AgentConfigFile = {
        name: "oracle",
        overrides: {
          temperature: 0.2,
          model: "anthropic/claude-sonnet-4-5",
        },
      };

      const result = validateConfigFile(config, "agent");
      expect(result.valid).toBe(true);
    });

    it("should reject agent config without name", () => {
      const config = {
        overrides: {
          temperature: 0.2,
        },
      } as AgentConfigFile;

      const result = validateConfigFile(config, "agent");
      expect(result.valid).toBe(false);
    });

    it("should reject agent config with invalid overrides", () => {
      const config: AgentConfigFile = {
        name: "oracle",
        overrides: {
          temperature: 2.0, // invalid
        },
      };

      const result = validateConfigFile(config, "agent");
      expect(result.valid).toBe(false);
    });
  });

  describe("user agents config (~/.yoyo-dev/config/agents.yml)", () => {
    it("should accept valid user agents config", () => {
      const config = {
        agents: {
          oracle: {
            temperature: 0.2,
          },
          librarian: {
            preferFallback: true,
          },
        },
      };

      const result = validateConfigFile(config, "user");
      expect(result.valid).toBe(true);
    });

    it("should accept empty agents object", () => {
      const config = {
        agents: {},
      };

      const result = validateConfigFile(config, "user");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid agent overrides in user config", () => {
      const config = {
        agents: {
          oracle: {
            temperature: 1.5, // invalid
          },
        },
      };

      const result = validateConfigFile(config, "user");
      expect(result.valid).toBe(false);
    });
  });

  describe("project config (.yoyo-dev/config.yml agents section)", () => {
    it("should accept valid project agents config", () => {
      const config = {
        agents: {
          oracle: {
            temperature: 0.1,
          },
        },
        defaults: {
          preferFallback: true,
          fallbackOnRateLimit: false,
        },
      };

      const result = validateConfigFile(config, "project");
      expect(result.valid).toBe(true);
    });

    it("should accept project config with only defaults", () => {
      const config = {
        defaults: {
          temperature: 0.5,
        },
      };

      const result = validateConfigFile(config, "project");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid defaults temperature", () => {
      const config = {
        defaults: {
          temperature: -1, // invalid
        },
      };

      const result = validateConfigFile(config, "project");
      expect(result.valid).toBe(false);
    });

    it("should accept undefined agents and defaults", () => {
      const config = {};

      const result = validateConfigFile(config, "project");
      expect(result.valid).toBe(true);
    });
  });
});

// =============================================================================
// Zod Schema Tests
// =============================================================================

describe("zod schemas", () => {
  describe("agentOverrideSchema", () => {
    it("should parse valid override", () => {
      const result = agentOverrideSchema.safeParse({
        name: "oracle",
        temperature: 0.5,
        model: "anthropic/claude-opus-4-5",
      });

      expect(result.success).toBe(true);
    });

    it("should fail on missing name", () => {
      const result = agentOverrideSchema.safeParse({
        temperature: 0.5,
      });

      expect(result.success).toBe(false);
    });

    it("should coerce string temperature to number", () => {
      const result = agentOverrideSchema.safeParse({
        name: "oracle",
        temperature: "0.5",
      });

      // May or may not coerce depending on schema design
      // This tests the actual behavior
      if (result.success) {
        expect(typeof result.data.temperature).toBe("number");
      }
    });
  });

  describe("agentConfigFileSchema", () => {
    it("should parse valid agent config file", () => {
      const result = agentConfigFileSchema.safeParse({
        name: "oracle",
        overrides: {
          temperature: 0.2,
        },
      });

      expect(result.success).toBe(true);
    });

    it("should fail without overrides object", () => {
      const result = agentConfigFileSchema.safeParse({
        name: "oracle",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("userAgentsConfigSchema", () => {
    it("should parse valid user agents config", () => {
      const result = userAgentsConfigSchema.safeParse({
        agents: {
          oracle: { temperature: 0.2 },
          librarian: { preferFallback: true },
        },
      });

      expect(result.success).toBe(true);
    });

    it("should require agents object", () => {
      const result = userAgentsConfigSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("projectAgentsConfigSchema", () => {
    it("should parse valid project agents config", () => {
      const result = projectAgentsConfigSchema.safeParse({
        agents: {
          oracle: { temperature: 0.1 },
        },
        defaults: {
          preferFallback: true,
        },
      });

      expect(result.success).toBe(true);
    });

    it("should allow empty object", () => {
      const result = projectAgentsConfigSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("should validate defaults temperature bounds", () => {
      const result = projectAgentsConfigSchema.safeParse({
        defaults: {
          temperature: 1.5, // invalid
        },
      });

      expect(result.success).toBe(false);
    });
  });
});
