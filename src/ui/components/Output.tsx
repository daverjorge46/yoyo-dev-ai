/**
 * Output Component
 *
 * Streaming output display with markdown rendering and code highlighting.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types.js';

// =============================================================================
// Types
// =============================================================================

interface OutputProps {
  /** Messages to display */
  messages: Message[];
  /** Whether currently streaming */
  streaming?: boolean;
}

interface MessageBlockProps {
  message: Message;
}

// =============================================================================
// Message Rendering
// =============================================================================

/**
 * Get role display info.
 */
function getRoleDisplay(role: Message['role']): { icon: string; label: string; color: string } {
  switch (role) {
    case 'user':
      return { icon: '>', label: 'You', color: 'blue' };
    case 'assistant':
      return { icon: '<', label: 'Yoyo', color: 'green' };
    case 'system':
      return { icon: '*', label: 'System', color: 'gray' };
    default:
      return { icon: '?', label: 'Unknown', color: 'white' };
  }
}

/**
 * Simple markdown-like text rendering.
 * Handles basic formatting: **bold**, *italic*, `code`, ```code blocks```
 */
function renderMarkdownText(text: string): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  let key = 0;

  // Split into lines for processing
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for code block markers
    if (line?.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <Box key={key++} marginY={1} borderStyle="single" borderColor="gray" paddingX={1}>
            <Text color="yellow">{codeBlockLines.join('\n')}</Text>
          </Box>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line ?? '');
      continue;
    }

    // Regular line - apply inline formatting
    const formattedLine = formatInlineMarkdown(line ?? '', key);
    elements.push(
      <Text key={key++}>
        {formattedLine}
        {i < lines.length - 1 ? '\n' : ''}
      </Text>
    );
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <Box key={key++} marginY={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="yellow">{codeBlockLines.join('\n')}</Text>
      </Box>
    );
  }

  return elements;
}

/**
 * Format inline markdown: **bold**, *italic*, `code`
 */
function formatInlineMarkdown(text: string, baseKey: number): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch?.[1]) {
      elements.push(<Text key={`${baseKey}-${key++}`} bold>{boldMatch[1]}</Text>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch?.[1]) {
      elements.push(
        <Text key={`${baseKey}-${key++}`} color="yellow" backgroundColor="gray">
          {codeMatch[1]}
        </Text>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Italic: *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch?.[1]) {
      elements.push(<Text key={`${baseKey}-${key++}`} italic>{italicMatch[1]}</Text>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Regular text (take next segment until special char or end)
    const nextSpecial = remaining.search(/[\*`]/);
    if (nextSpecial === -1) {
      elements.push(<Text key={`${baseKey}-${key++}`}>{remaining}</Text>);
      break;
    } else if (nextSpecial > 0) {
      elements.push(<Text key={`${baseKey}-${key++}`}>{remaining.slice(0, nextSpecial)}</Text>);
      remaining = remaining.slice(nextSpecial);
    } else {
      // Special char that didn't match a pattern - treat as regular text
      elements.push(<Text key={`${baseKey}-${key++}`}>{remaining.charAt(0)}</Text>);
      remaining = remaining.slice(1);
    }
  }

  return elements;
}

// =============================================================================
// Message Block Component
// =============================================================================

function MessageBlock({ message }: MessageBlockProps): React.ReactElement {
  const { icon, label, color } = getRoleDisplay(message.role);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header */}
      <Box>
        <Text color={color} bold>
          {icon} {label}
        </Text>
        {message.streaming && (
          <Text color="yellow"> (streaming...)</Text>
        )}
      </Box>

      {/* Content */}
      <Box marginLeft={2} flexDirection="column">
        {renderMarkdownText(message.content)}
      </Box>
    </Box>
  );
}

// =============================================================================
// Output Component
// =============================================================================

/**
 * Output component displays conversation messages with markdown formatting.
 */
export function Output({ messages, streaming = false }: OutputProps): React.ReactElement {
  if (messages.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="gray">Welcome to Yoyo AI!</Text>
        <Text color="gray">Type a message or use /help for commands.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {messages.map((msg) => (
        <MessageBlock key={msg.id} message={msg} />
      ))}
      {streaming && (
        <Text color="yellow">...</Text>
      )}
    </Box>
  );
}

export default Output;
