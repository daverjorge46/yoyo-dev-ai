/**
 * ChatPanel Component
 *
 * Main chat interface that composes MessageList and InputArea.
 * Connects to Zustand store for state management.
 * Shows "thinking" indicator during AI response.
 */

import React, { useCallback } from 'react';
import { Box, Text, useStdout } from 'ink';
import { MessageList } from './MessageList.js';
import { InputArea } from './InputArea.js';
import { useAppStore, ChatMessage } from '../../backend/state-manager.js';
import { semanticColors, colors } from '../../theme/colors.js';
import Spinner from 'ink-spinner';

interface ChatPanelProps {
  isFocused?: boolean;
  sessionName?: string;
  onSendMessage?: (message: string) => Promise<void>;
  /** Panel width for dynamic sizing */
  width?: number;
  /** Callback when input gains focus */
  onInputFocus?: () => void;
  /** Callback when input loses focus */
  onInputBlur?: () => void;
}

/**
 * Generate a unique ID for messages
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isFocused = true,
  sessionName = 'Claude Chat',
  onSendMessage,
  width,
  onInputFocus,
  onInputBlur,
}) => {
  // Get terminal width for dynamic sizing
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  // Calculate divider width (panel width minus padding/borders, or fallback)
  const dividerWidth = width ? Math.max(width - 6, 20) : Math.floor(terminalWidth * 0.5);

  // Get state from store
  const chatMessages = useAppStore((s) => s.chatMessages);
  const isClaudeConnected = useAppStore((s) => s.isClaudeConnected);
  const isClaudeThinking = useAppStore((s) => s.isClaudeThinking);
  const addMessage = useAppStore((s) => s.addMessage);

  // Handle message submission
  const handleSubmit = useCallback(async (content: string) => {
    // Create user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // Add to store
    addMessage(userMessage);

    // If external handler provided, call it
    if (onSendMessage) {
      try {
        await onSendMessage(content);
      } catch (error) {
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
          timestamp: new Date().toISOString(),
        };
        addMessage(errorMessage);
      }
    }
  }, [addMessage, onSendMessage]);

  // Determine border color based on focus
  const borderColor = isFocused ? semanticColors.borderFocused : colors.surface1;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      {/* Panel Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text bold color={semanticColors.primary}>
            {sessionName}
          </Text>
          {isClaudeConnected ? (
            <Text color={semanticColors.success}> (connected)</Text>
          ) : (
            <Text color={semanticColors.error}> (disconnected)</Text>
          )}
        </Box>
        <Box>
          {isClaudeThinking && (
            <Box>
              <Text color={semanticColors.info}>
                <Spinner type="dots" />
              </Text>
              <Text dimColor> thinking</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Divider */}
      <Box>
        <Text dimColor>{'─'.repeat(dividerWidth)}</Text>
      </Box>

      {/* Messages Area - takes all available space */}
      <Box flexDirection="column" flexGrow={1} marginY={1} overflow="hidden">
        <MessageList messages={chatMessages} />
      </Box>

      {/* Divider */}
      <Box>
        <Text dimColor>{'─'.repeat(dividerWidth)}</Text>
      </Box>

      {/* Input Area */}
      <Box marginTop={1}>
        <InputArea
          onSubmit={handleSubmit}
          isLoading={isClaudeThinking}
          isConnected={isClaudeConnected}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
        />
      </Box>
    </Box>
  );
};
