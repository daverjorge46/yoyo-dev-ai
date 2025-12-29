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
  if (output.includes('PASS ') || output.includes('FAIL ') && output.includes('Test Suites:')) {
    return 'jest';
  }
  if (output.includes('Test Files') || output.includes('✓') && output.includes('Duration')) {
    return 'vitest';
  }
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
    const lines = block?.split('\n') || [];

    let message = '';
    let stackTrace = '';

    // Find error message (usually starts with AssertionError, Error, etc.)
    for (const line of lines) {
      if (line.match(/^(AssertionError|Error|TypeError|ReferenceError):/)) {
        message = line.trim();
      }
      if (line.trim().startsWith('❯')) {
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
  // Format: "Tests: X failed, Y passed, Z total"
  const testsMatch = output.match(/Tests:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed,\s+(\d+)\s+total/);
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
  const failureBlocks = output.split('●');
  for (let i = 1; i < failureBlocks.length; i++) {
    const block = failureBlocks[i];
    const lines = block?.split('\n') || [];

    let message = '';
    let stackTrace = '';

    for (const line of lines) {
      if (line.match(/^(Error|AssertionError|TypeError|ReferenceError):/)) {
        message = line.trim();
      }
      if (line.trim().startsWith('at ')) {
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
