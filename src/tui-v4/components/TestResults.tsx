/**
 * TestResults Component
 *
 * Displays test execution results:
 * - Pass/fail summary
 * - Framework detection
 * - Failed test details
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TestResult } from '../utils/test-parser.js';
import { semanticColors } from '../theme/colors.js';

export interface TestResultsProps {
  results: TestResult | null;
}

export const TestResults: React.FC<TestResultsProps> = ({ results }) => {
  if (!results || results.totalTests === 0) {
    return null;
  }

  const passRate = ((results.passedTests / results.totalTests) * 100).toFixed(1);
  const allPassed = results.failedTests === 0;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0} borderStyle="single">
      {/* Summary */}
      <Box>
        <Text bold>Test Results ({results.framework}): </Text>
        <Text color={semanticColors.success}>{results.passedTests} passed</Text>
        {results.failedTests > 0 && (
          <>
            <Text>, </Text>
            <Text color={semanticColors.error}>{results.failedTests} failed</Text>
          </>
        )}
        <Text dimColor> ({passRate}% pass rate)</Text>
      </Box>

      {/* Failed tests */}
      {results.failures.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={semanticColors.error}>
            Failures:
          </Text>
          {results.failures.slice(0, 5).map((failure, index) => (
            <Box key={index} flexDirection="column" marginLeft={2}>
              <Text color={semanticColors.error}>• {failure.message}</Text>
              {failure.stackTrace && (
                <Text dimColor color={semanticColors.textSecondary}>
                  {failure.stackTrace.split('\n')[0]}
                </Text>
              )}
            </Box>
          ))}
          {results.failures.length > 5 && (
            <Text dimColor marginLeft={2}>
              ... and {results.failures.length - 5} more failures
            </Text>
          )}
        </Box>
      )}

      {/* Success indicator */}
      {allPassed && (
        <Box marginTop={1}>
          <Text color={semanticColors.success}>✓ All tests passed!</Text>
        </Box>
      )}
    </Box>
  );
};
