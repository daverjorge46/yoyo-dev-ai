/**
 * Command Router
 *
 * Routes slash commands to appropriate handlers.
 */

import type {
  CommandDefinition,
  CommandHandler,
  CommandContext,
  CommandResult,
  ParsedCommand,
} from './types.js';

// =============================================================================
// Command Registry
// =============================================================================

/** Registry of available commands */
const commandRegistry = new Map<string, CommandDefinition>();

/** Alias to command name mapping */
const aliasRegistry = new Map<string, string>();

/**
 * Register a command.
 */
export function registerCommand(definition: CommandDefinition): void {
  commandRegistry.set(definition.name, definition);

  // Register aliases
  if (definition.aliases) {
    for (const alias of definition.aliases) {
      aliasRegistry.set(alias, definition.name);
    }
  }
}

/**
 * Get a command definition by name or alias.
 */
export function getCommand(name: string): CommandDefinition | undefined {
  // Try direct lookup
  const command = commandRegistry.get(name);
  if (command) return command;

  // Try alias lookup
  const aliasedName = aliasRegistry.get(name);
  if (aliasedName) {
    return commandRegistry.get(aliasedName);
  }

  return undefined;
}

/**
 * Get all registered commands.
 */
export function getAllCommands(): CommandDefinition[] {
  return Array.from(commandRegistry.values());
}

// =============================================================================
// Command Parsing
// =============================================================================

/**
 * Check if input is a slash command.
 */
export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

/**
 * Parse a command from user input.
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();

  if (!isCommand(trimmed)) {
    return null;
  }

  // Remove leading slash
  const withoutSlash = trimmed.slice(1);

  // Split into command and args
  const spaceIndex = withoutSlash.indexOf(' ');

  if (spaceIndex === -1) {
    return {
      name: withoutSlash.toLowerCase(),
      args: '',
      raw: input,
    };
  }

  return {
    name: withoutSlash.slice(0, spaceIndex).toLowerCase(),
    args: withoutSlash.slice(spaceIndex + 1).trim(),
    raw: input,
  };
}

// =============================================================================
// Command Execution
// =============================================================================

/**
 * Route and execute a command.
 */
export async function routeCommand(
  input: string,
  context: CommandContext
): Promise<CommandResult> {
  const parsed = parseCommand(input);

  if (!parsed) {
    return {
      success: false,
      error: 'Invalid command format',
    };
  }

  const command = getCommand(parsed.name);

  if (!command) {
    return {
      success: false,
      error: `Unknown command: /${parsed.name}. Type /help for available commands.`,
    };
  }

  try {
    const result = await command.handler(parsed.args, context);
    return result;
  } catch (error) {
    return {
      success: false,
      error: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// =============================================================================
// Module Exports
// =============================================================================

export { CommandDefinition, CommandHandler, CommandContext, CommandResult, ParsedCommand };
