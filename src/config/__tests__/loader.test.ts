/**
 * Config Loader Tests
 *
 * Tests for hierarchical configuration loading:
 * - Three-tier config priority (local > project > user > builtin)
 * - YAML file parsing
 * - Config merging semantics
 * - Local agent discovery
 * - Caching behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadAgentConfigs,
  discoverLocalAgents,
  clearConfigCache,
  mergeAgentConfig,
} from "../loader.js";
import type { ConfigSource, AgentOverride } from "../types.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "yoyo-config-loader-test-"));
}

function createYoyoDevDir(root: string): string {
  const yoyoDevDir = join(root, ".yoyo-dev");
  mkdirSync(yoyoDevDir, { recursive: true });
  return yoyoDevDir;
}

function createAgentsDir(yoyoDevDir: string): string {
  const agentsDir = join(yoyoDevDir, "agents");
  mkdirSync(agentsDir, { recursive: true });
  return agentsDir;
}

function createUserConfigDir(userHome: string): string {
  const configDir = join(userHome, ".yoyo-dev", "config");
  mkdirSync(configDir, { recursive: true });
  return configDir;
}

function writeYamlFile(path: string, content: string): void {
  writeFileSync(path, content, "utf-8");
}

// =============================================================================
// Test Data (Valid YAML configurations)
// =============================================================================

// Valid override with wildcard and negations
const SAMPLE_AGENT_OVERRIDE_YAML = `
name: oracle
overrides:
  temperature: 0.2
  model: anthropic/claude-sonnet-4-5
  tools:
    - "*"
    - "!Bash"
    - "!Write"
`;

// Simple override without tools (avoids negation validation)
const SIMPLE_OVERRIDE_YAML = `
name: oracle
overrides:
  temperature: 0.2
  model: anthropic/claude-sonnet-4-5
`;

const SAMPLE_USER_AGENTS_YAML = `
agents:
  oracle:
    temperature: 0.15
    preferFallback: true
  librarian:
    temperature: 0.25
`;

const SAMPLE_PROJECT_CONFIG_YAML = `
agents:
  oracle:
    temperature: 0.1
  frontend-engineer:
    temperature: 0.8
defaults:
  fallbackOnRateLimit: true
`;

// =============================================================================
// Load Agent Configs Tests
// =============================================================================

describe("loadAgentConfigs", () => {
  let testDir: string;
  let userHome: string;

  beforeEach(() => {
    testDir = createTestDir();
    userHome = createTestDir();
    clearConfigCache();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    rmSync(userHome, { recursive: true, force: true });
  });

  describe("basic loading", () => {
    it("should return builtin agents when no config files exist", async () => {
      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Should have builtin agents
      expect(result.agents).toBeDefined();
      expect(result.agents["yoyo-ai"]).toBeDefined();
      expect(result.agents["oracle"]).toBeDefined();
      expect(result.agents["librarian"]).toBeDefined();

      // All agents should have builtin source
      expect(result.agents["oracle"]?.sources).toContain("builtin");

      // No errors
      expect(result.errors).toHaveLength(0);
    });

    it("should load local agent overrides from .yoyo-dev/agents/", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      writeYamlFile(join(agentsDir, "oracle.yml"), SIMPLE_OVERRIDE_YAML);

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Oracle should have local overrides applied
      const oracle = result.agents["oracle"];
      expect(oracle).toBeDefined();
      expect(oracle?.temperature).toBe(0.2);
      expect(oracle?.model).toBe("anthropic/claude-sonnet-4-5");
      expect(oracle?.sources).toContain("local");
    });

    it("should load user-level config from ~/.yoyo-dev/config/agents.yml", async () => {
      const configDir = createUserConfigDir(userHome);
      writeYamlFile(join(configDir, "agents.yml"), SAMPLE_USER_AGENTS_YAML);

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Oracle should have user overrides (no local/project override)
      const oracle = result.agents["oracle"];
      expect(oracle).toBeDefined();
      expect(oracle?.temperature).toBe(0.15);
      expect(oracle?.preferFallback).toBe(true);
      expect(oracle?.sources).toContain("user");
    });

    it("should load project config from .yoyo-dev/config.yml", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      writeYamlFile(join(yoyoDevDir, "config.yml"), SAMPLE_PROJECT_CONFIG_YAML);

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Oracle should have project overrides
      const oracle = result.agents["oracle"];
      expect(oracle).toBeDefined();
      expect(oracle?.temperature).toBe(0.1);
      expect(oracle?.sources).toContain("project");
    });
  });

  describe("priority ordering", () => {
    it("should prioritize local > project > user > builtin", async () => {
      // Setup all config sources
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);
      const configDir = createUserConfigDir(userHome);

      // Local: temperature 0.2
      writeYamlFile(join(agentsDir, "oracle.yml"), SIMPLE_OVERRIDE_YAML);

      // Project: temperature 0.1
      writeYamlFile(join(yoyoDevDir, "config.yml"), SAMPLE_PROJECT_CONFIG_YAML);

      // User: temperature 0.15
      writeYamlFile(join(configDir, "agents.yml"), SAMPLE_USER_AGENTS_YAML);

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Local should win (0.2)
      const oracle = result.agents["oracle"];
      expect(oracle?.temperature).toBe(0.2);
      expect(oracle?.propertySource.temperature).toBe("local");
    });

    it("should fallback to project when local is missing", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const configDir = createUserConfigDir(userHome);

      // Project: temperature 0.1
      writeYamlFile(join(yoyoDevDir, "config.yml"), SAMPLE_PROJECT_CONFIG_YAML);

      // User: temperature 0.15
      writeYamlFile(join(configDir, "agents.yml"), SAMPLE_USER_AGENTS_YAML);

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Project should win (0.1)
      const oracle = result.agents["oracle"];
      expect(oracle?.temperature).toBe(0.1);
      expect(oracle?.propertySource.temperature).toBe("project");
    });

    it("should fallback to user when local and project are missing", async () => {
      const configDir = createUserConfigDir(userHome);

      // User: temperature 0.15
      writeYamlFile(join(configDir, "agents.yml"), SAMPLE_USER_AGENTS_YAML);

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // User should win (0.15)
      const oracle = result.agents["oracle"];
      expect(oracle?.temperature).toBe(0.15);
      expect(oracle?.propertySource.temperature).toBe("user");
    });

    it("should use builtin when no overrides exist", async () => {
      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Builtin oracle has temperature 0.1
      const oracle = result.agents["oracle"];
      expect(oracle?.temperature).toBe(0.1); // builtin value
      expect(oracle?.propertySource.temperature).toBe("builtin");
    });
  });

  describe("merging behavior", () => {
    it("should merge tools arrays when override has tools", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      writeYamlFile(
        join(agentsDir, "oracle.yml"),
        `
name: oracle
overrides:
  tools:
    - Read
    - Write
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      const oracle = result.agents["oracle"];
      // Tools should be replaced entirely by override
      expect(oracle?.tools).toEqual(["Read", "Write"]);
    });

    it("should preserve unoverridden properties from builtin", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      writeYamlFile(
        join(agentsDir, "oracle.yml"),
        `
name: oracle
overrides:
  temperature: 0.3
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      const oracle = result.agents["oracle"];
      // Temperature overridden
      expect(oracle?.temperature).toBe(0.3);
      // Other properties preserved from builtin
      expect(oracle?.role).toBe("Strategic Advisor");
      expect(oracle?.mode).toBe("subagent");
      expect(oracle?.systemPromptPath).toBe(".claude/agents/oracle.md");
    });

    it("should apply project defaults to all agents", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);

      writeYamlFile(
        join(yoyoDevDir, "config.yml"),
        `
agents: {}
defaults:
  preferFallback: true
  fallbackOnRateLimit: false
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // All agents should have defaults applied (unless overridden)
      const oracle = result.agents["oracle"];
      expect(oracle?.fallbackOnRateLimit).toBe(false);
    });
  });

  describe("source tracking", () => {
    it("should track which sources contributed to config", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      writeYamlFile(
        join(agentsDir, "oracle.yml"),
        `
name: oracle
overrides:
  temperature: 0.2
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      const oracle = result.agents["oracle"];
      expect(oracle?.sources).toContain("local");
      expect(oracle?.sources).toContain("builtin");
    });

    it("should track per-property source", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);
      const configDir = createUserConfigDir(userHome);

      // Local only overrides temperature
      writeYamlFile(
        join(agentsDir, "oracle.yml"),
        `
name: oracle
overrides:
  temperature: 0.2
`
      );

      // User only overrides preferFallback
      writeYamlFile(
        join(configDir, "agents.yml"),
        `
agents:
  oracle:
    preferFallback: true
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      const oracle = result.agents["oracle"];
      expect(oracle?.propertySource.temperature).toBe("local");
      expect(oracle?.propertySource.preferFallback).toBe("user");
      expect(oracle?.propertySource.role).toBe("builtin");
    });
  });

  describe("error handling", () => {
    it("should report YAML parsing errors", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      writeYamlFile(join(agentsDir, "oracle.yml"), "invalid: yaml: content:");

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.code).toBe("INVALID_YAML");
    });

    it("should continue loading other files when one fails", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      // Invalid YAML
      writeYamlFile(join(agentsDir, "oracle.yml"), "invalid: yaml: content:");

      // Valid YAML
      writeYamlFile(
        join(agentsDir, "librarian.yml"),
        `
name: librarian
overrides:
  temperature: 0.5
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      // Should have error for oracle
      expect(result.errors.length).toBeGreaterThan(0);

      // But librarian should still be loaded with override
      const librarian = result.agents["librarian"];
      expect(librarian?.temperature).toBe(0.5);
    });

    it("should report loaded files", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      writeYamlFile(
        join(agentsDir, "oracle.yml"),
        `
name: oracle
overrides:
  temperature: 0.2
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
      });

      expect(result.loadedFiles.length).toBeGreaterThan(0);
      const oracleFile = result.loadedFiles.find((f) =>
        f.path.includes("oracle.yml")
      );
      expect(oracleFile).toBeDefined();
      expect(oracleFile?.exists).toBe(true);
      expect(oracleFile?.source).toBe("local");
    });
  });

  describe("skip sources option", () => {
    it("should skip specified sources", async () => {
      const yoyoDevDir = createYoyoDevDir(testDir);
      const agentsDir = createAgentsDir(yoyoDevDir);

      writeYamlFile(
        join(agentsDir, "oracle.yml"),
        `
name: oracle
overrides:
  temperature: 0.2
`
      );

      const result = await loadAgentConfigs({
        projectRoot: testDir,
        userHome: userHome,
        skipSources: ["local"],
      });

      // Local override should not be applied
      const oracle = result.agents["oracle"];
      expect(oracle?.temperature).not.toBe(0.2);
      expect(oracle?.sources).not.toContain("local");
    });
  });
});

// =============================================================================
// Discover Local Agents Tests
// =============================================================================

describe("discoverLocalAgents", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should discover .yml files in .yoyo-dev/agents/", async () => {
    const yoyoDevDir = createYoyoDevDir(testDir);
    const agentsDir = createAgentsDir(yoyoDevDir);

    // Use valid YAML for oracle
    writeYamlFile(join(agentsDir, "oracle.yml"), SIMPLE_OVERRIDE_YAML);
    writeYamlFile(
      join(agentsDir, "custom-agent.yml"),
      `
name: custom-agent
overrides:
  temperature: 0.5
`
    );

    const discovered = await discoverLocalAgents(testDir);

    expect(discovered).toHaveLength(2);
    expect(discovered.map((d) => d.name)).toContain("oracle");
    expect(discovered.map((d) => d.name)).toContain("custom-agent");
  });

  it("should mark custom agents that are not in builtin", async () => {
    const yoyoDevDir = createYoyoDevDir(testDir);
    const agentsDir = createAgentsDir(yoyoDevDir);

    writeYamlFile(
      join(agentsDir, "my-custom-agent.yml"),
      `
name: my-custom-agent
overrides:
  temperature: 0.5
  role: Custom Agent
  model: anthropic/claude-sonnet-4-5
  mode: subagent
  tools:
    - Read
    - Write
  systemPromptPath: .claude/agents/my-custom-agent.md
`
    );

    const discovered = await discoverLocalAgents(testDir);

    const customAgent = discovered.find((d) => d.name === "my-custom-agent");
    expect(customAgent).toBeDefined();
    expect(customAgent?.isCustom).toBe(true);
  });

  it("should return empty array when agents directory does not exist", async () => {
    const discovered = await discoverLocalAgents(testDir);
    expect(discovered).toHaveLength(0);
  });

  it("should ignore non-yml files", async () => {
    const yoyoDevDir = createYoyoDevDir(testDir);
    const agentsDir = createAgentsDir(yoyoDevDir);

    writeYamlFile(join(agentsDir, "oracle.yml"), SIMPLE_OVERRIDE_YAML);
    writeYamlFile(join(agentsDir, "readme.md"), "# Agents directory");
    writeYamlFile(join(agentsDir, "config.json"), '{"key": "value"}');

    const discovered = await discoverLocalAgents(testDir);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]?.name).toBe("oracle");
  });
});

// =============================================================================
// Merge Agent Config Tests
// =============================================================================

describe("mergeAgentConfig", () => {
  it("should merge override into base config", () => {
    const base = {
      name: "oracle",
      role: "Strategic Advisor",
      model: "anthropic/claude-opus-4-5",
      temperature: 0.1,
      mode: "subagent" as const,
      tools: ["Read", "Grep"],
      systemPromptPath: ".claude/agents/oracle.md",
      enabled: true,
    };

    const override: AgentOverride = {
      name: "oracle",
      temperature: 0.2,
      tools: ["Read", "Write"],
    };

    const result = mergeAgentConfig(base, override, "local");

    expect(result.temperature).toBe(0.2);
    expect(result.tools).toEqual(["Read", "Write"]);
    expect(result.role).toBe("Strategic Advisor"); // preserved
    expect(result.propertySource.temperature).toBe("local");
    expect(result.propertySource.role).toBe("builtin");
  });

  it("should track all sources that contributed", () => {
    const base = {
      name: "oracle",
      role: "Strategic Advisor",
      model: "anthropic/claude-opus-4-5",
      temperature: 0.1,
      mode: "subagent" as const,
      tools: ["Read", "Grep"],
      systemPromptPath: ".claude/agents/oracle.md",
      enabled: true,
      sources: ["builtin" as ConfigSource],
      propertySource: {} as Record<string, ConfigSource>,
      isCustom: false,
    };

    const override: AgentOverride = {
      name: "oracle",
      temperature: 0.2,
    };

    const result = mergeAgentConfig(base, override, "local");

    expect(result.sources).toContain("local");
    expect(result.sources).toContain("builtin");
  });
});

// =============================================================================
// Caching Tests
// =============================================================================

describe("config caching", () => {
  let testDir: string;
  let userHome: string;

  beforeEach(() => {
    testDir = createTestDir();
    userHome = createTestDir();
    clearConfigCache();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    rmSync(userHome, { recursive: true, force: true });
  });

  it("should cache config results", async () => {
    const yoyoDevDir = createYoyoDevDir(testDir);
    const agentsDir = createAgentsDir(yoyoDevDir);

    writeYamlFile(
      join(agentsDir, "oracle.yml"),
      `
name: oracle
overrides:
  temperature: 0.2
`
    );

    // First load
    const result1 = await loadAgentConfigs({
      projectRoot: testDir,
      userHome: userHome,
      enableCache: true,
    });

    // Second load (should use cache)
    const result2 = await loadAgentConfigs({
      projectRoot: testDir,
      userHome: userHome,
      enableCache: true,
    });

    // Results should be the same object reference (cached)
    expect(result1).toBe(result2);
  });

  it("should invalidate cache when clearConfigCache is called", async () => {
    const yoyoDevDir = createYoyoDevDir(testDir);
    const agentsDir = createAgentsDir(yoyoDevDir);

    writeYamlFile(
      join(agentsDir, "oracle.yml"),
      `
name: oracle
overrides:
  temperature: 0.2
`
    );

    const result1 = await loadAgentConfigs({
      projectRoot: testDir,
      userHome: userHome,
      enableCache: true,
    });

    clearConfigCache();

    // Modify file
    writeYamlFile(
      join(agentsDir, "oracle.yml"),
      `
name: oracle
overrides:
  temperature: 0.5
`
    );

    const result2 = await loadAgentConfigs({
      projectRoot: testDir,
      userHome: userHome,
      enableCache: true,
    });

    // Results should be different
    expect(result1).not.toBe(result2);
    expect(result2.agents["oracle"]?.temperature).toBe(0.5);
  });

  it("should not cache when enableCache is false", async () => {
    const result1 = await loadAgentConfigs({
      projectRoot: testDir,
      userHome: userHome,
      enableCache: false,
    });

    const result2 = await loadAgentConfigs({
      projectRoot: testDir,
      userHome: userHome,
      enableCache: false,
    });

    // Results should be different objects
    expect(result1).not.toBe(result2);
  });
});
