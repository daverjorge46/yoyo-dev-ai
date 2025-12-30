/**
 * InputArea Component
 *
 * Multi-line text input for chat messages.
 * Supports Ctrl+Enter to submit, placeholder text, and loading state.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { semanticColors, colors } from '../../theme/colors.js';
import Spinner from 'ink-spinner';

interface InputAreaProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  isConnected?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** Called when input gains focus */
  onFocus?: () => void;
  /** Called when input loses focus (Escape key) */
  onBlur?: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSubmit,
  isLoading = false,
  isConnected = true,
  placeholder = 'Type a message... (Enter to send)',
  maxLength = 10000,
  onFocus,
  onBlur,
}) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(true);

  // Notify parent of focus state changes
  React.useEffect(() => {
    if (focused && onFocus) {
      onFocus();
    }
  }, [focused, onFocus]);

  // Handle input changes
  const handleChange = useCallback((newValue: string) => {
    if (newValue.length <= maxLength) {
      setValue(newValue);
    }
  }, [maxLength]);

  // Handle message submission
  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !isLoading) {
      onSubmit(trimmed);
      setValue('');
    }
  }, [value, isLoading, onSubmit]);

  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Enter to submit (without Shift)
    if (key.return && !key.shift) {
      handleSubmit();
      return;
    }
    // Ctrl+Enter or Ctrl+S to submit (alternative)
    if ((key.ctrl && key.return) || (key.ctrl && input === 's')) {
      handleSubmit();
      return;
    }
    // Escape to exit input mode and clear
    if (key.escape) {
      setValue('');
      setFocused(false);
      onBlur?.();
    }
  });

  // Calculate character count
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.9;

  // Determine border color based on state
  const borderColor = !isConnected
    ? semanticColors.error
    : isLoading
      ? semanticColors.warning
      : focused
        ? semanticColors.primary
        : colors.surface1;

  return (
    <Box flexDirection="column">
      {/* Connection status warning */}
      {!isConnected && (
        <Box marginBottom={1}>
          <Text color={semanticColors.error}>
            ! Claude is not connected. Start Claude Code to send messages.
          </Text>
        </Box>
      )}

      {/* Input container */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={borderColor}
        paddingX={1}
      >
        {/* Input field */}
        <Box>
          {isLoading ? (
            <Box>
              <Text color={semanticColors.primary}>
                <Spinner type="dots" />
              </Text>
              <Text dimColor> Claude is thinking...</Text>
            </Box>
          ) : (
            <TextInput
              value={value}
              onChange={handleChange}
              onSubmit={handleSubmit}
              placeholder={placeholder}
              focus={focused && isConnected}
            />
          )}
        </Box>

        {/* Footer: Character count and hints */}
        <Box justifyContent="space-between" marginTop={1}>
          <Box>
            <Text dimColor>
              Enter
            </Text>
            <Text color={colors.overlay0}> send</Text>
            <Text dimColor> | Esc</Text>
            <Text color={colors.overlay0}> exit input</Text>
          </Box>
          <Box>
            <Text color={isNearLimit ? semanticColors.warning : colors.overlay0}>
              {charCount}
            </Text>
            <Text dimColor>/{maxLength}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
