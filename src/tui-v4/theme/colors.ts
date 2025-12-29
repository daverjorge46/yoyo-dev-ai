/**
 * Catppuccin Mocha Color Palette
 *
 * Professional color scheme for the TUI matching the aesthetic of
 * OpenCode/Claude Code with excellent contrast and accessibility.
 *
 * Palette: https://github.com/catppuccin/catppuccin
 */

export const colors = {
  // Base colors
  base: '#1e1e2e',           // Background
  mantle: '#181825',         // Darker background
  crust: '#11111b',          // Darkest background

  surface0: '#313244',       // Surface for panels
  surface1: '#45475a',       // Elevated surface
  surface2: '#585b70',       // Higher surface

  overlay0: '#6c7086',       // Overlay/muted content
  overlay1: '#7f849c',       // Brighter overlay
  overlay2: '#9399b2',       // Brightest overlay

  // Text colors
  text: '#cdd6f4',           // Primary text (foreground)
  subtext0: '#a6adc8',       // Secondary text
  subtext1: '#bac2de',       // Tertiary text

  // Accent colors
  rosewater: '#f5e0dc',
  flamingo: '#f2cdcd',
  pink: '#f5c2e7',
  mauve: '#cba6f7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  peach: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  teal: '#94e2d5',
  sky: '#89dceb',
  sapphire: '#74c7ec',
  blue: '#89b4fa',
  lavender: '#b4befe',
} as const;

/**
 * Semantic color tokens for UI components
 */
export const semanticColors = {
  // UI states
  primary: colors.blue,         // #89b4fa - Primary actions, focus
  success: colors.green,        // #a6e3a1 - Completed, success states
  warning: colors.yellow,       // #f9e2af - Warnings, caution
  error: colors.red,            // #f38ba8 - Errors, failures
  info: colors.sapphire,        // #74c7ec - Informational

  // Task status colors
  taskPending: colors.overlay1,     // Pending tasks
  taskInProgress: colors.blue,      // Active tasks
  taskCompleted: colors.green,      // Completed tasks
  taskFailed: colors.red,           // Failed tasks

  // Component colors
  background: colors.base,          // Main background
  panel: colors.surface0,           // Panel background
  border: colors.surface1,          // Default border
  borderFocused: colors.blue,       // Focused border
  borderActive: colors.green,       // Active/success border

  // Text colors
  textPrimary: colors.text,         // Main text
  textSecondary: colors.subtext1,   // Secondary text
  textMuted: colors.subtext0,       // Muted/disabled text
  textHighlight: colors.lavender,   // Highlighted text

  // Git status
  gitBranch: colors.mauve,          // Git branch name
  gitModified: colors.yellow,       // Modified files
  gitAdded: colors.green,           // Added files
  gitDeleted: colors.red,           // Deleted files

  // Memory/MCP status
  memoryActive: colors.teal,        // Active memory blocks
  mcpConnected: colors.green,       // MCP servers connected
  mcpDisconnected: colors.overlay0, // MCP servers disconnected
} as const;

export type ColorName = keyof typeof colors;
export type SemanticColorName = keyof typeof semanticColors;
