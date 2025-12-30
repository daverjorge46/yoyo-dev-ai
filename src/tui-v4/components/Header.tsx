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
import { Logo } from './Logo.js';

export interface HeaderProps {
  projectName?: string;  // Optional, Logo component includes "Yoyo Dev" text
  gitBranch: string | null;
  memoryBlockCount: number;
  mcpServerCount: number;
  claudeConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  gitBranch,
  memoryBlockCount,
  mcpServerCount,
  claudeConnected = false,
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
      {/* Left: Spiral Logo + Project name */}
      <Box>
        <Logo variant="compact" showText={true} />
        {projectName && projectName !== 'Yoyo Dev' && (
          <Text dimColor color={textStyles.secondary.color}>
            {' '}• {projectName}
          </Text>
        )}
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

      {/* Right: Claude, Memory & MCP status */}
      <Box flexDirection="row" columnGap={3}>
        {/* Claude status */}
        <Box>
          <Text color={claudeConnected ? semanticColors.success : semanticColors.error}>
            Claude: <Text bold>{claudeConnected ? '●' : '○'}</Text>
          </Text>
        </Box>

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
