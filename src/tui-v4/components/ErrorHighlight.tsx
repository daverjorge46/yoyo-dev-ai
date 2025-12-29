/**
 * ErrorHighlight Component
 *
 * Highlights error messages in logs:
 * - Detects error patterns (Error:, TypeError:, etc.)
 * - Highlights in red
 * - Makes stack traces readable
 */

import React from 'react';
import { Text } from 'ink';
import { semanticColors } from '../theme/colors.js';

export interface ErrorHighlightProps {
  text: string;
}

const ERROR_PATTERNS = [
  /Error:/,
  /TypeError:/,
  /ReferenceError:/,
  /SyntaxError:/,
  /AssertionError:/,
  /FAIL/,
  /FAILED/,
  /✗/,
];

/**
 * Check if text contains an error pattern
 */
function isError(text: string): boolean {
  return ERROR_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if text is a stack trace line
 */
function isStackTrace(text: string): boolean {
  return text.trim().startsWith('at ') || text.trim().startsWith('❯');
}

export const ErrorHighlight: React.FC<ErrorHighlightProps> = ({ text }) => {
  if (isError(text)) {
    return <Text color={semanticColors.error}>{text}</Text>;
  }

  if (isStackTrace(text)) {
    return (
      <Text dimColor color={semanticColors.textSecondary}>
        {text}
      </Text>
    );
  }

  return <Text>{text}</Text>;
};
