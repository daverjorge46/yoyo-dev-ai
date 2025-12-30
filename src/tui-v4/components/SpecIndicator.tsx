/**
 * SpecIndicator Component
 *
 * Displays current spec path with truncation for long paths.
 * Shows at top of TaskPanel.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../backend/state-manager.js';
import { semanticColors } from '../theme/colors.js';
import { textStyles } from '../theme/styles.js';

const MAX_PATH_LENGTH = 50;

export const SpecIndicator: React.FC = () => {
  const activeSpec = useAppStore((state) => state.activeSpec);

  if (!activeSpec) {
    return (
      <Box paddingX={1} paddingY={0}>
        <Text dimColor color={textStyles.secondary.color}>
          No active spec
        </Text>
      </Box>
    );
  }

  // Truncate path if too long
  const displayPath = activeSpec.name.length > MAX_PATH_LENGTH
    ? '...' + activeSpec.name.substring(activeSpec.name.length - MAX_PATH_LENGTH + 3)
    : activeSpec.name;

  return (
    <Box paddingX={1} paddingY={0} borderStyle="round" borderColor={semanticColors.primary}>
      <Text bold color={semanticColors.primary}>
        📋 {displayPath}
      </Text>
      <Text dimColor color={textStyles.secondary.color}>
        {' '}({activeSpec.phase})
      </Text>
    </Box>
  );
};
