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

// Vim-style mode switching (most important - shown first)
const MODE_SHORTCUTS: Shortcut[] = [
  { key: 'i', description: 'Enter INSERT mode (type in chat)' },
  { key: 'Enter', description: 'Enter INSERT mode (when on chat panel)' },
  { key: 'Esc', description: 'Return to NORMAL mode' },
];

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { key: '?', description: 'Toggle this help overlay' },
  { key: 'q', description: 'Quit application (NORMAL mode only)' },
  { key: 'r', description: 'Refresh all data' },
  { key: '/', description: 'Open command palette' },
  { key: 'Ctrl+C', description: 'Force quit' },
];

const NAVIGATION_SHORTCUTS: Shortcut[] = [
  { key: 'h / ←', description: 'Focus left panel (NORMAL mode)' },
  { key: 'l / →', description: 'Focus right panel (NORMAL mode)' },
  { key: 'Tab', description: 'Cycle panels (NORMAL mode)' },
  { key: '1/2/3', description: 'Jump to panel directly' },
  { key: 'j / ↓', description: 'Move down in task list' },
  { key: 'k / ↑', description: 'Move up in task list' },
  { key: 'g', description: 'Jump to top of list' },
  { key: 'G', description: 'Jump to bottom of list' },
];

const CHAT_SHORTCUTS: Shortcut[] = [
  { key: 'Enter', description: 'Send message (INSERT mode)' },
  { key: 'Esc', description: 'Exit INSERT mode' },
];

const EXECUTION_SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl+d', description: 'Scroll logs down (page)' },
  { key: 'Ctrl+u', description: 'Scroll logs up (page)' },
];

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ isVisible }) => {
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

      {renderShortcutGroup('Mode Switching (vim-style)', MODE_SHORTCUTS)}
      {renderShortcutGroup('Global', GLOBAL_SHORTCUTS)}
      {renderShortcutGroup('Navigation (NORMAL mode)', NAVIGATION_SHORTCUTS)}
      {renderShortcutGroup('Chat (INSERT mode)', CHAT_SHORTCUTS)}
      {renderShortcutGroup('Execution', EXECUTION_SHORTCUTS)}

      <Box marginTop={1} borderStyle="single" borderColor={textStyles.secondary.color} paddingX={1}>
        <Text dimColor color={textStyles.secondary.color}>
          Press ? or Esc to close this help overlay
        </Text>
      </Box>
    </Box>
  );
};
