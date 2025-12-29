/**
 * Test Parser Utility Tests
 *
 * Tests for parsing test output from:
 * - Jest
 * - Vitest
 * - Pytest
 *
 * Extracts pass/fail counts, error messages, and stack traces.
 */

import { describe, it, expect } from 'vitest';
import { parseTestOutput, TestResult } from '../utils/test-parser.js';

describe('Test Parser Utility', () => {
  describe('Vitest Output', () => {
    it('parses passing test summary', () => {
      const output = `
 ✓ src/components/Button.test.tsx (3)
   ✓ Button Component (3)
     ✓ renders without errors
     ✓ handles click events
     ✓ applies correct styles

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  10:30:45
   Duration  245ms
`;

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(3);
      expect(result.passedTests).toBe(3);
      expect(result.failedTests).toBe(0);
      expect(result.framework).toBe('vitest');
    });

    it('parses failing test summary', () => {
      const output = `
 ✓ src/components/Button.test.tsx (2)
 ✗ src/components/Form.test.tsx (1)

 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 2 passed (3)
`;

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(3);
      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(1);
    });

    it('extracts error messages from failures', () => {
      const output = `
 FAIL  src/components/Form.test.tsx > Form Component > validates input
AssertionError: expected 'invalid' to be 'valid'

 ❯ src/components/Form.test.tsx:25:15
      23|   it('validates input', () => {
      24|     const result = validateInput('test');
      25|     expect(result).toBe('valid');
         |                   ^
      26|   });
`;

      const result = parseTestOutput(output);

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]?.message).toContain('expected \'invalid\' to be \'valid\'');
    });
  });

  describe('Jest Output', () => {
    it('parses passing test summary', () => {
      const output = `
PASS  src/components/Button.test.tsx
  ✓ renders without errors (5 ms)
  ✓ handles click events (3 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        1.234 s
`;

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(2);
      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(0);
      expect(result.framework).toBe('jest');
    });

    it('parses failing test summary', () => {
      const output = `
FAIL  src/components/Form.test.tsx
  ✕ validates input (10 ms)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
`;

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(1);
      expect(result.passedTests).toBe(0);
      expect(result.failedTests).toBe(1);
    });
  });

  describe('Pytest Output', () => {
    it('parses passing test summary', () => {
      const output = `
======================== test session starts =========================
collected 5 items

tests/test_utils.py .....                                      [100%]

========================= 5 passed in 0.45s ==========================
`;

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(5);
      expect(result.passedTests).toBe(5);
      expect(result.failedTests).toBe(0);
      expect(result.framework).toBe('pytest');
    });

    it('parses failing test summary', () => {
      const output = `
======================== test session starts =========================
collected 3 items

tests/test_utils.py .F.                                        [100%]

=========================== FAILURES ==================================
tests/test_utils.py:10: AssertionError

========================= 1 failed, 2 passed in 0.67s ================
`;

      const result = parseTestOutput(output);

      expect(result.totalTests).toBe(3);
      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty output', () => {
      const result = parseTestOutput('');

      expect(result.totalTests).toBe(0);
      expect(result.passedTests).toBe(0);
      expect(result.failedTests).toBe(0);
      expect(result.framework).toBe('unknown');
    });

    it('handles unknown test framework output', () => {
      const output = 'Some random output that is not from a test framework';

      const result = parseTestOutput(output);

      expect(result.framework).toBe('unknown');
    });

    it('extracts stack traces from errors', () => {
      const output = `
 FAIL  src/test.ts
Error: Something went wrong
    at Object.<anonymous> (src/test.ts:10:15)
    at Module._compile (internal/modules/cjs/loader.js:1137:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)
`;

      const result = parseTestOutput(output);

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]?.stackTrace).toContain('at Object.<anonymous>');
    });
  });
});
