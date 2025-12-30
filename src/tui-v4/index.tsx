/**
 * TUI v4 Entry Point
 *
 * Launches the Ink-based TUI application with error handling.
 * This file is invoked by the `yoyo --tui-v4` CLI command.
 */

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { setupGlobalErrorHandlers, handleFatalError } from './utils/error-handler.js';

/**
 * Check if the terminal supports raw mode (required for Ink input handling)
 */
function checkTTYSupport(): boolean {
  // Check if stdin is a TTY
  if (!process.stdin.isTTY) {
    return false;
  }

  // Check if we can enable raw mode
  if (typeof process.stdin.setRawMode !== 'function') {
    return false;
  }

  return true;
}

/**
 * Launch the TUI application
 */
export async function launchTUI(): Promise<void> {
  try {
    // Setup global error handlers
    setupGlobalErrorHandlers();

    // Check TTY support before launching
    if (!checkTTYSupport()) {
      console.error('\x1b[31m✗\x1b[0m TUI requires an interactive terminal (TTY)');
      console.error('');
      console.error('  This can happen when:');
      console.error('  • Running from a script without TTY allocation');
      console.error('  • Piping input/output');
      console.error('  • Running in a non-interactive environment');
      console.error('');
      console.error('  Solutions:');
      console.error('  • Run directly in a terminal: \x1b[36myoyo\x1b[0m');
      console.error('  • Use script with TTY: \x1b[36mscript -q /dev/null yoyo\x1b[0m');
      console.error('');
      process.exit(1);
    }

    const { waitUntilExit } = render(<App />);

    await waitUntilExit();
  } catch (error) {
    handleFatalError(error instanceof Error ? error : new Error(String(error)), 'TUI Launch');
  }
}

// If run directly (not imported), launch the TUI
if (import.meta.url === `file://${process.argv[1]}`) {
  launchTUI().catch((error) => {
    // This catch block should rarely be reached due to internal error handling
    // But it provides a final safety net
    handleFatalError(error instanceof Error ? error : new Error(String(error)), 'Startup');
  });
}
