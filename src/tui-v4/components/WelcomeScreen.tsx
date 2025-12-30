/**
 * WelcomeScreen Component
 *
 * Displays onboarding content when no specs or tasks exist.
 * Guides users on how to get started with Yoyo Dev.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Logo } from './Logo.js';
import { semanticColors } from '../theme/colors.js';

export const WelcomeScreen: React.FC = () => {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Welcome Header */}
      <Box marginBottom={1}>
        <Text bold color={semanticColors.primary}>
          Welcome to Yoyo Dev
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          AI-powered development workflow framework
        </Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Getting Started Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={semanticColors.textPrimary}>
          Getting Started
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {/* Step 1 */}
        <Box>
          <Text color={semanticColors.primary}>1.</Text>
          <Text> Plan your product:</Text>
        </Box>
        <Box paddingLeft={3}>
          <Text color="cyan">/plan-product</Text>
        </Box>

        {/* Step 2 */}
        <Box marginTop={1}>
          <Text color={semanticColors.primary}>2.</Text>
          <Text> Create a feature:</Text>
        </Box>
        <Box paddingLeft={3}>
          <Text color="cyan">/create-new</Text>
          <Text dimColor> [feature name]</Text>
        </Box>

        {/* Step 3 */}
        <Box marginTop={1}>
          <Text color={semanticColors.primary}>3.</Text>
          <Text> Execute tasks:</Text>
        </Box>
        <Box paddingLeft={3}>
          <Text color="cyan">/execute-tasks</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box marginY={1}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Quick Commands Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={semanticColors.textPrimary}>
          Quick Commands
        </Text>
      </Box>

      <Box flexDirection="column">
        <Box>
          <Text color="cyan">/create-fix</Text>
          <Text dimColor> - Fix a bug</Text>
        </Box>
        <Box>
          <Text color="cyan">/research</Text>
          <Text dimColor> - Research a topic</Text>
        </Box>
        <Box>
          <Text color="cyan">/consult-oracle</Text>
          <Text dimColor> - Get architecture advice</Text>
        </Box>
        <Box>
          <Text color="cyan">/review</Text>
          <Text dimColor> - Review code critically</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box marginY={1}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Keyboard Shortcuts */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={semanticColors.textPrimary}>
          Keyboard Shortcuts
        </Text>
      </Box>

      <Box flexDirection="column">
        <Box>
          <Text color="yellow">?</Text>
          <Text dimColor> - Show help overlay</Text>
        </Box>
        <Box>
          <Text color="yellow">/</Text>
          <Text dimColor> - Open command palette</Text>
        </Box>
        <Box>
          <Text color="yellow">r</Text>
          <Text dimColor> - Refresh data</Text>
        </Box>
        <Box>
          <Text color="yellow">q</Text>
          <Text dimColor> - Quit</Text>
        </Box>
        <Box>
          <Text color="yellow">Tab</Text>
          <Text dimColor> - Switch panels</Text>
        </Box>
      </Box>

      {/* Footer tip */}
      <Box marginTop={2}>
        <Text dimColor italic>
          Run commands in Claude Code to get started!
        </Text>
      </Box>
    </Box>
  );
};
