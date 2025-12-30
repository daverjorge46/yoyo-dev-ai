/**
 * CommandPalette Component
 *
 * Fuzzy search command interface:
 * - Filter available commands
 * - Show keybindings
 * - Activate with / key
 * - Navigate with arrow keys
 * - Execute with Enter
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
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

  // Reset state when palette becomes visible
  useEffect(() => {
    if (isVisible) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isVisible]);

  // Fuzzy filter commands
  const filteredCommands = commands.filter(cmd => {
    if (!query) return true; // Show all commands when no query
    const searchText = `${cmd.label} ${cmd.description}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  // Reset selected index when filtered list changes
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Execute selected command
  const executeCommand = useCallback(() => {
    const selected = filteredCommands[selectedIndex];
    if (selected) {
      setQuery('');
      selected.action();
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Handle keyboard navigation
  useInput((_input, key) => {
    if (!isVisible) return;

    // Arrow up - previous command
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    }

    // Arrow down - next command
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
    }

    // Escape - close palette
    if (key.escape) {
      setQuery('');
      onClose();
    }

    // Enter - execute selected command (handled by TextInput onSubmit)
  });

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={semanticColors.primary}
      padding={1}
      marginX={2}
    >
      <Box marginBottom={1}>
        <Text bold color={semanticColors.primary}>
          Command Palette
        </Text>
        <Text dimColor> ({commands.length} commands)</Text>
      </Box>

      {/* Search input */}
      <Box marginBottom={1}>
        <Text color={semanticColors.info}>❯ </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={executeCommand}
          placeholder="Type to filter commands..."
          focus={true}
        />
      </Box>

      {/* Command list */}
      <Box flexDirection="column" marginY={1}>
        {filteredCommands.length === 0 ? (
          <Box paddingX={1}>
            <Text dimColor>No matching commands</Text>
          </Box>
        ) : (
          filteredCommands.slice(0, 10).map((cmd, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={cmd.id} paddingX={1}>
                <Text
                  color={isSelected ? semanticColors.primary : textStyles.body.color}
                  bold={isSelected}
                >
                  {isSelected ? '▶ ' : '  '}
                  {cmd.label}
                </Text>
                {cmd.keybinding && (
                  <Text dimColor>
                    {' '}[{cmd.keybinding}]
                  </Text>
                )}
                {isSelected && cmd.description && (
                  <Text dimColor> - {cmd.description}</Text>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer hints */}
      <Box borderStyle="single" borderColor={semanticColors.border} paddingX={1} marginTop={1}>
        <Text dimColor>
          ↑↓ navigate • Enter execute • Esc close
        </Text>
      </Box>
    </Box>
  );
};
