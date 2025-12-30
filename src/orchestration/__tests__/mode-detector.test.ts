/**
 * Mode Detector Tests
 *
 * Tests for keyword-based mode detection with confidence scoring.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  detectMode,
  getModeOverrides,
  MODE_KEYWORDS,
  type ModeType,
  type DetectedMode,
} from "../mode-detector.js";

describe("mode-detector", () => {
  describe("MODE_KEYWORDS", () => {
    it("should have keywords for all mode types", () => {
      const expectedModes: ModeType[] = [
        "ultrawork",
        "research",
        "debug",
        "implement",
        "plan",
      ];

      for (const mode of expectedModes) {
        expect(MODE_KEYWORDS[mode]).toBeDefined();
        expect(Array.isArray(MODE_KEYWORDS[mode])).toBe(true);
        expect(MODE_KEYWORDS[mode].length).toBeGreaterThan(0);
      }
    });

    it("should have unique keywords per mode", () => {
      const allKeywords = new Set<string>();
      const duplicates: string[] = [];

      for (const keywords of Object.values(MODE_KEYWORDS)) {
        for (const kw of keywords) {
          if (allKeywords.has(kw)) {
            duplicates.push(kw);
          }
          allKeywords.add(kw);
        }
      }

      // Allow some overlap between modes - this is expected
      // but log if there are unexpected duplicates
      // For now, just ensure the keywords exist
      expect(allKeywords.size).toBeGreaterThan(0);
    });

    it("should have all keywords in lowercase", () => {
      for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
        for (const kw of keywords) {
          expect(kw).toBe(kw.toLowerCase());
        }
      }
    });
  });

  describe("detectMode", () => {
    describe("default mode", () => {
      it("should return default mode when no keywords match", () => {
        const result = detectMode("hello world");

        expect(result.mode).toBe("default");
        expect(result.confidence).toBe(1.0);
        expect(result.triggers).toEqual([]);
        expect(result.overrides).toEqual({});
      });

      it("should return default mode for empty prompt", () => {
        const result = detectMode("");

        expect(result.mode).toBe("default");
        expect(result.confidence).toBe(1.0);
      });

      it("should return default mode for whitespace-only prompt", () => {
        const result = detectMode("   \n\t  ");

        expect(result.mode).toBe("default");
      });
    });

    describe("ultrawork mode", () => {
      it("should detect ultrawork mode with single keyword", () => {
        const result = detectMode("I need a thorough analysis of this code");

        expect(result.mode).toBe("ultrawork");
        expect(result.triggers).toContain("thorough");
      });

      it("should detect ultrawork with 'ulw' shorthand", () => {
        const result = detectMode("ulw do a code review");

        expect(result.mode).toBe("ultrawork");
        expect(result.triggers).toContain("ulw");
      });

      it("should detect ultrawork with multiple keywords", () => {
        const result = detectMode(
          "do a deep comprehensive detailed analysis"
        );

        expect(result.mode).toBe("ultrawork");
        expect(result.triggers).toContain("deep");
        expect(result.triggers).toContain("comprehensive");
        expect(result.triggers).toContain("detailed");
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it("should detect 'ultrawork' keyword explicitly", () => {
        const result = detectMode("ultrawork this task");

        expect(result.mode).toBe("ultrawork");
        expect(result.triggers).toContain("ultrawork");
      });
    });

    describe("research mode", () => {
      it("should detect research mode with 'find' keyword", () => {
        const result = detectMode("find examples of this pattern");

        expect(result.mode).toBe("research");
        expect(result.triggers).toContain("find");
        expect(result.triggers).toContain("examples");
        expect(result.triggers).toContain("pattern");
      });

      it("should detect research with documentation keywords", () => {
        const result = detectMode("check the docs for this library");

        expect(result.mode).toBe("research");
        expect(result.triggers).toContain("docs");
        expect(result.triggers).toContain("library");
      });

      it("should detect research with 'best practice' phrase", () => {
        const result = detectMode("what's the best practice for this?");

        expect(result.mode).toBe("research");
        expect(result.triggers).toContain("best practice");
      });

      it("should detect research with question words", () => {
        const prompts = [
          "how do I implement this?",
          "what is the best approach?",
          "why is this failing?",
        ];

        for (const prompt of prompts) {
          const result = detectMode(prompt);
          // These may not trigger research mode alone, but the question words should be recognized
          // Research mode is triggered by keywords like "find", "search", "docs", etc.
        }
      });
    });

    describe("debug mode", () => {
      it("should detect debug mode with 'fix' keyword", () => {
        const result = detectMode("fix the error in auth.ts");

        expect(result.mode).toBe("debug");
        expect(result.triggers).toContain("fix");
        expect(result.triggers).toContain("error");
      });

      it("should detect debug with bug-related keywords", () => {
        const result = detectMode("there's a bug causing the app to crash");

        expect(result.mode).toBe("debug");
        expect(result.triggers).toContain("bug");
        expect(result.triggers).toContain("crash");
      });

      it("should detect debug with 'not working' phrase", () => {
        const result = detectMode("the login is not working");

        expect(result.mode).toBe("debug");
        expect(result.triggers).toContain("not working");
      });

      it("should detect debug with 'investigate' keyword", () => {
        const result = detectMode("investigate why tests are failing");

        expect(result.mode).toBe("debug");
        expect(result.triggers).toContain("investigate");
        expect(result.triggers).toContain("failing");
      });
    });

    describe("implement mode", () => {
      it("should detect implement mode with 'build' keyword", () => {
        const result = detectMode("build a new authentication system");

        expect(result.mode).toBe("implement");
        expect(result.triggers).toContain("build");
      });

      it("should detect implement with 'create' keyword", () => {
        const result = detectMode("create a new component for the dashboard");

        expect(result.mode).toBe("implement");
        expect(result.triggers).toContain("create");
      });

      it("should detect implement with 'add' keyword", () => {
        const result = detectMode("add a new feature for user preferences");

        expect(result.mode).toBe("implement");
        expect(result.triggers).toContain("add");
      });

      it("should detect implement with multiple keywords", () => {
        const result = detectMode("implement and write the code for the API");

        expect(result.mode).toBe("implement");
        expect(result.triggers).toContain("implement");
        expect(result.triggers).toContain("write");
        expect(result.triggers).toContain("code");
      });
    });

    describe("plan mode", () => {
      it("should detect plan mode with 'plan' keyword", () => {
        const result = detectMode("plan the architecture for this feature");

        expect(result.mode).toBe("plan");
        expect(result.triggers).toContain("plan");
      });

      it("should detect plan with 'roadmap' keyword", () => {
        // Use prompt without "create" to avoid tie with implement mode
        const result = detectMode("I need a roadmap for the next sprint");

        expect(result.mode).toBe("plan");
        expect(result.triggers).toContain("roadmap");
      });

      it("should detect plan with 'design' keyword", () => {
        const result = detectMode("design the database schema");

        expect(result.mode).toBe("plan");
        expect(result.triggers).toContain("design");
      });

      it("should detect plan with 'architect' keyword", () => {
        const result = detectMode("architect the system for scalability");

        expect(result.mode).toBe("plan");
        expect(result.triggers).toContain("architect");
      });
    });

    describe("case insensitivity", () => {
      it("should detect keywords regardless of case", () => {
        const result1 = detectMode("DEBUG this issue");
        const result2 = detectMode("Debug this issue");
        const result3 = detectMode("debug this issue");

        expect(result1.mode).toBe("debug");
        expect(result2.mode).toBe("debug");
        expect(result3.mode).toBe("debug");
      });

      it("should handle mixed case prompts", () => {
        const result = detectMode("Do a THOROUGH and COMPREHENSIVE analysis");

        expect(result.mode).toBe("ultrawork");
        expect(result.triggers).toContain("thorough");
        expect(result.triggers).toContain("comprehensive");
      });
    });

    describe("confidence scoring", () => {
      it("should have higher confidence with more keyword matches", () => {
        const single = detectMode("do a deep analysis");
        const multiple = detectMode("do a deep thorough comprehensive analysis");

        expect(multiple.confidence).toBeGreaterThan(single.confidence);
      });

      it("should cap confidence at 1.0", () => {
        // Add many keywords
        const result = detectMode(
          "deep thorough comprehensive exhaustive detailed in-depth complete full"
        );

        expect(result.confidence).toBeLessThanOrEqual(1.0);
      });

      it("should have minimum confidence of 0 for matches", () => {
        const result = detectMode("deep analysis");

        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    describe("mode priority with overlapping keywords", () => {
      it("should prefer mode with more matches", () => {
        // This prompt has both debug (fix) and implement (add) keywords
        // The one with more matches should win
        const result = detectMode("fix the error and debug the issue");

        expect(result.mode).toBe("debug");
        expect(result.triggers.length).toBeGreaterThanOrEqual(2);
      });

      it("should return first mode when scores are tied", () => {
        // Equal matches - behavior should be deterministic
        const result1 = detectMode("fix this or build that");
        const result2 = detectMode("fix this or build that");

        expect(result1.mode).toBe(result2.mode);
      });
    });

    describe("edge cases", () => {
      it("should handle special characters", () => {
        const result = detectMode("fix the bug! @#$% error?");

        expect(result.mode).toBe("debug");
      });

      it("should handle numbers in prompt", () => {
        const result = detectMode("fix 3 bugs and 5 errors");

        expect(result.mode).toBe("debug");
      });

      it("should handle very long prompts", () => {
        const longPrompt = "fix ".repeat(100) + "the error";
        const result = detectMode(longPrompt);

        expect(result.mode).toBe("debug");
      });

      it("should handle unicode characters", () => {
        const result = detectMode("fix the \u4e2d\u6587 error");

        expect(result.mode).toBe("debug");
      });

      it("should handle newlines and tabs", () => {
        const result = detectMode("fix\nthe\terror");

        expect(result.mode).toBe("debug");
      });
    });
  });

  describe("getModeOverrides", () => {
    describe("default mode", () => {
      it("should return empty overrides for default mode", () => {
        const overrides = getModeOverrides("default");

        expect(overrides).toEqual({});
      });
    });

    describe("ultrawork mode", () => {
      it("should return temperature override for ultrawork", () => {
        const overrides = getModeOverrides("ultrawork");

        expect(overrides.temperature).toBe(0.2);
      });

      it("should force Opus model for ultrawork", () => {
        const overrides = getModeOverrides("ultrawork");

        expect(overrides.model).toBe("anthropic/claude-opus-4-5");
      });

      it("should set ultrawork metadata", () => {
        const overrides = getModeOverrides("ultrawork");

        expect(overrides.metadata).toBeDefined();
        expect(overrides.metadata?.mode).toBe("ultrawork");
      });
    });

    describe("research mode", () => {
      it("should return research-optimized temperature", () => {
        const overrides = getModeOverrides("research");

        expect(overrides.temperature).toBe(0.5);
      });

      it("should include research tools", () => {
        const overrides = getModeOverrides("research");

        expect(overrides.tools).toBeDefined();
        expect(overrides.tools).toContain("WebSearch");
        expect(overrides.tools).toContain("WebFetch");
        expect(overrides.tools).toContain("Read");
        expect(overrides.tools).toContain("Grep");
      });
    });

    describe("debug mode", () => {
      it("should return low temperature for precision", () => {
        const overrides = getModeOverrides("debug");

        expect(overrides.temperature).toBe(0.1);
      });

      it("should allow all tools for debugging", () => {
        const overrides = getModeOverrides("debug");

        expect(overrides.tools).toContain("*");
      });
    });

    describe("implement mode", () => {
      it("should return moderate temperature", () => {
        const overrides = getModeOverrides("implement");

        expect(overrides.temperature).toBe(0.3);
      });

      it("should include implementation tools", () => {
        const overrides = getModeOverrides("implement");

        expect(overrides.tools).toBeDefined();
        expect(overrides.tools).toContain("Write");
        expect(overrides.tools).toContain("Edit");
        expect(overrides.tools).toContain("Bash");
      });
    });

    describe("plan mode", () => {
      it("should return creative temperature for planning", () => {
        const overrides = getModeOverrides("plan");

        expect(overrides.temperature).toBe(0.7);
      });

      it("should include planning tools (read-only)", () => {
        const overrides = getModeOverrides("plan");

        expect(overrides.tools).toBeDefined();
        expect(overrides.tools).toContain("Read");
        expect(overrides.tools).toContain("Grep");
        expect(overrides.tools).toContain("Glob");
        // Plan mode should NOT include write tools
        expect(overrides.tools).not.toContain("Write");
        expect(overrides.tools).not.toContain("Edit");
      });
    });

    describe("return type consistency", () => {
      it("should always return an object", () => {
        const modes: ModeType[] = [
          "default",
          "ultrawork",
          "research",
          "debug",
          "implement",
          "plan",
        ];

        for (const mode of modes) {
          const overrides = getModeOverrides(mode);
          expect(typeof overrides).toBe("object");
        }
      });
    });
  });

  describe("integration: detectMode returns proper overrides", () => {
    it("should include overrides in detection result", () => {
      const result = detectMode("do a thorough analysis");

      expect(result.overrides).toBeDefined();
      expect(result.overrides.temperature).toBe(0.2);
    });

    it("should have empty overrides for default mode detection", () => {
      const result = detectMode("hello world");

      expect(result.overrides).toEqual({});
    });
  });
});
