/**
 * ExecutionPanel Component
 *
 * Right panel composition:
 * - Progress bar at top
 * - Log viewer in middle
 * - Test results at bottom
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar } from './ProgressBar.js';
import { LogViewer } from './LogViewer.js';
import { TestResults } from './TestResults.js';
import { ExecutionState } from '../hooks/useExecutionStream.js';
import { textStyles } from '../theme/styles.js';

export interface ExecutionPanelProps {
  execution?: ExecutionState | null;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ execution }) => {
  if (!execution) {
    return (
      <Box flexDirection="column" paddingY={1} paddingX={1}>
        <Text dimColor color={textStyles.secondary.color}>
          No active execution
        </Text>
        <Box marginTop={2}>
          <Text color={textStyles.body.color}>
            Task execution logs will appear here when a task is running.
          </Text>
        </Box>
      </Box>
    );
  }

  const isRunning = execution.status === 'running';
  const isCompleted = execution.status === 'completed';
  const isFailed = execution.status === 'failed';

  return (
    <Box flexDirection="column" height="100%">
      {/* Top: Progress Bar */}
      <Box>
        <ProgressBar
          progress={execution.progress}
          label={execution.taskName}
          indeterminate={isRunning && execution.progress === 0}
        />
      </Box>

      {/* Middle: Log Viewer (scrollable) */}
      <Box flexGrow={1} flexDirection="column" paddingY={1}>
        <LogViewer logs={execution.logs} maxLines={1000} showTimestamps={true} />
      </Box>

      {/* Bottom: Test Results (if available) */}
      {execution.testResults && (
        <Box>
          <TestResults results={execution.testResults} />
        </Box>
      )}

      {/* Status indicator */}
      {isCompleted && !execution.testResults && (
        <Box paddingX={1} paddingY={0}>
          <Text color={textStyles.success.color}>✓ Execution completed successfully</Text>
        </Box>
      )}

      {isFailed && (
        <Box paddingX={1} paddingY={0}>
          <Text color={textStyles.error.color}>✗ Execution failed</Text>
        </Box>
      )}
    </Box>
  );
};
