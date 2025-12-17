/**
 * Status Command
 *
 * Shows current agent state and memory information.
 */

import type { CommandDefinition, CommandContext, CommandResult } from './types.js';

/**
 * Status command handler.
 */
function statusHandler(_args: string, context: CommandContext): CommandResult {
  const { state, config } = context;

  let output = '**Yoyo AI Status**\n\n';

  // Model info
  output += '**Model**\n';
  output += `  Current: ${state.model}\n`;
  output += `  Default: ${config.defaultModel}\n\n`;

  // Mode
  output += '**Mode**\n';
  output += `  ${state.mode}\n\n`;

  // Memory status
  output += '**Memory**\n';
  if (state.memoryService) {
    const memory = state.memory;
    if (memory) {
      const blocks = Object.entries(memory).filter(([, value]) => value);
      output += `  Status: Connected\n`;
      output += `  Blocks: ${blocks.length}\n`;

      if (blocks.length > 0) {
        output += '  Active:\n';
        for (const [key] of blocks) {
          output += `    - ${key}\n`;
        }
      }
    } else {
      output += '  Status: Connected (no blocks loaded)\n';
    }
  } else {
    output += `  Status: ${config.memory.enabled ? 'Initializing...' : 'Disabled'}\n`;
  }
  output += '\n';

  // Conversation
  output += '**Conversation**\n';
  output += `  Messages: ${state.messages.length}\n`;

  const userMessages = state.messages.filter((m) => m.role === 'user').length;
  const assistantMessages = state.messages.filter((m) => m.role === 'assistant').length;
  output += `  User: ${userMessages}, Assistant: ${assistantMessages}\n`;

  return { success: true, output };
}

/**
 * Status command definition.
 */
export const statusCommand: CommandDefinition = {
  name: 'status',
  aliases: ['s', 'info'],
  description: 'Show current agent state and memory status',
  usage: '/status',
  handler: statusHandler,
};
