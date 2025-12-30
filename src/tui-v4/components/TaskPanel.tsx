/**
 * TaskPanel Component
 *
 * Left panel composition:
 * - SpecIndicator at top
 * - TaskTree in scrollable middle
 * - MCP/memory status footer
 */

import React from 'react';
import { Box, Text } from 'ink';
import { SpecIndicator } from './SpecIndicator.js';
import { TaskTree } from './TaskTree.js';
import { useAppStore } from '../backend/state-manager.js';
import { semanticColors, textStyles, taskStyles } from '../theme/styles.js';
import { textStyles, taskStyles } from '../theme/styles.js';

  const TaskPanel: React.FC = () => {
  const mcp = useAppStore((state) => state.mcp);
  const memory = useAppStore((state) => state.memory);

  return (
    <Box flexDirection="column" height="100%">
      {/* Top: Spec indicator */}
      <SpecIndicator />

      {/* Middle: Task tree (scrollable) */}
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        <TaskTree />
      </Box>

      {/* Bottom: MCP/Memory status */}
      <Box paddingX={1} paddingY={0} borderStyle="single" borderColor={semanticColors.border}>
        <Box flexDirection="row" gap={2}>
          <Text color={textStyles.body}>
            MCP: {mcp.serverCount} {mcp.connected ? '●' : '○'}
          </Text>
          <Text color={textStyles.body}>
            Memory: {memory.blockCount} blocks
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
