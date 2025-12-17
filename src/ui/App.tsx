/**
 * Main App Component
 *
 * The root React/Ink component for the Yoyo AI CLI.
 * Provides the main layout structure and keyboard handling.
 */

import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { AppProvider, useAppContext } from './context.js';
import { StatusBar } from './components/StatusBar.js';
import { Input } from './components/Input.js';
import { Output } from './components/Output.js';
import type { AppProps } from './types.js';

// =============================================================================
// Footer Component
// =============================================================================

function Footer(): React.ReactElement {
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Text color="gray">
        Ctrl+C to exit | /help for commands
      </Text>
      <Text color="gray">
        v4.0.0-alpha.1
      </Text>
    </Box>
  );
}

// =============================================================================
// Error Display
// =============================================================================

function ErrorDisplay(): React.ReactElement | null {
  const { state } = useAppContext();

  if (!state.error) return null;

  return (
    <Box
      borderStyle="round"
      borderColor="red"
      paddingX={1}
      marginY={1}
    >
      <Text color="red" bold>
        Error: {state.error}
      </Text>
    </Box>
  );
}

// =============================================================================
// Main Layout
// =============================================================================

function MainLayout(): React.ReactElement {
  const { exit, state, submitInput } = useAppContext();

  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+C to exit
    if (key.ctrl && input === 'c') {
      exit();
    }
    // Ctrl+D to exit
    if (key.ctrl && input === 'd') {
      exit();
    }
  });

  if (state.exiting) {
    return (
      <Box padding={1}>
        <Text color="yellow">Goodbye!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <StatusBar state={state} />
      <ErrorDisplay />
      <Box flexDirection="column" flexGrow={1} minHeight={10}>
        <Output messages={state.messages} streaming={state.mode === 'streaming'} />
      </Box>
      <Input
        onSubmit={submitInput}
        disabled={state.mode === 'processing'}
      />
      <Footer />
    </Box>
  );
}

// =============================================================================
// App Component
// =============================================================================

/**
 * Main App component.
 *
 * Wraps the application in the AppProvider context and renders the main layout.
 */
export function App({ cliState, onExit }: AppProps): React.ReactElement {
  // Handle exit callback
  useEffect(() => {
    return () => {
      onExit?.();
    };
  }, [onExit]);

  return (
    <AppProvider
      config={cliState.config}
      initialModel={cliState.model}
      projectRoot={cliState.cwd}
    >
      <MainLayout />
    </AppProvider>
  );
}

export default App;
