/**
 * Clear Command
 *
 * Clears the conversation history.
 */

import type { CommandDefinition, CommandContext, CommandResult } from './types.js';

/**
 * Clear command handler.
 */
function clearHandler(_args: string, context: CommandContext): CommandResult {
  const { dispatch } = context;

  dispatch({ type: 'CLEAR_MESSAGES' });

  return {
    success: true,
    output: 'Conversation cleared.',
  };
}

/**
 * Clear command definition.
 */
export const clearCommand: CommandDefinition = {
  name: 'clear',
  aliases: ['cls', 'reset'],
  description: 'Clear the conversation history',
  usage: '/clear',
  handler: clearHandler,
};
