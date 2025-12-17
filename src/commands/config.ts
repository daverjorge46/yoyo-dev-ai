/**
 * Config Command
 *
 * View and modify configuration settings.
 */

import type { CommandDefinition, CommandContext, CommandResult } from './types.js';

/**
 * Config command handler.
 */
function configHandler(args: string, context: CommandContext): CommandResult {
  const { config, dispatch } = context;

  // Parse arguments
  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const key = parts[1];
  const value = parts.slice(2).join(' ');

  // Show all config
  if (!subcommand || subcommand === 'show') {
    let output = '**Configuration**\n\n';

    output += '**General**\n';
    output += `  Default Model: ${config.defaultModel}\n\n`;

    output += '**Memory**\n';
    output += `  Enabled: ${config.memory.enabled}\n`;
    output += `  Global Path: ${config.memory.globalPath ?? '~/.yoyo-ai/memory'}\n`;
    output += `  Project Path: ${config.memory.projectPath ?? './.yoyo-ai/memory'}\n\n`;

    output += '**UI**\n';
    output += `  Theme: ${config.ui.theme}\n`;
    output += `  Colors: ${config.ui.colors}\n`;
    output += `  Animations: ${config.ui.animations}\n\n`;

    output += '**API**\n';
    output += `  Base URL: ${config.api.baseUrl ?? 'default'}\n`;
    output += `  Timeout: ${config.api.timeout}ms\n\n`;

    output += '**Debug**\n';
    output += `  Enabled: ${config.debug.enabled}\n`;
    output += `  Log Level: ${config.debug.logLevel}\n`;

    output += '\nUse `/config set <key> <value>` to modify settings.\n';
    output += 'Use `/config model <model>` to change the current model.\n';

    return { success: true, output };
  }

  // Set model shorthand
  if (subcommand === 'model') {
    if (!key) {
      return {
        success: false,
        error: 'Usage: /config model <model-name>',
      };
    }

    dispatch({ type: 'SET_MODEL', model: key });
    return {
      success: true,
      output: `Model changed to: ${key}`,
    };
  }

  // Set a config value
  if (subcommand === 'set') {
    if (!key || !value) {
      return {
        success: false,
        error: 'Usage: /config set <key> <value>',
      };
    }

    // Only allow changing model at runtime for now
    if (key === 'model') {
      dispatch({ type: 'SET_MODEL', model: value });
      return {
        success: true,
        output: `Model changed to: ${value}`,
      };
    }

    return {
      success: false,
      error: `Cannot modify "${key}" at runtime. Edit config file instead.`,
    };
  }

  // Get a specific config value
  if (subcommand === 'get') {
    if (!key) {
      return {
        success: false,
        error: 'Usage: /config get <key>',
      };
    }

    // Simple key lookup
    const configAny = config as unknown as Record<string, unknown>;
    if (key in configAny) {
      const value = configAny[key];
      return {
        success: true,
        output: `${key}: ${JSON.stringify(value, null, 2)}`,
      };
    }

    // Try nested lookup
    const parts = key.split('.');
    let current: unknown = config;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return {
          success: false,
          error: `Unknown config key: ${key}`,
        };
      }
    }

    return {
      success: true,
      output: `${key}: ${JSON.stringify(current, null, 2)}`,
    };
  }

  return {
    success: false,
    error: `Unknown subcommand: ${subcommand}. Use: show, get, set, model`,
  };
}

/**
 * Config command definition.
 */
export const configCommand: CommandDefinition = {
  name: 'config',
  aliases: ['cfg', 'settings'],
  description: 'View and modify configuration settings',
  usage: '/config [show|get <key>|set <key> <value>|model <model>]',
  handler: configHandler,
};
