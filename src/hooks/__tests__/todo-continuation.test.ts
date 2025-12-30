/**
 * Todo Continuation Hook Tests
 *
 * Tests for the built-in todo continuation hook implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  todoContinuationHook,
  todoUpdatedHook,
  createTodoContinuationHook,
  clearSessionState,
  clearAllSessionStates,
  type TodoContinuationConfig,
} from "../builtin/todo-continuation.js";
import { HookRegistry } from "../registry.js";
import type { HookContext, Todo } from "../types.js";

// =============================================================================
// Test Helpers
// =============================================================================

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

function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    content: "Test todo item",
    activeForm: "task",
    status: "pending",
    ...overrides,
  };
}

// =============================================================================
// Todo Continuation Hook Definition Tests
// =============================================================================

describe("todoContinuationHook Definition", () => {
  it("should have correct name", () => {
    expect(todoContinuationHook.name).toBe("todo-continuation-enforcer");
  });

  it("should listen to sessionEnd event", () => {
    expect(todoContinuationHook.event).toBe("sessionEnd");
  });

  it("should have high priority (10)", () => {
    expect(todoContinuationHook.priority).toBe(10);
  });

  it("should be enabled by default", () => {
    expect(todoContinuationHook.enabled).toBe(true);
  });

  it("should have handler function", () => {
    expect(typeof todoContinuationHook.handler).toBe("function");
  });

  it("should have default config", () => {
    expect(todoContinuationHook.config).toBeDefined();
    expect(todoContinuationHook.config?.cooldownPeriod).toBe(3000);
    expect(todoContinuationHook.config?.countdownDelay).toBe(2000);
    expect(todoContinuationHook.config?.includeDetails).toBe(true);
  });
});

// =============================================================================
// Todo Continuation Hook Handler Tests
// =============================================================================

describe("todoContinuationHook Handler", () => {
  beforeEach(() => {
    clearAllSessionStates();
  });

  afterEach(() => {
    clearAllSessionStates();
  });

  it("should return continue action when no todos in metadata", async () => {
    const context: HookContext = {
      ...createTestContext(),
      event: "sessionEnd",
    };

    const result = await todoContinuationHook.handler(context);

    expect(result.action).toBe("continue");
    expect(result.message).toContain("No incomplete todos");
  });

  it("should return continue action when all todos are completed", async () => {
    const context: HookContext = {
      ...createTestContext({
        metadata: {
          todos: [
            createTodo({ status: "completed" }),
            createTodo({ status: "completed" }),
          ],
        },
      }),
      event: "sessionEnd",
    };

    const result = await todoContinuationHook.handler(context);

    expect(result.action).toBe("continue");
    expect(result.message).toContain("No incomplete todos");
  });

  it("should return notify action when pending todos exist", async () => {
    const context: HookContext = {
      ...createTestContext({
        metadata: {
          todos: [
            createTodo({ content: "Complete task 1", status: "pending" }),
            createTodo({ content: "Complete task 2", status: "completed" }),
          ],
        },
      }),
      event: "sessionEnd",
    };

    const result = await todoContinuationHook.handler(context);

    expect(result.action).toBe("notify");
    expect(result.message).toContain("TODO CONTINUATION");
    expect(result.message).toContain("1 pending");
  });

  it("should return notify action when in_progress todos exist", async () => {
    const context: HookContext = {
      ...createTestContext({
        metadata: {
          todos: [
            createTodo({ content: "Working on task 1", status: "in_progress" }),
          ],
        },
      }),
      event: "sessionEnd",
    };

    const result = await todoContinuationHook.handler(context);

    expect(result.action).toBe("notify");
    expect(result.message).toContain("1 in progress");
  });

  it("should include data with counts", async () => {
    const context: HookContext = {
      ...createTestContext({
        metadata: {
          todos: [
            createTodo({ status: "pending" }),
            createTodo({ status: "pending" }),
            createTodo({ status: "in_progress" }),
            createTodo({ status: "completed" }),
          ],
        },
      }),
      event: "sessionEnd",
    };

    const result = await todoContinuationHook.handler(context);

    expect(result.data).toEqual({
      incompleteCount: 3,
      pendingCount: 2,
      inProgressCount: 1,
    });
  });

  it("should include next task details in message", async () => {
    const context: HookContext = {
      ...createTestContext({
        metadata: {
          todos: [
            createTodo({ content: "First task to do", status: "pending" }),
            createTodo({ content: "Second task", status: "pending" }),
          ],
        },
      }),
      event: "sessionEnd",
    };

    const result = await todoContinuationHook.handler(context);

    expect(result.message).toContain("First task to do");
  });

  it("should respect cooldown period between notifications", async () => {
    const context: HookContext = {
      ...createTestContext({
        sessionId: "cooldown-test-session",
        metadata: {
          todos: [createTodo({ status: "pending" })],
        },
      }),
      event: "sessionEnd",
    };

    // First call should notify
    const result1 = await todoContinuationHook.handler(context);
    expect(result1.action).toBe("notify");

    // Immediate second call should return continue (cooldown active)
    const result2 = await todoContinuationHook.handler(context);
    expect(result2.action).toBe("continue");
    expect(result2.message).toContain("Cooldown active");
  });
});

// =============================================================================
// createTodoContinuationHook Tests
// =============================================================================

describe("createTodoContinuationHook", () => {
  it("should create hook with default config when no options provided", () => {
    const hook = createTodoContinuationHook();

    expect(hook.name).toBe("todo-continuation-enforcer");
    expect(hook.config?.cooldownPeriod).toBe(3000);
  });

  it("should merge custom config with defaults", () => {
    const hook = createTodoContinuationHook({
      cooldownPeriod: 5000,
    });

    expect(hook.config?.cooldownPeriod).toBe(5000);
    expect(hook.config?.countdownDelay).toBe(2000); // default
    expect(hook.config?.includeDetails).toBe(true); // default
  });

  it("should allow disabling details in message", () => {
    const hook = createTodoContinuationHook({
      includeDetails: false,
    });

    expect(hook.config?.includeDetails).toBe(false);
  });
});

// =============================================================================
// Todo Updated Hook Tests
// =============================================================================

describe("todoUpdatedHook", () => {
  it("should have correct name", () => {
    expect(todoUpdatedHook.name).toBe("todo-update-tracker");
  });

  it("should listen to todoUpdated event", () => {
    expect(todoUpdatedHook.event).toBe("todoUpdated");
  });

  it("should have medium priority (50)", () => {
    expect(todoUpdatedHook.priority).toBe(50);
  });

  it("should be enabled by default", () => {
    expect(todoUpdatedHook.enabled).toBe(true);
  });

  it("should return continue action when no todo in metadata", async () => {
    const context: HookContext = {
      ...createTestContext(),
      event: "todoUpdated",
    };

    const result = await todoUpdatedHook.handler(context);

    expect(result.action).toBe("continue");
  });

  it("should return log action with todo info when todo provided", async () => {
    const todo = createTodo({ content: "Test task", status: "completed" });
    const context: HookContext = {
      ...createTestContext({
        metadata: { todo },
      }),
      event: "todoUpdated",
    };

    const result = await todoUpdatedHook.handler(context);

    expect(result.action).toBe("log");
    expect(result.message).toContain("Test task");
    expect(result.message).toContain("completed");
    expect(result.data).toEqual({ todo });
  });
});

// =============================================================================
// Session State Management Tests
// =============================================================================

describe("Session State Management", () => {
  beforeEach(() => {
    clearAllSessionStates();
  });

  afterEach(() => {
    clearAllSessionStates();
  });

  it("should clear session state for specific session", async () => {
    const context: HookContext = {
      ...createTestContext({
        sessionId: "session-to-clear",
        metadata: {
          todos: [createTodo({ status: "pending" })],
        },
      }),
      event: "sessionEnd",
    };

    // Trigger to create state
    await todoContinuationHook.handler(context);

    // Clear the session state
    clearSessionState("session-to-clear");

    // Should be able to notify again (no cooldown)
    const result = await todoContinuationHook.handler(context);
    expect(result.action).toBe("notify");
  });

  it("should clear all session states", async () => {
    const context1: HookContext = {
      ...createTestContext({
        sessionId: "session-1",
        metadata: { todos: [createTodo({ status: "pending" })] },
      }),
      event: "sessionEnd",
    };

    const context2: HookContext = {
      ...createTestContext({
        sessionId: "session-2",
        metadata: { todos: [createTodo({ status: "pending" })] },
      }),
      event: "sessionEnd",
    };

    // Trigger both sessions
    await todoContinuationHook.handler(context1);
    await todoContinuationHook.handler(context2);

    // Clear all states
    clearAllSessionStates();

    // Both should be able to notify again
    const result1 = await todoContinuationHook.handler(context1);
    const result2 = await todoContinuationHook.handler(context2);

    expect(result1.action).toBe("notify");
    expect(result2.action).toBe("notify");
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Todo Continuation Hook Integration", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
    clearAllSessionStates();
  });

  afterEach(() => {
    clearAllSessionStates();
  });

  it("should work when registered with HookRegistry", async () => {
    registry.register(todoContinuationHook);

    const results = await registry.execute("sessionEnd", {
      sessionId: "integration-test",
      timestamp: new Date(),
      metadata: {
        todos: [createTodo({ status: "pending" })],
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.success).toBe(true);
    expect(results[0]?.result?.action).toBe("notify");
  });

  it("should work with todoUpdatedHook when registered", async () => {
    registry.register(todoUpdatedHook);

    const results = await registry.execute("todoUpdated", {
      sessionId: "integration-test",
      timestamp: new Date(),
      metadata: {
        todo: createTodo({ content: "Task updated", status: "completed" }),
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.success).toBe(true);
    expect(results[0]?.result?.action).toBe("log");
  });

  it("should execute both hooks when registered for their events", async () => {
    registry.register(todoContinuationHook);
    registry.register(todoUpdatedHook);

    // Both hooks should be registered for different events
    expect(registry.getByEvent("sessionEnd")).toHaveLength(1);
    expect(registry.getByEvent("todoUpdated")).toHaveLength(1);

    // Each should only respond to its own event
    const sessionEndResults = await registry.execute("sessionEnd", {
      sessionId: "test",
      timestamp: new Date(),
      metadata: { todos: [createTodo({ status: "pending" })] },
    });

    const todoUpdatedResults = await registry.execute("todoUpdated", {
      sessionId: "test",
      timestamp: new Date(),
      metadata: { todo: createTodo() },
    });

    expect(sessionEndResults).toHaveLength(1);
    expect(todoUpdatedResults).toHaveLength(1);
  });
});
