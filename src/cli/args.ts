/**
 * CLI Argument Parser
 *
 * Parses command line arguments using Commander.
 */

import { Command } from 'commander';
import type { CLIArgs, OutputFormat } from './types.js';

// =============================================================================
// Version
// =============================================================================

/** CLI version */
export const VERSION = '4.0.0-alpha.1';

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse command line arguments.
 *
 * @param argv - Command line arguments (defaults to process.argv)
 * @returns Parsed CLI arguments
 */
export function parseArgs(argv: string[] = process.argv): CLIArgs {
  const program = new Command();

  program
    .name('yoyo-ai')
    .description('Memory-first AI development framework CLI')
    .version(VERSION, '-v, --version', 'Show version number')
    .option('-m, --model <model>', 'AI model to use')
    .option('-n, --new', 'Start a new conversation', false)
    .option('-c, --continue', 'Continue previous conversation', false)
    .option('-p, --prompt <prompt>', 'Direct prompt (enables headless mode)')
    .option('--headless', 'Run in headless mode (no interactive UI)', false)
    .option(
      '-o, --output <format>',
      'Output format: text, json, stream-json',
      'text'
    )
    .option('--cwd <directory>', 'Working directory', process.cwd())
    .option('--verbose', 'Enable verbose output', false)
    .argument('[args...]', 'Additional arguments')
    .allowUnknownOption(false)
    .showHelpAfterError(true);

  // Parse arguments
  program.parse(argv);

  const opts = program.opts();
  const positionalArgs = program.args;

  // If prompt is provided, enable headless mode
  const headless = opts.headless || !!opts.prompt;

  // Validate output format
  const validFormats: OutputFormat[] = ['text', 'json', 'stream-json'];
  const output = validFormats.includes(opts.output as OutputFormat)
    ? (opts.output as OutputFormat)
    : 'text';

  return {
    model: opts.model,
    new: opts.new,
    continue: opts.continue,
    prompt: opts.prompt,
    headless,
    output,
    version: false, // Commander handles this
    help: false, // Commander handles this
    cwd: opts.cwd,
    verbose: opts.verbose,
    args: positionalArgs,
  };
}

/**
 * Get help text.
 *
 * @returns Help text string
 */
export function getHelpText(): string {
  return `
Yoyo AI - Memory-first AI development framework

Usage:
  yoyo-ai [options] [prompt]

Options:
  -m, --model <model>     AI model to use (default: claude-sonnet)
  -n, --new               Start a new conversation
  -c, --continue          Continue previous conversation
  -p, --prompt <prompt>   Direct prompt (headless mode)
  --headless              Run without interactive UI
  -o, --output <format>   Output format: text, json, stream-json
  --cwd <directory>       Working directory
  --verbose               Enable verbose output
  -v, --version           Show version number
  -h, --help              Show this help

Interactive Commands:
  /help                   Show available commands
  /status                 Show current status
  /config                 View/modify configuration
  /init                   Initialize memory for project
  /remember <text>        Store information in memory
  /clear                  Clear conversation (keep memory)

Examples:
  yoyo-ai                           Start interactive session
  yoyo-ai --new                     Start fresh conversation
  yoyo-ai -p "explain this code"    Quick prompt (headless)
  yoyo-ai --model gpt-4             Use specific model
`.trim();
}

/**
 * Validate parsed arguments.
 *
 * @param args - Parsed arguments
 * @returns Error message if invalid, null if valid
 */
export function validateArgs(args: CLIArgs): string | null {
  // Cannot use both --new and --continue
  if (args.new && args.continue) {
    return 'Cannot use both --new and --continue';
  }

  // Validate output format for headless mode
  if (!args.headless && args.output !== 'text') {
    return 'Output format can only be specified in headless mode';
  }

  return null;
}
