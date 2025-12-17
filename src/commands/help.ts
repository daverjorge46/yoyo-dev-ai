/**
 * Help Command
 *
 * Displays available commands and their usage.
 */

import type { CommandDefinition, CommandContext, CommandResult } from './types.js';
import { getAllCommands } from './router.js';

/**
 * Help command handler.
 */
function helpHandler(args: string, _context: CommandContext): CommandResult {
  const commands = getAllCommands();

  if (args) {
    // Show help for specific command
    const targetCommand = commands.find(
      (cmd) => cmd.name === args.toLowerCase() || cmd.aliases?.includes(args.toLowerCase())
    );

    if (!targetCommand) {
      return {
        success: false,
        error: `Unknown command: ${args}`,
      };
    }

    let output = `**/${targetCommand.name}**\n`;
    output += `${targetCommand.description}\n`;

    if (targetCommand.usage) {
      output += `\nUsage: ${targetCommand.usage}\n`;
    }

    if (targetCommand.aliases && targetCommand.aliases.length > 0) {
      output += `\nAliases: ${targetCommand.aliases.map((a) => `/${a}`).join(', ')}\n`;
    }

    return { success: true, output };
  }

  // Show all commands
  let output = '**Available Commands**\n\n';

  // Sort commands by name
  const sortedCommands = [...commands].sort((a, b) => a.name.localeCompare(b.name));

  for (const cmd of sortedCommands) {
    const aliases = cmd.aliases?.length ? ` (${cmd.aliases.map((a) => `/${a}`).join(', ')})` : '';
    output += `  /${cmd.name}${aliases}\n`;
    output += `    ${cmd.description}\n`;
  }

  output += '\n**Keyboard Shortcuts**\n\n';
  output += '  Ctrl+C, Ctrl+D    Exit\n';
  output += '  Up/Down           Navigate history\n';
  output += '  Ctrl+U            Clear input line\n';
  output += '  Ctrl+W            Delete word\n';
  output += '  Ctrl+A            Move to start\n';
  output += '  Ctrl+E            Move to end\n';

  return { success: true, output };
}

/**
 * Help command definition.
 */
export const helpCommand: CommandDefinition = {
  name: 'help',
  aliases: ['h', '?'],
  description: 'Show available commands and their usage',
  usage: '/help [command]',
  handler: helpHandler,
};
