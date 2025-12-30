/**
 * MessageList Component
 *
 * Displays chat messages in a scrollable container.
 * User messages are styled distinctly from assistant messages.
 * Tool calls are displayed as collapsible blocks.
 */

import React, { useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { ChatMessage, ToolCall } from '../../backend/state-manager.js';
import { semanticColors, colors } from '../../theme/colors.js';

interface MessageListProps {
  messages: ChatMessage[];
  onScrollTop?: () => void;
}

/**
 * Format a timestamp for display
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Truncate text to a maximum length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get status color for tool call
 */
function getToolStatusColor(status: ToolCall['status']): string {
  switch (status) {
    case 'completed':
      return semanticColors.success;
    case 'approved':
      return semanticColors.info;
    case 'pending':
      return semanticColors.warning;
    case 'denied':
    case 'failed':
      return semanticColors.error;
    default:
      return colors.overlay1;
  }
}

/**
 * Get status icon for tool call
 */
function getToolStatusIcon(status: ToolCall['status']): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'approved':
      return '⟳';
    case 'pending':
      return '?';
    case 'denied':
      return '✕';
    case 'failed':
      return '!';
    default:
      return '·';
  }
}

/**
 * Tool Call Display Component
 */
const ToolCallBlock: React.FC<{ tool: ToolCall }> = ({ tool }) => {
  const statusColor = getToolStatusColor(tool.status);
  const statusIcon = getToolStatusIcon(tool.status);

  return (
    <Box flexDirection="column" marginY={1} paddingX={2}>
      <Box>
        <Text color={statusColor}>{statusIcon}</Text>
        <Text color={colors.lavender}> {tool.name}</Text>
        <Text dimColor> ({tool.status})</Text>
      </Box>
      {Object.keys(tool.parameters).length > 0 && (
        <Box paddingLeft={2}>
          <Text dimColor>
            {truncate(JSON.stringify(tool.parameters), 60)}
          </Text>
        </Box>
      )}
      {tool.result && (
        <Box paddingLeft={2}>
          <Text color={colors.subtext0}>
            → {truncate(tool.result, 80)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Single Message Component
 */
const Message: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Role indicator and styling
  const roleColor = isUser
    ? semanticColors.primary
    : isSystem
      ? colors.overlay1
      : semanticColors.success;

  const roleLabel = isUser ? 'You' : isSystem ? 'System' : 'Claude';
  const roleIcon = isUser ? '>' : isSystem ? '#' : '◆';

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Message Header */}
      <Box>
        <Text color={roleColor} bold>
          {roleIcon} {roleLabel}
        </Text>
        <Text dimColor> {formatTime(message.timestamp)}</Text>
        {message.isStreaming && (
          <Text color={semanticColors.warning}> ●</Text>
        )}
      </Box>

      {/* Message Content */}
      <Box paddingLeft={2} flexDirection="column">
        <Text wrap="wrap">{message.content}</Text>

        {/* Tool Calls */}
        {message.tools && message.tools.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>─ Tools Used ─</Text>
            {message.tools.map((tool) => (
              <ToolCallBlock key={tool.id} tool={tool} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

/**
 * MessageList Component
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onScrollTop,
}) => {
  const scrollOffset = useRef(0);
  const maxVisibleMessages = 50; // Limit for performance

  // Handle keyboard scrolling
  useInput((_input, key) => {
    if (key.upArrow) {
      scrollOffset.current = Math.min(
        scrollOffset.current + 1,
        Math.max(0, messages.length - maxVisibleMessages)
      );
    }
    if (key.downArrow) {
      scrollOffset.current = Math.max(0, scrollOffset.current - 1);
    }
    if (key.pageUp) {
      scrollOffset.current = Math.min(
        scrollOffset.current + 10,
        Math.max(0, messages.length - maxVisibleMessages)
      );
    }
    if (key.pageDown) {
      scrollOffset.current = Math.max(0, scrollOffset.current - 10);
    }
    // Notify parent when scrolled to top
    if (scrollOffset.current >= messages.length - maxVisibleMessages && onScrollTop) {
      onScrollTop();
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollOffset.current = 0;
  }, [messages.length]);

  // Calculate visible messages
  const startIndex = Math.max(
    0,
    messages.length - maxVisibleMessages - scrollOffset.current
  );
  const visibleMessages = messages.slice(startIndex, startIndex + maxVisibleMessages);

  // Empty state
  if (messages.length === 0) {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
        padding={2}
      >
        <Text dimColor>No messages yet.</Text>
        <Text dimColor>Type a message to start the conversation.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} overflow="hidden">
      {/* Scroll indicator (top) */}
      {startIndex > 0 && (
        <Box justifyContent="center">
          <Text dimColor>↑ {startIndex} earlier messages ↑</Text>
        </Box>
      )}

      {/* Messages */}
      {visibleMessages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {/* Scroll indicator (bottom) */}
      {scrollOffset.current > 0 && (
        <Box justifyContent="center">
          <Text dimColor>↓ {scrollOffset.current} newer messages ↓</Text>
        </Box>
      )}
    </Box>
  );
};
