/**
 * Header Component
 *
 * Top bar displaying project information:
 * - Project name
 * - Git branch
 * - Memory block count
 * - MCP server count
 */

import React from 'react';
import { Box, Text } from 'ink';
import { textStyles, gitStyles } from '../theme/styles.js';
import { semanticColors } from '../theme/colors.js';

export interface HeaderProps {
  projectName: string;
  gitBranch: string | null;
  memoryBlockCount: number;
  mcpServerCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  gitBranch,
  memoryBlockCount,
  mcpServerCount,
}) => {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      paddingX={2}
      paddingY={1}
      borderStyle="round"
      borderColor={semanticColors.border}
    >
      {/* Left: Project name */}
      <Box>
        <Text bold color={textStyles.title.color}>
          {projectName}
        </Text>
      </Box>

      {/* Center: Git branch */}
      <Box>
        {gitBranch && (
          <Text color={gitStyles.branch.color}>
            {gitStyles.branch.icon} {gitBranch}
          </Text>
        )}
        {!gitBranch && (
          <Text dimColor color={textStyles.muted.color}>
            No git branch
          </Text>
        )}
      </Box>

      {/* Right: Memory & MCP status */}
      <Box flexDirection="row" columnGap={3}>
        {/* Memory blocks */}
        <Box>
          <Text color={semanticColors.memoryActive}>
            Memory: <Text bold>{memoryBlockCount}</Text>
          </Text>
        </Box>

        {/* MCP servers */}
        <Box>
          <Text color={mcpServerCount > 0 ? semanticColors.mcpConnected : semanticColors.mcpDisconnected}>
            MCP: <Text bold>{mcpServerCount}</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
