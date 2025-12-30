/**
 * Hook Registry Tests
 *
 * TDD-based tests for the hook infrastructure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HookRegistry, hookRegistry } from "../registry.js";
import type {
  HookDefinition,
  HookEvent,
  HookContext,
  HookResult,
} from "../types.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createTestHook(overrides: Partial<HookDefinition> = {}): HookDefinition {
  return {
    name: "test-hook",
    event: "sessionStart" as HookEvent,
    priority: 100,
    enabled: true,
    handler: async () => ({ action: "continue" as const }),
    ...overrides,
  };
}

function createTestContext(
  overrides: Partial<Omit<HookContext, "event">> = {}
): Omit<HookContext, "event"> {
  return {
    sessionId: "test-session-123",
    timestamp: new Date(),
    metadata: {},
    ...overrides,
  };
}

// =============================================================================
// Hook Registry Initialization Tests
// =============================================================================

describe("HookRegistry Initialization", () => {
  it("should create a new registry instance", () => {
    const registry = new HookRegistry();
    expect(registry).toBeInstanceOf(HookRegistry);
  });

  it("should start with no hooks registered", () => {
    const registry = new HookRegistry();
    expect(registry.getByEvent("sessionStart")).toHaveLength(0);
  });

  it("should export a singleton instance", () => {
    expect(hookRegistry).toBeInstanceOf(HookRegistry);
  });

  it("should accept debug option in constructor", () => {
    const registry = new HookRegistry({ debug: true });
    expect(registry).toBeInstanceOf(HookRegistry);
  });
});

// =============================================================================
// Hook Registration Tests
// =============================================================================

describe("HookRegistry.register", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should register a hook", () => {
    const hook = createTestHook();
    registry.register(hook);

    const hooks = registry.getByEvent("sessionStart");
    expect(hooks).toHaveLength(1);
    expect(hooks[0]?.name).toBe("test-hook");
  });

  it("should register multiple hooks for the same event", () => {
    registry.register(createTestHook({ name: "hook-1" }));
    registry.register(createTestHook({ name: "hook-2" }));

    const hooks = registry.getByEvent("sessionStart");
    expect(hooks).toHaveLength(2);
  });

  it("should register hooks for different events", () => {
    registry.register(createTestHook({ name: "start-hook", event: "sessionStart" }));
    registry.register(createTestHook({ name: "end-hook", event: "sessionEnd" }));

    expect(registry.getByEvent("sessionStart")).toHaveLength(1);
    expect(registry.getByEvent("sessionEnd")).toHaveLength(1);
  });

  it("should replace hook with same name", () => {
    const handler1 = vi.fn(async () => ({ action: "continue" as const }));
    const handler2 = vi.fn(async () => ({ action: "log" as const, message: "replaced" }));

    registry.register(createTestHook({ handler: handler1 }));
    registry.register(createTestHook({ handler: handler2 }));

    const hooks = registry.getByEvent("sessionStart");
    expect(hooks).toHaveLength(1);
  });

  it("should not register disabled hooks for execution", () => {
    registry.register(createTestHook({ enabled: false }));

    // Disabled hooks are registered but filtered during execution
    const hooks = registry.getByEvent("sessionStart");
    expect(hooks).toHaveLength(1);
    expect(hooks[0]?.enabled).toBe(false);
  });

  it("should store hook config when provided", () => {
    const hook = createTestHook({
      config: { cooldown: 5000, maxRetries: 3 },
    });
    registry.register(hook);

    const registered = registry.get("test-hook");
    expect(registered?.config).toEqual({ cooldown: 5000, maxRetries: 3 });
  });
});

// =============================================================================
// Hook Unregistration Tests
// =============================================================================

describe("HookRegistry.unregister", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should unregister a hook by name", () => {
    registry.register(createTestHook());
    registry.unregister("test-hook");

    expect(registry.getByEvent("sessionStart")).toHaveLength(0);
  });

  it("should return true when hook was unregistered", () => {
    registry.register(createTestHook());
    const result = registry.unregister("test-hook");

    expect(result).toBe(true);
  });

  it("should return false when hook not found", () => {
    const result = registry.unregister("non-existent");

    expect(result).toBe(false);
  });

  it("should only unregister the specified hook", () => {
    registry.register(createTestHook({ name: "hook-1" }));
    registry.register(createTestHook({ name: "hook-2" }));

    registry.unregister("hook-1");

    const hooks = registry.getByEvent("sessionStart");
    expect(hooks).toHaveLength(1);
    expect(hooks[0]?.name).toBe("hook-2");
  });

  it("should clean up event index when last hook for event is removed", () => {
    registry.register(createTestHook({ name: "only-hook", event: "sessionStart" }));
    registry.unregister("only-hook");

    expect(registry.getByEvent("sessionStart")).toHaveLength(0);
  });
});

// =============================================================================
// Priority Ordering Tests
// =============================================================================

describe("HookRegistry Priority Ordering", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should return hooks sorted by priority (lower first)", () => {
    registry.register(createTestHook({ name: "low-priority", priority: 100 }));
    registry.register(createTestHook({ name: "high-priority", priority: 10 }));
    registry.register(createTestHook({ name: "medium-priority", priority: 50 }));

    const hooks = registry.getByEvent("sessionStart");

    expect(hooks[0]?.name).toBe("high-priority");
    expect(hooks[1]?.name).toBe("medium-priority");
    expect(hooks[2]?.name).toBe("low-priority");
  });

  it("should maintain registration order for same priority", () => {
    registry.register(createTestHook({ name: "first", priority: 50 }));
    registry.register(createTestHook({ name: "second", priority: 50 }));
    registry.register(createTestHook({ name: "third", priority: 50 }));

    const hooks = registry.getByEvent("sessionStart");

    expect(hooks[0]?.name).toBe("first");
    expect(hooks[1]?.name).toBe("second");
    expect(hooks[2]?.name).toBe("third");
  });

  it("should handle negative priorities", () => {
    registry.register(createTestHook({ name: "normal", priority: 0 }));
    registry.register(createTestHook({ name: "urgent", priority: -10 }));

    const hooks = registry.getByEvent("sessionStart");

    expect(hooks[0]?.name).toBe("urgent");
    expect(hooks[1]?.name).toBe("normal");
  });
});

// =============================================================================
// Hook Execution Tests
// =============================================================================

describe("HookRegistry.execute", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should execute hooks for an event", async () => {
    const handler = vi.fn(async () => ({ action: "continue" as const }));
    registry.register(createTestHook({ handler }));

    await registry.execute("sessionStart", createTestContext());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should pass correct context to handlers", async () => {
    const handler = vi.fn(async (ctx: HookContext) => {
      expect(ctx.event).toBe("sessionStart");
      expect(ctx.sessionId).toBe("my-session");
      return { action: "continue" as const };
    });

    registry.register(createTestHook({ handler }));

    await registry.execute("sessionStart", createTestContext({ sessionId: "my-session" }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should execute hooks in priority order", async () => {
    const order: string[] = [];

    registry.register(
      createTestHook({
        name: "third",
        priority: 100,
        handler: async () => {
          order.push("third");
          return { action: "continue" };
        },
      })
    );
    registry.register(
      createTestHook({
        name: "first",
        priority: 10,
        handler: async () => {
          order.push("first");
          return { action: "continue" };
        },
      })
    );
    registry.register(
      createTestHook({
        name: "second",
        priority: 50,
        handler: async () => {
          order.push("second");
          return { action: "continue" };
        },
      })
    );

    await registry.execute("sessionStart", createTestContext());

    expect(order).toEqual(["first", "second", "third"]);
  });

  it("should skip disabled hooks", async () => {
    const handler = vi.fn(async () => ({ action: "continue" as const }));
    registry.register(createTestHook({ handler, enabled: false }));

    await registry.execute("sessionStart", createTestContext());

    expect(handler).not.toHaveBeenCalled();
  });

  it("should only execute hooks for the specified event", async () => {
    const startHandler = vi.fn(async () => ({ action: "continue" as const }));
    const endHandler = vi.fn(async () => ({ action: "continue" as const }));

    registry.register(createTestHook({ name: "start", event: "sessionStart", handler: startHandler }));
    registry.register(createTestHook({ name: "end", event: "sessionEnd", handler: endHandler }));

    await registry.execute("sessionStart", createTestContext());

    expect(startHandler).toHaveBeenCalledTimes(1);
    expect(endHandler).not.toHaveBeenCalled();
  });

  it("should return execution results", async () => {
    registry.register(
      createTestHook({
        handler: async () => ({ action: "log", message: "test message" }),
      })
    );

    const results = await registry.execute("sessionStart", createTestContext());

    expect(results).toHaveLength(1);
    expect(results[0]?.success).toBe(true);
    expect(results[0]?.result?.action).toBe("log");
    expect(results[0]?.result?.message).toBe("test message");
  });

  it("should return empty array when no hooks registered for event", async () => {
    const results = await registry.execute("sessionStart", createTestContext());
    expect(results).toHaveLength(0);
  });

  it("should handle hooks returning data", async () => {
    registry.register(
      createTestHook({
        handler: async () => ({
          action: "notify",
          message: "Found issues",
          data: { count: 5, issues: ["a", "b"] },
        }),
      })
    );

    const results = await registry.execute("sessionStart", createTestContext());

    expect(results[0]?.result?.data).toEqual({ count: 5, issues: ["a", "b"] });
  });
});

// =============================================================================
// Error Handling Tests (3.4)
// =============================================================================

describe("HookRegistry Error Handling", () => {
  let registry: HookRegistry;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    registry = new HookRegistry();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should continue execution when a hook throws", async () => {
    const order: string[] = [];

    registry.register(
      createTestHook({
        name: "first",
        priority: 10,
        handler: async () => {
          order.push("first");
          return { action: "continue" };
        },
      })
    );
    registry.register(
      createTestHook({
        name: "failing",
        priority: 50,
        handler: async () => {
          order.push("failing");
          throw new Error("Hook failed");
        },
      })
    );
    registry.register(
      createTestHook({
        name: "last",
        priority: 100,
        handler: async () => {
          order.push("last");
          return { action: "continue" };
        },
      })
    );

    await registry.execute("sessionStart", createTestContext());

    // All hooks should execute even if one fails
    expect(order).toEqual(["first", "failing", "last"]);
  });

  it("should capture error in execution result", async () => {
    registry.register(
      createTestHook({
        handler: async () => {
          throw new Error("Test error");
        },
      })
    );

    const results = await registry.execute("sessionStart", createTestContext());

    expect(results).toHaveLength(1);
    expect(results[0]?.success).toBe(false);
    expect(results[0]?.error?.message).toBe("Test error");
  });

  it("should log errors but not throw", async () => {
    registry.register(
      createTestHook({
        handler: async () => {
          throw new Error("Test error");
        },
      })
    );

    // Should not throw
    await expect(registry.execute("sessionStart", createTestContext())).resolves.toBeDefined();

    // Should log error
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should include timing information on both success and failure", async () => {
    registry.register(
      createTestHook({
        name: "success",
        priority: 10,
        handler: async () => ({ action: "continue" }),
      })
    );
    registry.register(
      createTestHook({
        name: "failure",
        priority: 20,
        handler: async () => {
          throw new Error("Fail");
        },
      })
    );

    const results = await registry.execute("sessionStart", createTestContext());

    expect(results[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(results[1]?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should handle non-Error throws", async () => {
    registry.register(
      createTestHook({
        handler: async () => {
          throw "string error";
        },
      })
    );

    const results = await registry.execute("sessionStart", createTestContext());

    expect(results[0]?.success).toBe(false);
    expect(results[0]?.error?.message).toBe("string error");
  });

  it("should include hook name in error result", async () => {
    registry.register(
      createTestHook({
        name: "my-failing-hook",
        handler: async () => {
          throw new Error("Oops");
        },
      })
    );

    const results = await registry.execute("sessionStart", createTestContext());

    expect(results[0]?.hookName).toBe("my-failing-hook");
  });
});

// =============================================================================
// Get By Event Tests
// =============================================================================

describe("HookRegistry.getByEvent", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should return empty array for no registered hooks", () => {
    const hooks = registry.getByEvent("sessionStart");
    expect(hooks).toEqual([]);
  });

  it("should return only hooks for specified event", () => {
    registry.register(createTestHook({ name: "start", event: "sessionStart" }));
    registry.register(createTestHook({ name: "end", event: "sessionEnd" }));
    registry.register(createTestHook({ name: "error", event: "errorOccurred" }));

    const startHooks = registry.getByEvent("sessionStart");
    expect(startHooks).toHaveLength(1);
    expect(startHooks[0]?.name).toBe("start");
  });

  it("should return hooks sorted by priority", () => {
    registry.register(createTestHook({ name: "low", priority: 100 }));
    registry.register(createTestHook({ name: "high", priority: 1 }));

    const hooks = registry.getByEvent("sessionStart");

    expect(hooks[0]?.name).toBe("high");
    expect(hooks[1]?.name).toBe("low");
  });
});

// =============================================================================
// Get Hook Tests
// =============================================================================

describe("HookRegistry.get", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should return hook by name", () => {
    registry.register(createTestHook({ name: "my-hook" }));

    const hook = registry.get("my-hook");
    expect(hook?.name).toBe("my-hook");
  });

  it("should return undefined for non-existent hook", () => {
    const hook = registry.get("non-existent");
    expect(hook).toBeUndefined();
  });
});

// =============================================================================
// Has Hook Tests
// =============================================================================

describe("HookRegistry.has", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should return true for registered hook", () => {
    registry.register(createTestHook({ name: "my-hook" }));
    expect(registry.has("my-hook")).toBe(true);
  });

  it("should return false for non-existent hook", () => {
    expect(registry.has("non-existent")).toBe(false);
  });
});

// =============================================================================
// Enable/Disable Tests
// =============================================================================

describe("HookRegistry.enable", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should enable a disabled hook", () => {
    registry.register(createTestHook({ name: "my-hook", enabled: false }));

    const result = registry.enable("my-hook");

    expect(result).toBe(true);
    expect(registry.get("my-hook")?.enabled).toBe(true);
  });

  it("should return false for non-existent hook", () => {
    const result = registry.enable("non-existent");
    expect(result).toBe(false);
  });

  it("should keep enabled hook enabled", () => {
    registry.register(createTestHook({ name: "my-hook", enabled: true }));

    registry.enable("my-hook");

    expect(registry.get("my-hook")?.enabled).toBe(true);
  });
});

describe("HookRegistry.disable", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should disable an enabled hook", () => {
    registry.register(createTestHook({ name: "my-hook", enabled: true }));

    const result = registry.disable("my-hook");

    expect(result).toBe(true);
    expect(registry.get("my-hook")?.enabled).toBe(false);
  });

  it("should return false for non-existent hook", () => {
    const result = registry.disable("non-existent");
    expect(result).toBe(false);
  });

  it("should prevent disabled hook from executing", async () => {
    const handler = vi.fn(async () => ({ action: "continue" as const }));
    registry.register(createTestHook({ name: "my-hook", handler }));

    registry.disable("my-hook");
    await registry.execute("sessionStart", createTestContext());

    expect(handler).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Clear and Reset Tests
// =============================================================================

describe("HookRegistry.clear", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should remove all registered hooks", () => {
    registry.register(createTestHook({ name: "hook-1", event: "sessionStart" }));
    registry.register(createTestHook({ name: "hook-2", event: "sessionEnd" }));

    registry.clear();

    expect(registry.getByEvent("sessionStart")).toHaveLength(0);
    expect(registry.getByEvent("sessionEnd")).toHaveLength(0);
  });

  it("should reset listAll to empty", () => {
    registry.register(createTestHook({ name: "hook-1" }));
    registry.register(createTestHook({ name: "hook-2" }));

    registry.clear();

    expect(registry.listAll()).toHaveLength(0);
  });
});

// =============================================================================
// Get Stats Tests
// =============================================================================

describe("HookRegistry.getStats", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should return hook counts by event", () => {
    registry.register(createTestHook({ name: "start-1", event: "sessionStart" }));
    registry.register(createTestHook({ name: "start-2", event: "sessionStart" }));
    registry.register(createTestHook({ name: "end-1", event: "sessionEnd" }));
    registry.register(createTestHook({ name: "error-1", event: "errorOccurred" }));
    registry.register(createTestHook({ name: "error-2", event: "errorOccurred" }));
    registry.register(createTestHook({ name: "error-3", event: "errorOccurred" }));

    const stats = registry.getStats();

    expect(stats.sessionStart).toBe(2);
    expect(stats.sessionEnd).toBe(1);
    expect(stats.errorOccurred).toBe(3);
  });

  it("should return empty stats for empty registry", () => {
    const stats = registry.getStats();

    // Should be an empty object or have undefined/0 values
    expect(stats.sessionStart).toBeUndefined();
  });
});

// =============================================================================
// All Events Tests
// =============================================================================

describe("HookRegistry Event Types", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  const allEvents: HookEvent[] = [
    "sessionStart",
    "sessionEnd",
    "preToolUse",
    "postToolUse",
    "errorOccurred",
    "agentSwitch",
    "todoUpdated",
    "fileChanged",
  ];

  it.each(allEvents)("should support %s event", async (event) => {
    const handler = vi.fn(async () => ({ action: "continue" as const }));
    registry.register(createTestHook({ event, handler }));

    await registry.execute(event, createTestContext());

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Tool-related Events Tests
// =============================================================================

describe("HookRegistry Tool Events", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should pass tool name in preToolUse context", async () => {
    let capturedContext: HookContext | undefined;
    registry.register(
      createTestHook({
        event: "preToolUse",
        handler: async (ctx) => {
          capturedContext = ctx;
          return { action: "log", message: "Logging pre-tool use" };
        },
      })
    );

    await registry.execute("preToolUse", createTestContext({ toolName: "Write" }));

    expect(capturedContext?.toolName).toBe("Write");
  });

  it("should pass tool result in postToolUse context", async () => {
    let capturedContext: HookContext | undefined;
    registry.register(
      createTestHook({
        event: "postToolUse",
        handler: async (ctx) => {
          capturedContext = ctx;
          return { action: "continue" };
        },
      })
    );

    await registry.execute("postToolUse", createTestContext({
      toolName: "Read",
      toolResult: { content: "file content" },
    }));

    expect(capturedContext?.toolName).toBe("Read");
    expect(capturedContext?.toolResult).toEqual({ content: "file content" });
  });

  it("should pass error in errorOccurred context", async () => {
    let capturedContext: HookContext | undefined;
    const testError = new Error("Test error");

    registry.register(
      createTestHook({
        event: "errorOccurred",
        handler: async (ctx) => {
          capturedContext = ctx;
          return { action: "notify", message: "Error occurred" };
        },
      })
    );

    await registry.execute("errorOccurred", createTestContext({ error: testError }));

    expect(capturedContext?.error).toBe(testError);
  });
});

// =============================================================================
// Agent Switch Event Tests
// =============================================================================

describe("HookRegistry Agent Switch Events", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should pass agent name in agentSwitch context", async () => {
    let capturedContext: HookContext | undefined;
    registry.register(
      createTestHook({
        event: "agentSwitch",
        handler: async (ctx) => {
          capturedContext = ctx;
          return { action: "continue" };
        },
      })
    );

    await registry.execute("agentSwitch", createTestContext({
      agentName: "oracle",
      metadata: { previousAgent: "yoyo-ai" },
    }));

    expect(capturedContext?.agentName).toBe("oracle");
    expect(capturedContext?.metadata?.previousAgent).toBe("yoyo-ai");
  });
});

// =============================================================================
// Todo Updated Event Tests
// =============================================================================

describe("HookRegistry Todo Updated Events", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should pass todo data in todoUpdated context", async () => {
    let capturedContext: HookContext | undefined;
    registry.register(
      createTestHook({
        event: "todoUpdated",
        handler: async (ctx) => {
          capturedContext = ctx;
          return { action: "log", message: "Todo updated" };
        },
      })
    );

    await registry.execute("todoUpdated", createTestContext({
      metadata: {
        todo: {
          content: "Implement feature X",
          status: "completed",
          activeForm: "task",
        },
      },
    }));

    expect(capturedContext?.metadata?.todo).toEqual({
      content: "Implement feature X",
      status: "completed",
      activeForm: "task",
    });
  });
});

// =============================================================================
// File Changed Event Tests
// =============================================================================

describe("HookRegistry File Changed Events", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should pass file path in fileChanged context", async () => {
    let capturedContext: HookContext | undefined;
    registry.register(
      createTestHook({
        event: "fileChanged",
        handler: async (ctx) => {
          capturedContext = ctx;
          return { action: "continue" };
        },
      })
    );

    await registry.execute("fileChanged", createTestContext({
      metadata: {
        filePath: "/src/components/Button.tsx",
        changeType: "modified",
      },
    }));

    expect(capturedContext?.metadata?.filePath).toBe("/src/components/Button.tsx");
    expect(capturedContext?.metadata?.changeType).toBe("modified");
  });
});

// =============================================================================
// List All Hooks Tests
// =============================================================================

describe("HookRegistry.listAll", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("should return all registered hooks", () => {
    registry.register(createTestHook({ name: "hook-1", event: "sessionStart" }));
    registry.register(createTestHook({ name: "hook-2", event: "sessionEnd" }));
    registry.register(createTestHook({ name: "hook-3", event: "errorOccurred" }));

    const allHooks = registry.listAll();

    expect(allHooks).toHaveLength(3);
    expect(allHooks.map((h) => h.name).sort()).toEqual(["hook-1", "hook-2", "hook-3"]);
  });

  it("should return empty array when no hooks", () => {
    expect(registry.listAll()).toEqual([]);
  });
});

// =============================================================================
// Debug Mode Tests
// =============================================================================

describe("HookRegistry Debug Mode", () => {
  let registry: HookRegistry;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    registry = new HookRegistry({ debug: true });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log when registering a hook in debug mode", () => {
    registry.register(createTestHook({ name: "debug-hook" }));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Registered hook: debug-hook")
    );
  });

  it("should log when unregistering a hook in debug mode", () => {
    registry.register(createTestHook({ name: "debug-hook" }));
    consoleSpy.mockClear();

    registry.unregister("debug-hook");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unregistered hook: debug-hook")
    );
  });

  it("should log when clearing hooks in debug mode", () => {
    registry.register(createTestHook({ name: "hook-1" }));
    consoleSpy.mockClear();

    registry.clear();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("All hooks cleared")
    );
  });
});
