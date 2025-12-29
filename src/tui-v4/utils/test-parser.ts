/**
 * Test Output Parser
 *
 * Parses test output from various frameworks:
 * - Jest
 * - Vitest
 * - Pytest
 *
 * Extracts pass/fail counts, error messages, and stack traces.
 */

export type TestFramework = 'jest' | 'vitest' | 'pytest' | 'unknown';

export interface TestFailure {
  testName?: string;
  message: string;
  stackTrace?: string;
}

export interface TestResult {
  framework: TestFramework;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: TestFailure[];
}

/**
 * Detect test framework from output
 */
function detectFramework(output: string): TestFramework {
  // Jest has "Test Suites:" in summary
  if (output.includes('Test Suites:')) {
    return 'jest';
  }
  // Vitest has "Test Files" or uses FAIL/PASS without "Test Suites:"
  if (output.includes('Test Files') || output.includes('✓') && output.includes('Duration')) {
    return 'vitest';
  }
  // Vitest also uses FAIL/PASS markers with ❯ for stack traces
  if ((output.includes(' FAIL ') || output.includes(' PASS ')) && output.includes('❯')) {
    return 'vitest';
  }
  // Jest also uses FAIL/PASS but with different stack traces
  if (output.includes('PASS ') || output.includes('FAIL ')) {
    return 'jest';
  }
  // Pytest has distinctive session markers
  if (output.includes('test session starts') || output.includes('passed in')) {
    return 'pytest';
  }
  return 'unknown';
}

/**
 * Parse Vitest output
 */
function parseVitest(output: string): TestResult {
  const result: TestResult = {
    framework: 'vitest',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    failures: [],
  };

  // Extract test counts from summary
  // Format: "Tests  X failed | Y passed (Z)"
  const testsMatch = output.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed\s+\((\d+)\)/);
  if (testsMatch) {
    result.failedTests = parseInt(testsMatch[1] || '0', 10);
    result.passedTests = parseInt(testsMatch[2] || '0', 10);
    result.totalTests = parseInt(testsMatch[3] || '0', 10);
  }

  // Alternative format: "Tests  X passed (X)"
  const passOnlyMatch = output.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  if (passOnlyMatch && !testsMatch) {
    result.passedTests = parseInt(passOnlyMatch[1], 10);
    result.totalTests = parseInt(passOnlyMatch[2], 10);
  }

  // Extract failures
  const failureBlocks = output.split(' FAIL ');
  for (let i = 1; i < failureBlocks.length; i++) {
    const block = failureBlocks[i];
    if (!block) continue;

    const lines = block.split('\n');

    let message = '';
    let stackTrace = '';

    // Find error message (usually starts with AssertionError, Error, etc., or "expected ...")
    for (const line of lines) {
      const trimmed = line.trim();

      // Check for standard error types at start of trimmed line
      if (trimmed.match(/^(AssertionError|Error|TypeError|ReferenceError):/)) {
        message = trimmed;
      }
      // Also check for assertion messages like "expected ... to be ..."
      else if (trimmed.match(/^expected .* to (be|equal|contain)/)) {
        if (!message) message = trimmed;
      }

      // Collect stack trace lines
      if (trimmed.startsWith('❯')) {
        stackTrace += line + '\n';
      }
    }

    if (message) {
      result.failures.push({ message, stackTrace: stackTrace.trim() || undefined });
    }
  }

  return result;
}

/**
 * Parse Jest output
 */
function parseJest(output: string): TestResult {
  const result: TestResult = {
    framework: 'jest',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    failures: [],
  };

  // Extract test counts
  // Format: "Tests: X failed, Y passed, Z total" OR "Tests: X failed, Y total" OR "Tests: X passed, Y total"
  const testsMatch = output.match(/Tests:\s+(?:(\d+)\s+failed,\s+)?(?:(\d+)\s+passed,\s+)?(\d+)\s+total/);
  if (testsMatch) {
    result.failedTests = parseInt(testsMatch[1] || '0', 10);
    result.passedTests = parseInt(testsMatch[2] || '0', 10);
    result.totalTests = parseInt(testsMatch[3] || '0', 10);
  }

  // Alternative format: "Tests: X passed, Y total"
  const passOnlyMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  if (passOnlyMatch && !testsMatch) {
    result.passedTests = parseInt(passOnlyMatch[1], 10);
    result.totalTests = parseInt(passOnlyMatch[2], 10);
  }

  // Extract failures
  // Jest uses ● markers, but also FAIL for failures
  const failureBlocks = output.includes('●') ? output.split('●') : output.split(' FAIL ');
  for (let i = 1; i < failureBlocks.length; i++) {
    const block = failureBlocks[i];
    if (!block) continue;

    const lines = block.split('\n');

    let message = '';
    let stackTrace = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for standard error types
      if (trimmed.match(/^(Error|AssertionError|TypeError|ReferenceError):/)) {
        message = trimmed;
      }

      // Collect stack trace lines (Jest uses "at " prefix)
      if (trimmed.startsWith('at ')) {
        stackTrace += line + '\n';
      }
    }

    if (message) {
      result.failures.push({ message, stackTrace: stackTrace.trim() || undefined });
    }
  }

  return result;
}

/**
 * Parse Pytest output
 */
function parsePytest(output: string): TestResult {
  const result: TestResult = {
    framework: 'pytest',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    failures: [],
  };

  // Extract test counts
  // Format: "X passed in Y.ZZs" or "X failed, Y passed in Z.ZZs"
  const failedMatch = output.match(/(\d+)\s+failed,\s+(\d+)\s+passed\s+in/);
  if (failedMatch) {
    result.failedTests = parseInt(failedMatch[1] || '0', 10);
    result.passedTests = parseInt(failedMatch[2] || '0', 10);
    result.totalTests = result.failedTests + result.passedTests;
  } else {
    const passedMatch = output.match(/(\d+)\s+passed\s+in/);
    if (passedMatch) {
      result.passedTests = parseInt(passedMatch[1] || '0', 10);
      result.totalTests = result.passedTests;
    }
  }

  // Extract failures
  if (output.includes('FAILURES')) {
    const failureSection = output.split('FAILURES')[1];
    const failureBlocks = failureSection?.split(/(?=\n_+ )/g) || [];

    for (const block of failureBlocks) {
      if (block.trim()) {
        const lines = block.split('\n');
        const message = lines.find(l => l.includes('AssertionError') || l.includes('Error'));

        if (message) {
          result.failures.push({ message: message.trim() });
        }
      }
    }
  }

  return result;
}

/**
 * Parse test output and extract results
 */
export function parseTestOutput(output: string): TestResult {
  if (!output || output.trim() === '') {
    return {
      framework: 'unknown',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      failures: [],
    };
  }

  const framework = detectFramework(output);

  switch (framework) {
    case 'vitest':
      return parseVitest(output);
    case 'jest':
      return parseJest(output);
    case 'pytest':
      return parsePytest(output);
    default:
      return {
        framework: 'unknown',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        failures: [],
      };
  }
}
