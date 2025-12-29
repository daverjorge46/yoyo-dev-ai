/**
 * App Component
 *
 * Root TUI application component that composes:
 * - Header (project info, git, memory, MCP)
 * - Layout (two-column panels)
 * - Footer (keyboard shortcuts)
 *
 * Manages global state and keyboard input handling.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from './components/Header.js';
import { Layout } from './components/Layout.js';
import { Footer } from './components/Footer.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { textStyles } from './theme/styles.js';

export const App: React.FC = () => {
  const { width, height } = useTerminalSize();
  const [focusedPanel, setFocusedPanel] = useState<'left' | 'right'>('left');

  // Handle keyboard input for panel switching
  useInput((input, key) => {
    // Switch to right panel
    if (key.rightArrow || input === 'l') {
      setFocusedPanel('right');
    }

    // Switch to left panel
    if (key.leftArrow || input === 'h') {
      setFocusedPanel('left');
    }

    // Toggle panel with Tab
    if (key.tab) {
      setFocusedPanel(prev => prev === 'left' ? 'right' : 'left');
    }
  });

  // Placeholder content for panels (will be replaced with actual components in Task 3 & 4)
  const leftPanelContent = (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color={textStyles.title.color}>
        Task Navigation Panel
      </Text>
      <Text color={textStyles.secondary.color}>
        (Coming in Task 3)
      </Text>
      <Box marginTop={2}>
        <Text color={textStyles.body.color}>
          This panel will display:
        </Text>
        <Text color={textStyles.secondary.color}>
          • Task tree with status indicators
        </Text>
        <Text color={textStyles.secondary.color}>
          • Keyboard navigation (j/k, Enter, Space)
        </Text>
        <Text color={textStyles.secondary.color}>
          • Current spec indicator
        </Text>
        <Text color={textStyles.secondary.color}>
          • MCP connection status
        </Text>
      </Box>
    </Box>
  );

  const rightPanelContent = (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color={textStyles.title.color}>
        Execution Monitoring Panel
      </Text>
      <Text color={textStyles.secondary.color}>
        (Coming in Task 4)
      </Text>
      <Box marginTop={2}>
        <Text color={textStyles.body.color}>
          This panel will display:
        </Text>
        <Text color={textStyles.secondary.color}>
          • Real-time execution logs
        </Text>
        <Text color={textStyles.secondary.color}>
          • Progress indicators and spinners
        </Text>
        <Text color={textStyles.secondary.color}>
          • Test results with error highlighting
        </Text>
        <Text color={textStyles.secondary.color}>
          • Virtual scrolling for performance
        </Text>
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" height={height}>
      {/* Header: Project info, git, memory, MCP */}
      <Header
        projectName="Yoyo Dev TUI v4"
        gitBranch="main"
        memoryBlockCount={0}
        mcpServerCount={0}
      />

      {/* Main Layout: Two-column panels */}
      <Box flexGrow={1}>
        <Layout
          leftPanel={leftPanelContent}
          rightPanel={rightPanelContent}
          focusedPanel={focusedPanel}
          terminalWidth={width}
        />
      </Box>

      {/* Footer: Keyboard shortcuts */}
      <Footer focusedPanel={focusedPanel} />
    </Box>
  );
};
