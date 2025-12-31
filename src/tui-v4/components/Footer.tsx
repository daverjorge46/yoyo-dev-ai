/**
 * Footer Component
 *
 * Bottom bar displaying context-aware keyboard shortcuts.
 * Shows different shortcuts based on which panel is currently focused.
 * Updated for 3-pane layout (Tasks | Chat | Execution).
 */

import React from 'react';
import { Box, Text } from 'ink';
import { textStyles } from '../theme/styles.js';
import { semanticColors, colors } from '../theme/colors.js';
import type { FocusablePanel } from './Layout.js';
import type { ModeName } from '../hooks/useInputMode.js';

export interface FooterProps {
  focusedPanel: FocusablePanel;
  /** Vim-style mode indicator */
  mode?: ModeName;
}

interface Shortcut {
  key: string;
  description: string;
}

export const Footer: React.FC<FooterProps> = ({ focusedPanel, mode = 'NORMAL' }) => {
  // Global shortcuts (always visible)
  const globalShortcuts: Shortcut[] = [
    { key: '?', description: 'help' },
    { key: 'q', description: 'quit' },
    { key: 'r', description: 'refresh' },
    { key: '/', description: 'command' },
  ];

  // Panel switching shortcuts
  const panelShortcuts: Shortcut[] = [
    { key: '1/2/3', description: 'panels' },
    { key: '←/→', description: 'switch' },
    { key: 'Tab', description: 'cycle' },
  ];

  // Context-specific shortcuts based on focused panel
  const leftPanelShortcuts: Shortcut[] = [
    { key: 'j/k', description: 'navigate' },
    { key: 'Enter', description: 'expand' },
    { key: 'g/G', description: 'top/bottom' },
  ];

  // Chat panel shortcuts depend on mode
  const centerPanelShortcuts: Shortcut[] = mode === 'INSERT'
    ? [
        { key: 'Enter', description: 'send' },
        { key: 'Esc', description: 'exit insert' },
      ]
    : [
        { key: 'i', description: 'insert mode' },
        { key: 'Enter', description: 'start typing' },
      ];

  const rightPanelShortcuts: Shortcut[] = [
    { key: 'Ctrl+d/u', description: 'page' },
    { key: 'c', description: 'clear logs' },
  ];

  // Get context shortcuts based on focused panel
  const getContextShortcuts = (): Shortcut[] => {
    switch (focusedPanel) {
      case 'left':
        return leftPanelShortcuts;
      case 'center':
        return centerPanelShortcuts;
      case 'right':
        return rightPanelShortcuts;
      default:
        return [];
    }
  };

  // Get panel indicator
  const getPanelIndicator = (): string => {
    switch (focusedPanel) {
      case 'left':
        return '[Tasks]';
      case 'center':
        return '[Chat]';
      case 'right':
        return '[Exec]';
      default:
        return '';
    }
  };

  const contextShortcuts = getContextShortcuts();
  const allShortcuts = [...globalShortcuts, ...panelShortcuts, ...contextShortcuts];

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      paddingX={2}
      paddingY={0}
      borderStyle="round"
      borderColor={semanticColors.border}
    >
      {/* Shortcuts */}
      <Box flexDirection="row" columnGap={2}>
        {allShortcuts.map((shortcut, index) => (
          <Box key={index} flexDirection="row" columnGap={1}>
            <Text bold color={semanticColors.primary}>
              {shortcut.key}
            </Text>
            <Text color={textStyles.secondary.color}>
              {shortcut.description}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Mode and Panel indicators */}
      <Box columnGap={2}>
        {/* Vim-style mode badge */}
        <Box>
          <Text
            bold
            color={mode === 'INSERT' ? colors.yellow : colors.green}
            backgroundColor={mode === 'INSERT' ? colors.surface0 : undefined}
          >
            {` ${mode} `}
          </Text>
        </Box>
        {/* Panel indicator */}
        <Text color={semanticColors.info}>
          {getPanelIndicator()}
        </Text>
      </Box>
    </Box>
  );
};
