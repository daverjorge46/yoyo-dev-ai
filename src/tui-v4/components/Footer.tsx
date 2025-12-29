/**
 * Footer Component
 *
 * Bottom bar displaying context-aware keyboard shortcuts.
 * Shows different shortcuts based on which panel is currently focused.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { textStyles } from '../theme/styles.js';
import { semanticColors } from '../theme/colors.js';

export interface FooterProps {
  focusedPanel: 'left' | 'right';
}

interface Shortcut {
  key: string;
  description: string;
}

export const Footer: React.FC<FooterProps> = ({ focusedPanel }) => {
  // Global shortcuts (always visible)
  const globalShortcuts: Shortcut[] = [
    { key: '?', description: 'help' },
    { key: 'q', description: 'quit' },
    { key: 'r', description: 'refresh' },
    { key: '/', description: 'command' },
  ];

  // Panel switching shortcuts
  const panelShortcuts: Shortcut[] = [
    { key: '←/→', description: 'switch panel' },
    { key: 'Tab', description: 'cycle' },
  ];

  // Context-specific shortcuts based on focused panel
  const leftPanelShortcuts: Shortcut[] = [
    { key: 'j/k', description: 'navigate' },
    { key: 'Enter', description: 'expand/collapse' },
    { key: 'Space', description: 'select' },
    { key: 'g/G', description: 'top/bottom' },
  ];

  const rightPanelShortcuts: Shortcut[] = [
    { key: 'Ctrl+d/u', description: 'page down/up' },
    { key: 'Ctrl+c', description: 'cancel' },
    { key: 'c', description: 'clear logs' },
  ];

  // Combine shortcuts based on context
  const contextShortcuts = focusedPanel === 'left'
    ? leftPanelShortcuts
    : rightPanelShortcuts;

  const allShortcuts = [...globalShortcuts, ...panelShortcuts, ...contextShortcuts];

  return (
    <Box
      flexDirection="row"
      justifyContent="flex-start"
      paddingX={2}
      paddingY={0}
      borderStyle="round"
      borderColor={semanticColors.border}
      columnGap={2}
    >
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
  );
};
