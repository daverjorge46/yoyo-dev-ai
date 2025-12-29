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

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Header } from './components/Header.js';
import { Layout } from './components/Layout.js';
import { Footer } from './components/Footer.js';
import { TaskPanel } from './components/TaskPanel.js';
import { ExecutionPanel } from './components/ExecutionPanel.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { CommandPalette, Command } from './components/CommandPalette.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useExecutionStream } from './hooks/useExecutionStream.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { loadSession, saveSession } from './utils/session-persistence.js';
import { textStyles } from './theme/styles.js';

export const App: React.FC = () => {
  const { width, height } = useTerminalSize();
  const { exit } = useApp();
  const [focusedPanel, setFocusedPanel] = useState<'left' | 'right'>('left');
  const { execution } = useExecutionStream();

  // Keyboard shortcuts and modals
  const {
    showHelp,
    showCommandPalette,
    shouldQuit,
    shouldRefresh,
    onHelp,
    onCommandPalette,
    closeModals,
  } = useKeyboardShortcuts();

  // Load session state on mount
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setFocusedPanel(session.focusedPanel);
    }
  }, []);

  // Save session state on quit
  useEffect(() => {
    if (shouldQuit) {
      saveSession({ focusedPanel });
      exit();
    }
  }, [shouldQuit, focusedPanel, exit]);

  // Handle refresh action
  useEffect(() => {
    if (shouldRefresh) {
      // Trigger data refresh (will be implemented by backend)
      console.log('[App] Refresh triggered');
    }
  }, [shouldRefresh]);

  // Handle keyboard input for panel switching
  useInput((input, key) => {
    // Don't handle navigation if modals are open
    if (showHelp || showCommandPalette) {
      return;
    }

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

  // Define available commands for command palette
  const commands: Command[] = [
    {
      id: 'toggle-help',
      label: 'Toggle Help',
      description: 'Show/hide keyboard shortcuts',
      keybinding: '?',
      action: onHelp,
    },
    {
      id: 'focus-tasks',
      label: 'Focus Tasks Panel',
      description: 'Switch focus to left panel (tasks)',
      keybinding: 'h / ←',
      action: () => setFocusedPanel('left'),
    },
    {
      id: 'focus-execution',
      label: 'Focus Execution Panel',
      description: 'Switch focus to right panel (execution)',
      keybinding: 'l / →',
      action: () => setFocusedPanel('right'),
    },
    {
      id: 'toggle-panel',
      label: 'Toggle Panel',
      description: 'Switch between left and right panels',
      keybinding: 'Tab',
      action: () => setFocusedPanel(prev => prev === 'left' ? 'right' : 'left'),
    },
  ];

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

      {/* Help Overlay Modal */}
      <HelpOverlay isVisible={showHelp} onClose={closeModals} />

      {/* Command Palette Modal */}
      <CommandPalette
        isVisible={showCommandPalette}
        commands={commands}
        onClose={closeModals}
      />
    </Box>
  );
};
