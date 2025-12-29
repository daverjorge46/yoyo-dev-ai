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
 * Launch the TUI application
 */
export async function launchTUI(): Promise<void> {
  try {
    // Setup global error handlers
    setupGlobalErrorHandlers();

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
