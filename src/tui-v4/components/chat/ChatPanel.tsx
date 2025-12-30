/**
 * ChatPanel Component
 *
 * Main chat interface that composes MessageList and InputArea.
 * Connects to Zustand store for state management.
 * Shows "thinking" indicator during AI response.
 */

import React, { useCallback } from 'react';
import { Box, Text } from 'ink';
import { MessageList } from './MessageList.js';
import { InputArea } from './InputArea.js';
import { useAppStore, ChatMessage } from '../../backend/state-manager.js';
import { semanticColors, colors } from '../../theme/colors.js';
import Spinner from 'ink-spinner';

interface ChatPanelProps {
  isFocused?: boolean;
  sessionName?: string;
  onSendMessage?: (message: string) => Promise<void>;
}

/**
 * Generate a unique ID for messages
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isFocused = true,
  sessionName = 'Chat',
  onSendMessage,
}) => {
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
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Messages Area */}
      <Box flexDirection="column" flexGrow={1} marginY={1}>
        <MessageList messages={chatMessages} />
      </Box>

      {/* Divider */}
      <Box>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Input Area */}
      <Box marginTop={1}>
        <InputArea
          onSubmit={handleSubmit}
          isLoading={isClaudeThinking}
          isConnected={isClaudeConnected}
        />
      </Box>
    </Box>
  );
};
