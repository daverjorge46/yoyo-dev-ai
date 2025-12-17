/**
 * Commands Module
 *
 * Public exports for command router and core commands.
 */

import { registerCommand } from './router.js';
import { helpCommand } from './help.js';
import { statusCommand } from './status.js';
import { configCommand } from './config.js';
import { clearCommand } from './clear.js';

// =============================================================================
// Command Registration
// =============================================================================

/**
 * Initialize and register all core commands.
 */
export function initializeCommands(): void {
  registerCommand(helpCommand);
  registerCommand(statusCommand);
  registerCommand(configCommand);
  registerCommand(clearCommand);
}

// =============================================================================
// Exports
// =============================================================================

// Router
export {
  registerCommand,
  getCommand,
  getAllCommands,
  isCommand,
  parseCommand,
  routeCommand,
} from './router.js';

// Types
export type {
  CommandDefinition,
  CommandHandler,
  CommandContext,
  CommandResult,
  ParsedCommand,
} from './types.js';

// Core commands (for extending/overriding)
export { helpCommand } from './help.js';
export { statusCommand } from './status.js';
export { configCommand } from './config.js';
export { clearCommand } from './clear.js';
