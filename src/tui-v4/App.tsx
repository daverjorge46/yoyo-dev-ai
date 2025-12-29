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
import { TaskPanel } from './components/TaskPanel.js';
import { ExecutionPanel } from './components/ExecutionPanel.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useExecutionStream } from './hooks/useExecutionStream.js';
import { textStyles } from './theme/styles.js';

export const App: React.FC = () => {
  const { width, height } = useTerminalSize();
  const [focusedPanel, setFocusedPanel] = useState<'left' | 'right'>('left');
  const { execution } = useExecutionStream();

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

  // Left panel: Task Navigation Panel (Task 3)
  const leftPanelContent = <TaskPanel />;

  // Right panel: Execution Monitoring Panel (Task 4)
  const rightPanelContent = <ExecutionPanel execution={execution} />;

  return (
    <Box flexDirection="column" height={height}>
      {/* Header: Spiral logo, project info, git, memory, MCP */}
      <Header
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
