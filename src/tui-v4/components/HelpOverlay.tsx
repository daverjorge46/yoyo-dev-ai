/**
 * HelpOverlay Component
 *
 * Modal displaying keyboard shortcuts grouped by context:
 * - Global shortcuts
 * - Navigation shortcuts
 * - Execution shortcuts
 *
 * Toggled with ? key.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { semanticColors } from '../theme/colors.js';
import { textStyles } from '../theme/styles.js';

export interface HelpOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
}

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { key: '?', description: 'Toggle this help overlay' },
  { key: 'q', description: 'Quit application' },
  { key: 'r', description: 'Refresh all data' },
  { key: '/', description: 'Open command palette' },
  { key: 'Esc', description: 'Close modals/overlays' },
  { key: 'Ctrl+C', description: 'Force quit' },
];

const NAVIGATION_SHORTCUTS: Shortcut[] = [
  { key: 'h / ←', description: 'Focus left panel (tasks)' },
  { key: 'l / →', description: 'Focus right panel (execution)' },
  { key: 'Tab', description: 'Toggle panel focus' },
  { key: 'j / ↓', description: 'Move down in task list' },
  { key: 'k / ↑', description: 'Move up in task list' },
  { key: 'g', description: 'Jump to top of list' },
  { key: 'G', description: 'Jump to bottom of list' },
  { key: 'Enter', description: 'Expand/collapse task group' },
  { key: 'Space', description: 'Select task' },
];

const EXECUTION_SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl+d', description: 'Scroll logs down (page)' },
  { key: 'Ctrl+u', description: 'Scroll logs up (page)' },
];

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ isVisible, onClose }) => {
  if (!isVisible) {
    return null;
  }

  const renderShortcutGroup = (title: string, shortcuts: Shortcut[]) => (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={semanticColors.primary}>
        {title}
      </Text>
      {shortcuts.map((shortcut, index) => (
        <Box key={index} marginLeft={2}>
          <Box width={15}>
            <Text color={semanticColors.warning}>{shortcut.key}</Text>
          </Box>
          <Text color={textStyles.body.color}>{shortcut.description}</Text>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={semanticColors.primary}
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color={semanticColors.primary}>
          ◉◎○ Yoyo Dev - Keyboard Shortcuts
        </Text>
      </Box>

      {renderShortcutGroup('Global', GLOBAL_SHORTCUTS)}
      {renderShortcutGroup('Navigation', NAVIGATION_SHORTCUTS)}
      {renderShortcutGroup('Execution', EXECUTION_SHORTCUTS)}

      <Box marginTop={1} borderStyle="single" borderColor={textStyles.secondary.color} paddingX={1}>
        <Text dimColor color={textStyles.secondary.color}>
          Press ? or Esc to close this help overlay
        </Text>
      </Box>
    </Box>
  );
};
