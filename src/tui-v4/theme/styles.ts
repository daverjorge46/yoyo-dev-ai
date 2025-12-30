/**
 * Component Style Definitions
 *
 * Centralized style constants for consistent UI components across the TUI.
 * Uses Catppuccin Mocha color palette for professional aesthetic.
 */

import { semanticColors } from './colors.js';

/**
 * Border styles for panels and components
 */
export const borders = {
  default: {
    borderStyle: 'round' as const,
    borderColor: semanticColors.border,
  },
  focused: {
    borderStyle: 'double' as const,
    borderColor: semanticColors.borderFocused,
  },
  active: {
    borderStyle: 'double' as const,
    borderColor: semanticColors.borderActive,
  },
  error: {
    borderStyle: 'round' as const,
    borderColor: semanticColors.error,
  },
} as const;

/**
 * Layout dimensions and spacing
 */
export const layout = {
  // Two-column proportions (legacy)
  leftPanelWidth: 0.4,   // 40% of terminal width
  rightPanelWidth: 0.6,  // 60% of terminal width

  // Three-column proportions (with chat - chat-focused layout)
  threeColumn: {
    left: 0.20,    // 20% - Tasks panel (compact)
    center: 0.60,  // 60% - Chat panel (main focus)
    right: 0.20,   // 20% - Execution panel (compact)
  },

  // Responsive breakpoints
  minWidthTwoColumn: 80,   // Minimum width for two-column layout
  minWidthThreeColumn: 100, // Minimum width for three-column layout (reduced for better usability)

  // Spacing
  padding: {
    small: 1,
    medium: 2,
    large: 3,
  },
  margin: {
    small: 1,
    medium: 2,
    large: 3,
  },

  // Component heights
  headerHeight: 3,
  footerHeight: 2,
} as const;

/**
 * Text styles for different content types
 */
export const textStyles = {
  header: {
    bold: true,
    color: semanticColors.textPrimary,
  },
  title: {
    bold: true,
    color: semanticColors.textPrimary,
  },
  body: {
    color: semanticColors.textPrimary,
  },
  secondary: {
    color: semanticColors.textSecondary,
  },
  muted: {
    color: semanticColors.textMuted,
    dimColor: true,
  },
  highlight: {
    color: semanticColors.textHighlight,
    bold: true,
  },
  success: {
    color: semanticColors.success,
  },
  warning: {
    color: semanticColors.warning,
  },
  error: {
    color: semanticColors.error,
    bold: true,
  },
} as const;

/**
 * Task status icons and colors
 */
export const taskStyles = {
  pending: {
    icon: '○',
    color: semanticColors.taskPending,
  },
  inProgress: {
    icon: '⏳',
    color: semanticColors.taskInProgress,
  },
  completed: {
    icon: '✓',
    color: semanticColors.taskCompleted,
  },
  failed: {
    icon: '✗',
    color: semanticColors.taskFailed,
  },
} as const;

/**
 * Git status indicators
 */
export const gitStyles = {
  branch: {
    icon: '',
    color: semanticColors.gitBranch,
  },
  modified: {
    icon: 'M',
    color: semanticColors.gitModified,
  },
  added: {
    icon: 'A',
    color: semanticColors.gitAdded,
  },
  deleted: {
    icon: 'D',
    color: semanticColors.gitDeleted,
  },
} as const;

/**
 * Spinner configurations for loading states
 */
export const spinnerTypes = {
  default: 'dots' as const,
  fast: 'dots2' as const,
  slow: 'dots12' as const,
} as const;

/**
 * Animation durations (ms)
 */
export const animations = {
  fast: 100,
  medium: 250,
  slow: 500,
  debounceResize: 100,  // Terminal resize debounce
  debounceInput: 150,   // Input debounce
} as const;

export type BorderStyle = keyof typeof borders;
export type TextStyle = keyof typeof textStyles;
export type TaskStatus = keyof typeof taskStyles;
