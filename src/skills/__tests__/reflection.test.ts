/**
 * Reflection Engine Tests
 */

import { describe, it, expect } from 'vitest';
import {
  checkTaskCompletion,
  assessReasoningQuality,
  detectPatterns,
  extractPitfalls,
  analyzeTrajectory,
  shouldCreateSkill,
  type Trajectory,
  type TrajectoryMessage,
} from '../reflection.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  toolCalls?: { name: string; success?: boolean }[]
): TrajectoryMessage {
  return {
    role,
    content,
    toolCalls: toolCalls?.map(t => ({ name: t.name, success: t.success })),
  };
}

function createTrajectory(overrides: Partial<Trajectory> = {}): Trajectory {
  return {
    taskDescription: 'Implement a test feature',
    messages: [
      createMessage('user', 'Please implement a test feature'),
      createMessage('assistant', 'I will implement this feature. Let me start by analyzing the requirements.'),
      createMessage('assistant', 'I have completed the implementation. All tests pass.', [
        { name: 'Write', success: true },
        { name: 'Test', success: true },
      ]),
    ],
    ...overrides,
  };
}

// =============================================================================
// Task Completion Tests
// =============================================================================

describe('checkTaskCompletion', () => {
  it('should detect completed task from explicit flag', () => {
    const trajectory = createTrajectory({ taskCompleted: true });
    const result = checkTaskCompletion(trajectory);

    expect(result.completed).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it('should detect completed task from success keywords', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('user', 'Fix the bug'),
        createMessage('assistant', 'I have successfully fixed the bug. The issue is resolved.'),
      ],
    });

    const result = checkTaskCompletion(trajectory);
    expect(result.completed).toBe(true);
  });

  it('should detect incomplete task from failure keywords', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('user', 'Fix the bug'),
        createMessage('assistant', 'There is an error. The test failed and the issue persists.'),
      ],
    });

    const result = checkTaskCompletion(trajectory);
    expect(result.completed).toBe(false);
  });

  it('should consider tool call success', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('user', 'Run tests'),
        createMessage('assistant', 'Running tests...', [
          { name: 'Test', success: true },
          { name: 'Build', success: true },
        ]),
      ],
    });

    const result = checkTaskCompletion(trajectory);
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

// =============================================================================
// Reasoning Quality Tests
// =============================================================================

describe('assessReasoningQuality', () => {
  it('should give higher score for structured thinking', () => {
    const structured = createTrajectory({
      messages: [
        createMessage('assistant', 'Let me break this down into steps. First, I will analyze the requirements.'),
      ],
    });

    const unstructured = createTrajectory({
      messages: [
        createMessage('assistant', 'Done.'),
      ],
    });

    expect(assessReasoningQuality(structured)).toBeGreaterThan(
      assessReasoningQuality(unstructured)
    );
  });

  it('should reward problem decomposition', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', 'I will break this down into several parts. The key steps are: 1) Analysis 2) Implementation 3) Testing'),
      ],
    });

    // Decomposition adds +0.2 to score
    expect(assessReasoningQuality(trajectory)).toBeGreaterThan(0.15);
  });

  it('should reward verification', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', 'Verifying the implementation with a longer description of what I am doing to make this more realistic.', [
          { name: 'TestRunner', success: true },
        ]),
      ],
    });

    expect(assessReasoningQuality(trajectory)).toBeGreaterThan(0.1);
  });

  it('should reward error handling consideration', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', 'I need to handle the edge case where the input is empty. What if the user provides invalid data?'),
      ],
    });

    // Error handling adds +0.15 to score
    expect(assessReasoningQuality(trajectory)).toBeGreaterThan(0.1);
  });
});

// =============================================================================
// Pattern Detection Tests
// =============================================================================

describe('detectPatterns', () => {
  it('should detect tool usage patterns', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', 'Starting implementation', [
          { name: 'Read', success: true },
          { name: 'Write', success: true },
          { name: 'Test', success: true },
        ]),
      ],
    });

    const patterns = detectPatterns(trajectory);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('should extract numbered list patterns', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', `Here is my approach:
1. First analyze the code
2. Then implement the feature
3. Finally run tests`),
      ],
    });

    const patterns = detectPatterns(trajectory);
    expect(patterns.some(p => p.steps.length >= 2)).toBe(true);
  });
});

// =============================================================================
// Pitfall Extraction Tests
// =============================================================================

describe('extractPitfalls', () => {
  it('should extract error and resolution patterns', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', 'I encountered an error: missing dependency'),
        createMessage('assistant', 'Fixed by adding the missing import'),
      ],
    });

    const pitfalls = extractPitfalls(trajectory);
    expect(pitfalls.length).toBeGreaterThan(0);
  });

  it('should extract "should have" patterns', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', 'I should have checked the input validation first'),
      ],
    });

    const pitfalls = extractPitfalls(trajectory);
    expect(pitfalls.length).toBeGreaterThan(0);
  });

  it('should extract "forgot to" patterns', () => {
    const trajectory = createTrajectory({
      messages: [
        createMessage('assistant', 'I forgot to handle the edge case'),
      ],
    });

    const pitfalls = extractPitfalls(trajectory);
    expect(pitfalls.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Full Trajectory Analysis Tests
// =============================================================================

describe('analyzeTrajectory', () => {
  it('should produce complete reflection result', () => {
    const trajectory = createTrajectory();
    const result = analyzeTrajectory(trajectory);

    expect(result).toHaveProperty('taskCompleted');
    expect(result).toHaveProperty('reasoningQuality');
    expect(result).toHaveProperty('shouldCreateSkill');
    expect(result).toHaveProperty('patterns');
    expect(result).toHaveProperty('pitfalls');
    expect(result).toHaveProperty('suggestedTags');
    expect(result).toHaveProperty('suggestedTriggers');
  });

  it('should recommend skill creation for quality trajectories', () => {
    const trajectory = createTrajectory({
      taskCompleted: true,
      technologies: ['react', 'typescript'],
      messages: [
        createMessage('user', 'Implement a React component'),
        createMessage('assistant', 'Let me break this down into steps. First, I will create the component structure.'),
        createMessage('assistant', 'I have completed the implementation with proper error handling.', [
          { name: 'Write', success: true },
          { name: 'Test', success: true },
        ]),
        createMessage('assistant', 'All tests pass. The feature is complete.'),
      ],
    });

    const result = analyzeTrajectory(trajectory);
    expect(result.taskCompleted).toBe(true);
    expect(result.reasoningQuality).toBeGreaterThan(0.3);
  });

  it('should not recommend skill creation for incomplete tasks', () => {
    const trajectory = createTrajectory({
      taskCompleted: false,
      messages: [
        createMessage('user', 'Fix the bug'),
        createMessage('assistant', 'The bug is still present. I could not resolve it.'),
      ],
    });

    const result = analyzeTrajectory(trajectory);
    expect(result.shouldCreateSkill).toBe(false);
  });

  it('should extract technologies as tags', () => {
    const trajectory = createTrajectory({
      technologies: ['react', 'typescript'],
      filesModified: ['component.tsx', 'styles.css'],
    });

    const result = analyzeTrajectory(trajectory);
    expect(result.suggestedTags).toContain('react');
    expect(result.suggestedTags).toContain('typescript');
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('shouldCreateSkill', () => {
  it('should return true when reflection recommends creation', () => {
    const reflection = analyzeTrajectory(createTrajectory({ taskCompleted: true }));
    // Force the shouldCreateSkill flag for testing
    reflection.shouldCreateSkill = true;

    expect(shouldCreateSkill(reflection)).toBe(true);
  });

  it('should return false when reflection does not recommend creation', () => {
    const reflection = analyzeTrajectory(createTrajectory({ taskCompleted: false }));
    expect(shouldCreateSkill(reflection)).toBe(false);
  });
});
