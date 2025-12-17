#!/usr/bin/env node
/**
 * Yoyo AI CLI Entry Point
 *
 * Main entry point for the Yoyo AI command line interface.
 * Handles argument parsing, configuration loading, and mode selection.
 */

import React from 'react';
import { render } from 'ink';
import { parseArgs, validateArgs, VERSION } from './args.js';
import { loadConfig } from './config.js';
import { runHeadless } from './headless.js';
import type { CLIArgs, CLIConfig, CLIState, ExitCode } from './types.js';
import { App } from '../ui/App.js';

// =============================================================================
// CLI Initialization
// =============================================================================

/**
 * Initialize CLI state.
 *
 * @param args - Parsed CLI arguments
 * @param config - Loaded configuration
 * @returns CLI state
 */
function initializeState(args: CLIArgs, config: CLIConfig): CLIState {
  return {
    config,
    args,
    initialized: true,
    cwd: args.cwd,
    interactive: !args.headless,
    model: args.model ?? config.defaultModel,
  };
}

/**
 * Log debug information if verbose mode is enabled.
 *
 * @param state - CLI state
 */
function logDebugInfo(state: CLIState): void {
  if (!state.config.debug.enabled) return;

  console.log('\n[Debug] CLI State:');
  console.log(`  Version: ${VERSION}`);
  console.log(`  Model: ${state.model}`);
  console.log(`  Interactive: ${state.interactive}`);
  console.log(`  CWD: ${state.cwd}`);
  console.log(`  Memory Enabled: ${state.config.memory.enabled}`);
  console.log('');
}

// =============================================================================
// Mode Handlers
// =============================================================================

/**
 * Run in interactive mode (React/Ink UI).
 *
 * @param state - CLI state
 * @returns Exit code
 */
async function runInteractive(state: CLIState): Promise<ExitCode> {
  return new Promise((resolve) => {
    const { waitUntilExit } = render(
      React.createElement(App, {
        cliState: state,
        onExit: () => resolve(0 as ExitCode),
      })
    );

    waitUntilExit().then(() => {
      resolve(0 as ExitCode);
    });
  });
}

// Headless mode is implemented in ./headless.ts

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  let exitCode: ExitCode = 0 as ExitCode;

  try {
    // Parse arguments
    const args = parseArgs();

    // Validate arguments
    const validationError = validateArgs(args);
    if (validationError) {
      console.error(`Error: ${validationError}`);
      console.log('\nRun "yoyo-ai --help" for usage information.');
      process.exit(1);
    }

    // Load configuration
    const config = loadConfig(args);

    // Initialize state
    const state = initializeState(args, config);

    // Log debug info
    logDebugInfo(state);

    // Run appropriate mode
    if (state.interactive) {
      exitCode = await runInteractive(state);
    } else {
      exitCode = await runHeadless(state);
    }
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
    exitCode = 1 as ExitCode;
  }

  process.exit(exitCode);
}

// Run CLI
main();
