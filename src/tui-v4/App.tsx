/**
 * App Component
 *
 * Root TUI application component that composes:
 * - Header (project info, git, memory, MCP)
 * - Layout (three-column panels: Tasks | Chat | Execution)
 * - Footer (keyboard shortcuts)
 *
 * Manages global state and keyboard input handling.
 * Loads data on mount using useDataLoader hook.
 * Connects to Claude Code for chat integration.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Header } from './components/Header.js';
import { Layout, FocusablePanel } from './components/Layout.js';
import { Footer } from './components/Footer.js';
import { TaskPanel } from './components/TaskPanel.js';
import { ExecutionPanel } from './components/ExecutionPanel.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { CommandPalette, Command } from './components/CommandPalette.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { ChatPanel } from './components/chat/ChatPanel.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useExecutionStream } from './hooks/useExecutionStream.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useDataLoader, useDataRefresh } from './hooks/useDataLoader.js';
import { useClaudeChat } from './hooks/useClaudeChat.js';
import { useInputMode } from './hooks/useInputMode.js';
import { useAppStore } from './backend/state-manager.js';
import { loadSession, saveSession } from './utils/session-persistence.js';
import { layout } from './theme/styles.js';
import Spinner from 'ink-spinner';

export const App: React.FC = () => {
  const { width, height } = useTerminalSize();
  const { exit } = useApp();
  const [focusedPanel, setFocusedPanel] = useState<FocusablePanel>('center');
  const { execution } = useExecutionStream();

  // Load data on mount
  const { isLoading, error } = useDataLoader();
  const refreshData = useDataRefresh();

  // Claude chat integration
  const { connect, disconnect, sendMessage, isConnected } = useClaudeChat();

  // Get data from store
  const git = useAppStore((s) => s.git);
  const mcp = useAppStore((s) => s.mcp);
  const memory = useAppStore((s) => s.memory);
  const specs = useAppStore((s) => s.specs);
  const tasks = useAppStore((s) => s.tasks);
  const project = useAppStore((s) => s.project);

  // Keyboard shortcuts and modals
  const {
    showHelp,
    showCommandPalette,
    shouldQuit,
    shouldRefresh,
    onHelp,
    closeModals,
  } = useKeyboardShortcuts();

  // Input mode tracking (when user is typing vs navigating)
  const { isInputMode, enterInputMode, exitInputMode } = useInputMode();

  // Connect to Claude on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Load session state on mount
  useEffect(() => {
    const session = loadSession();
    if (session) {
      // Convert old 'left'/'right' to new format
      const panel = session.focusedPanel as FocusablePanel;
      if (panel === 'left' || panel === 'center' || panel === 'right') {
        setFocusedPanel(panel);
      }
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
      refreshData();
    }
  }, [shouldRefresh, refreshData]);

  // Handle keyboard input for panel switching
  useInput((input, key) => {
    // Don't handle navigation if modals are open or user is typing
    if (showHelp || showCommandPalette || isInputMode) {
      return;
    }

    // Panel navigation: h/l or arrows
    if (key.leftArrow || input === 'h') {
      setFocusedPanel((prev) => {
        if (prev === 'right') return 'center';
        if (prev === 'center') return 'left';
        return 'left';
      });
    }

    if (key.rightArrow || input === 'l') {
      setFocusedPanel((prev) => {
        if (prev === 'left') return 'center';
        if (prev === 'center') return 'right';
        return 'right';
      });
    }

    // Tab cycles: left -> center -> right -> left
    if (key.tab) {
      setFocusedPanel((prev) => {
        if (prev === 'left') return 'center';
        if (prev === 'center') return 'right';
        return 'left';
      });
    }

    // Number keys for direct panel access
    if (input === '1') setFocusedPanel('left');
    if (input === '2') setFocusedPanel('center');
    if (input === '3') setFocusedPanel('right');
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
      keybinding: '1 / h',
      action: () => setFocusedPanel('left'),
    },
    {
      id: 'focus-chat',
      label: 'Focus Chat Panel',
      description: 'Switch focus to center panel (chat)',
      keybinding: '2',
      action: () => setFocusedPanel('center'),
    },
    {
      id: 'focus-execution',
      label: 'Focus Execution Panel',
      description: 'Switch focus to right panel (execution)',
      keybinding: '3 / l',
      action: () => setFocusedPanel('right'),
    },
    {
      id: 'toggle-panel',
      label: 'Toggle Panel',
      description: 'Cycle between panels',
      keybinding: 'Tab',
      action: () => setFocusedPanel((prev) => {
        if (prev === 'left') return 'center';
        if (prev === 'center') return 'right';
        return 'left';
      }),
    },
    {
      id: 'refresh',
      label: 'Refresh Data',
      description: 'Reload all project data',
      keybinding: 'r',
      action: refreshData,
    },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <Box flexDirection="column" height={height} justifyContent="center" alignItems="center">
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Loading Yoyo Dev...</Text>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box flexDirection="column" height={height} justifyContent="center" alignItems="center">
        <Text color="red">Error loading data: {error}</Text>
        <Text dimColor>Press 'q' to quit</Text>
      </Box>
    );
  }

  // Determine if we should show welcome screen (no specs and no tasks)
  const showWelcome = specs.length === 0 && tasks.length === 0;

  // Left panel: Task Navigation Panel or Welcome Screen
  const leftPanelContent = showWelcome ? <WelcomeScreen /> : <TaskPanel />;

  // Calculate center panel width for chat sizing
  const centerPanelWidth = Math.floor(width * layout.threeColumn.center);

  // Center panel: Chat with Claude
  const centerPanelContent = (
    <ChatPanel
      isFocused={focusedPanel === 'center'}
      sessionName="Claude Chat"
      onSendMessage={sendMessage}
      width={centerPanelWidth}
      onInputFocus={enterInputMode}
      onInputBlur={exitInputMode}
    />
  );

  // Right panel: Execution Monitoring Panel
  const rightPanelContent = <ExecutionPanel execution={execution} />;

  return (
    <Box flexDirection="column" height={height}>
      {/* Header: Spiral logo, project info, git, memory, MCP, Claude status */}
      <Header
        projectName={project.name}
        projectTagline={project.tagline}
        projectTechStack={project.techStack}
        gitBranch={git.branch}
        memoryBlockCount={memory.blockCount}
        mcpServerCount={mcp.serverCount}
        claudeConnected={isConnected}
      />

      {/* Main Layout: Three-column panels */}
      <Box flexGrow={1}>
        <Layout
          leftPanel={leftPanelContent}
          centerPanel={centerPanelContent}
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
