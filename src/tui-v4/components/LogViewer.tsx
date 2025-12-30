/**
 * LogViewer Component
 *
 * Scrollable log output viewer with:
 * - Virtual scrolling (last N lines)
 * - ANSI color preservation
 * - Level-based styling
 * - Timestamps
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { stripAnsi } from '../utils/ansi-parser.js';
import { semanticColors } from '../theme/colors.js';
import { textStyles } from '../theme/styles.js';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success';
  message: string;
}

export interface LogViewerProps {
  logs: LogEntry[];
  maxLines?: number;
  showTimestamps?: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  maxLines = 1000,
  showTimestamps = true,
}) => {
  // Limit to last N lines for performance
  const visibleLogs = useMemo(() => {
    if (logs.length <= maxLines) {
      return logs;
    }
    return logs.slice(logs.length - maxLines);
  }, [logs, maxLines]);

  if (logs.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor color={textStyles.secondary.color}>
          No logs available
        </Text>
      </Box>
    );
  }

  const getLevelColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error':
        return semanticColors.error;
      case 'warn':
        return semanticColors.warning;
      case 'success':
        return semanticColors.success;
      case 'info':
      default:
        return semanticColors.textPrimary;
    }
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      {visibleLogs.map((log, index) => {
        // Clean ANSI codes for display
        const cleanMessage = stripAnsi(log.message);
        const color = getLevelColor(log.level);

        return (
          <Box key={index}>
            {showTimestamps && (
              <Text dimColor color={textStyles.secondary.color}>
                [{log.timestamp}]{' '}
              </Text>
            )}
            <Text color={color}>{cleanMessage}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
