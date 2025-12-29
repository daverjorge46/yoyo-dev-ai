/**
 * ProgressBar Component
 *
 * Visual progress indicator showing:
 * - Percentage complete
 * - Progress bar visualization
 * - Spinner for indeterminate operations
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { semanticColors } from '../theme/colors.js';

export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  indeterminate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  indeterminate = false,
}) => {
  const percentage = Math.min(100, Math.max(0, progress));
  const barWidth = 30;
  const filledWidth = Math.round((percentage / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  const filledBar = '█'.repeat(filledWidth);
  const emptyBar = '░'.repeat(emptyWidth);

  return (
    <Box paddingX={1} paddingY={0}>
      {indeterminate ? (
        <Box>
          <Text color={semanticColors.primary}>
            <Spinner type="dots" />
          </Text>
          <Text> {label || 'Processing...'}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {label && (
            <Text bold color={semanticColors.primary}>
              {label}
            </Text>
          )}
          <Box>
            <Text color={semanticColors.primary}>{filledBar}</Text>
            <Text dimColor>{emptyBar}</Text>
            <Text> {percentage.toFixed(0)}%</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
