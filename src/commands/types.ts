/**
 * Command Types
 *
 * Type definitions for the command router and handlers.
 */

import type { AppState, AppAction } from '../ui/types.js';
import type { CLIConfig } from '../cli/types.js';

// =============================================================================
// Command Handler Types
// =============================================================================

/**
 * Context passed to command handlers.
 */
export interface CommandContext {
  /** Current app state */
  state: AppState;
  /** Dispatch function to update state */
  dispatch: React.Dispatch<AppAction>;
  /** CLI configuration */
  config: CLIConfig;
}

/**
 * Result of a command execution.
 */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Output message to display */
  output?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Command handler function signature.
 */
export type CommandHandler = (
  args: string,
  context: CommandContext
) => CommandResult | Promise<CommandResult>;

/**
 * Command definition.
 */
export interface CommandDefinition {
  /** Command name (without slash) */
  name: string;
  /** Command aliases */
  aliases?: string[];
  /** Short description */
  description: string;
  /** Usage example */
  usage?: string;
  /** Command handler */
  handler: CommandHandler;
}

// =============================================================================
// Parsed Command
// =============================================================================

/**
 * Parsed command from user input.
 */
export interface ParsedCommand {
  /** Command name (without slash) */
  name: string;
  /** Command arguments */
  args: string;
  /** Original input */
  raw: string;
}
