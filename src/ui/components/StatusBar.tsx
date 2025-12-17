/**
 * StatusBar Component
 *
 * Top bar showing current model, memory status, and connection state.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { AppState } from '../types.js';

// =============================================================================
// Types
// =============================================================================

interface StatusBarProps {
  state: AppState;
  version?: string;
}

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// =============================================================================
// Status Indicators
// =============================================================================

function ModelIndicator({ model }: { model: string }): React.ReactElement {
  return (
    <Text>
      <Text color="gray">Model: </Text>
      <Text color="green" bold>{model}</Text>
    </Text>
  );
}

function MemoryIndicator({ memory }: { memory: AppState['memory'] }): React.ReactElement {
  if (!memory) {
    return (
      <Text>
        <Text color="gray">Memory: </Text>
        <Text color="yellow">disabled</Text>
      </Text>
    );
  }

  // Count active memory blocks
  const blockCount = Object.keys(memory).filter(
    (k) => memory[k as keyof typeof memory]
  ).length;

  return (
    <Text>
      <Text color="gray">Memory: </Text>
      <Text color="green">{blockCount} blocks</Text>
    </Text>
  );
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }): React.ReactElement {
  const colors: Record<ConnectionStatus, string> = {
    connected: 'green',
    connecting: 'yellow',
    disconnected: 'gray',
    error: 'red',
  };

  const icons: Record<ConnectionStatus, string> = {
    connected: '●',
    connecting: '◐',
    disconnected: '○',
    error: '✕',
  };

  return (
    <Text color={colors[status]}>
      {icons[status]}
    </Text>
  );
}

function ModeIndicator({ mode }: { mode: AppState['mode'] }): React.ReactElement {
  const colors: Record<AppState['mode'], string> = {
    idle: 'green',
    input: 'blue',
    processing: 'yellow',
    streaming: 'cyan',
    error: 'red',
  };

  const labels: Record<AppState['mode'], string> = {
    idle: 'Ready',
    input: 'Input',
    processing: 'Processing...',
    streaming: 'Streaming...',
    error: 'Error',
  };

  return (
    <Text color={colors[mode]}>{labels[mode]}</Text>
  );
}

// =============================================================================
// StatusBar Component
// =============================================================================

/**
 * StatusBar displays current model, memory status, connection state, and mode.
 */
export function StatusBar({ state, version = '4.0.0-alpha' }: StatusBarProps): React.ReactElement {
  // Determine connection status based on mode
  const connectionStatus: ConnectionStatus =
    state.mode === 'error' ? 'error' :
    state.mode === 'processing' || state.mode === 'streaming' ? 'connected' :
    state.memoryService ? 'connected' : 'disconnected';

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      {/* Left section: Logo and version */}
      <Box>
        <Text bold color="cyan">Yoyo AI</Text>
        <Text color="gray"> v{version}</Text>
      </Box>

      {/* Center section: Status indicators */}
      <Box gap={2}>
        <ModelIndicator model={state.model} />
        <Text color="gray">|</Text>
        <MemoryIndicator memory={state.memory} />
        <Text color="gray">|</Text>
        <ModeIndicator mode={state.mode} />
      </Box>

      {/* Right section: Connection status */}
      <ConnectionIndicator status={connectionStatus} />
    </Box>
  );
}

export default StatusBar;
