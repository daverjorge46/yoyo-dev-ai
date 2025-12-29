/**
 * CommandPalette Component
 *
 * Fuzzy search command interface:
 * - Filter available commands
 * - Show keybindings
 * - Activate with / key
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { semanticColors } from '../theme/colors.js';
import { textStyles } from '../theme/styles.js';

export interface Command {
  id: string;
  label: string;
  description: string;
  keybinding?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  isVisible: boolean;
  commands: Command[];
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isVisible,
  commands,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isVisible) {
    return null;
  }

  // Fuzzy filter commands
  const filteredCommands = commands.filter(cmd => {
    const searchText = `${cmd.label} ${cmd.description}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  const handleSubmit = () => {
    const selected = filteredCommands[selectedIndex];
    if (selected) {
      selected.action();
      onClose();
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={semanticColors.primary}
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color={semanticColors.primary}>
          Command Palette
        </Text>
      </Box>

      {/* Search input */}
      <Box marginBottom={1}>
        <Text color={textStyles.body.color}>Search: </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          placeholder="Type to search commands..."
        />
      </Box>

      {/* Command list */}
      <Box flexDirection="column">
        {filteredCommands.length === 0 ? (
          <Text dimColor color={textStyles.secondary.color}>
            No commands found
          </Text>
        ) : (
          filteredCommands.slice(0, 10).map((cmd, index) => (
            <Box key={cmd.id}>
              <Text color={index === selectedIndex ? semanticColors.primary : textStyles.body.color}>
                {index === selectedIndex ? '▶ ' : '  '}
                {cmd.label}
              </Text>
              {cmd.keybinding && (
                <Text dimColor color={textStyles.secondary.color}>
                  {' '}[{cmd.keybinding}]
                </Text>
              )}
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor={textStyles.secondary.color} paddingX={1}>
        <Text dimColor color={textStyles.secondary.color}>
          Enter to execute • Esc to close
        </Text>
      </Box>
    </Box>
  );
};
