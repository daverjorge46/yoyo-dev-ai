/**
 * Input Component
 *
 * User input handling with multi-line support, history, and command detection.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useInputHistory } from '../hooks/useInputHistory.js';

// =============================================================================
// Types
// =============================================================================

interface InputProps {
  /** Called when user submits input */
  onSubmit: (input: string) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Called when a slash command is detected */
  onCommand?: (command: string, args: string) => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Detect if input is a slash command.
 */
function isSlashCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

/**
 * Parse a slash command into command name and arguments.
 */
function parseSlashCommand(input: string): { command: string; args: string } {
  const trimmed = input.trim();
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return { command: trimmed.slice(1), args: '' };
  }

  return {
    command: trimmed.slice(1, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

// =============================================================================
// Input Component
// =============================================================================

/**
 * Input component for user text entry.
 */
export function Input({
  onSubmit,
  disabled = false,
  placeholder = 'Type a message or /command...',
  onCommand,
}: InputProps): React.ReactElement {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const { addToHistory, navigateUp, navigateDown, resetNavigation } = useInputHistory();

  const handleSubmit = useCallback(() => {
    if (!input.trim() || disabled) return;

    // Check for slash command
    if (isSlashCommand(input) && onCommand) {
      const { command, args } = parseSlashCommand(input);
      onCommand(command, args);
    } else {
      onSubmit(input);
    }

    // Add to history and clear input
    addToHistory(input);
    setInput('');
    setCursorPosition(0);
  }, [input, disabled, onSubmit, onCommand, addToHistory]);

  useInput((char, key) => {
    if (disabled) return;

    // Submit on Enter
    if (key.return) {
      handleSubmit();
      return;
    }

    // History navigation
    if (key.upArrow) {
      const historyEntry = navigateUp();
      if (historyEntry !== undefined) {
        setInput(historyEntry);
        setCursorPosition(historyEntry.length);
      }
      return;
    }

    if (key.downArrow) {
      const historyEntry = navigateDown();
      if (historyEntry !== undefined) {
        setInput(historyEntry);
        setCursorPosition(historyEntry.length);
      }
      return;
    }

    // Backspace
    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        setInput((prev) => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
        setCursorPosition((pos) => pos - 1);
      }
      resetNavigation();
      return;
    }

    // Left arrow
    if (key.leftArrow) {
      setCursorPosition((pos) => Math.max(0, pos - 1));
      return;
    }

    // Right arrow
    if (key.rightArrow) {
      setCursorPosition((pos) => Math.min(input.length, pos + 1));
      return;
    }

    // Home key (Ctrl+A)
    if (key.ctrl && char === 'a') {
      setCursorPosition(0);
      return;
    }

    // End key (Ctrl+E)
    if (key.ctrl && char === 'e') {
      setCursorPosition(input.length);
      return;
    }

    // Clear line (Ctrl+U)
    if (key.ctrl && char === 'u') {
      setInput('');
      setCursorPosition(0);
      return;
    }

    // Clear word (Ctrl+W)
    if (key.ctrl && char === 'w') {
      const beforeCursor = input.slice(0, cursorPosition);
      const afterCursor = input.slice(cursorPosition);
      const lastSpace = beforeCursor.lastIndexOf(' ');
      const newBeforeCursor = lastSpace === -1 ? '' : beforeCursor.slice(0, lastSpace);
      setInput(newBeforeCursor + afterCursor);
      setCursorPosition(newBeforeCursor.length);
      return;
    }

    // Regular character input
    if (char && !key.ctrl && !key.meta) {
      setInput((prev) => prev.slice(0, cursorPosition) + char + prev.slice(cursorPosition));
      setCursorPosition((pos) => pos + char.length);
      resetNavigation();
    }
  });

  // Render input with cursor
  const beforeCursor = input.slice(0, cursorPosition);
  const afterCursor = input.slice(cursorPosition);

  return (
    <Box
      borderStyle="round"
      borderColor={disabled ? 'gray' : 'blue'}
      paddingX={1}
    >
      <Text color="blue" bold>{'> '}</Text>
      {input.length === 0 && !disabled ? (
        <Text color="gray">{placeholder}</Text>
      ) : (
        <>
          <Text>{beforeCursor}</Text>
          <Text backgroundColor="white" color="black">
            {afterCursor.charAt(0) || ' '}
          </Text>
          <Text>{afterCursor.slice(1)}</Text>
        </>
      )}
    </Box>
  );
}

export default Input;
