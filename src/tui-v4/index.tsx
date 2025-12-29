/**
 * TUI v4 Entry Point
 *
 * Launches the Ink-based TUI application.
 * This file is invoked by the `yoyo --tui-v4` CLI command.
 */

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

/**
 * Launch the TUI application
 */
export function launchTUI() {
  const { waitUntilExit } = render(<App />);

  return waitUntilExit();
}

// If run directly (not imported), launch the TUI
if (import.meta.url === `file://${process.argv[1]}`) {
  launchTUI().catch((error) => {
    console.error('TUI crashed:', error);
    process.exit(1);
  });
}
