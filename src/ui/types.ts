/**
 * UI Types
 *
 * Type definitions for the React/Ink terminal UI.
 */

import type { CLIConfig, CLIState } from '../cli/types.js';
import type { MemoryService, LoadedMemory } from '../memory/index.js';

// =============================================================================
// App State
// =============================================================================

/**
 * Application mode.
 */
export type AppMode = 'idle' | 'input' | 'processing' | 'streaming' | 'error';

/**
 * Message in the conversation.
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

/**
 * Application state for the UI.
 */
export interface AppState {
  /** Current application mode */
  mode: AppMode;

  /** Current input text */
  input: string;

  /** Conversation messages */
  messages: Message[];

  /** Current model */
  model: string;

  /** Memory service instance */
  memoryService: MemoryService | null;

  /** Loaded memory */
  memory: LoadedMemory | null;

  /** Error message if any */
  error: string | null;

  /** Is app exiting */
  exiting: boolean;
}

/**
 * Initial app state.
 */
export const INITIAL_APP_STATE: AppState = {
  mode: 'idle',
  input: '',
  messages: [],
  model: 'claude-sonnet',
  memoryService: null,
  memory: null,
  error: null,
  exiting: false,
};

// =============================================================================
// App Actions
// =============================================================================

/**
 * Actions that can be dispatched to update app state.
 */
export type AppAction =
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'SET_INPUT'; input: string }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'UPDATE_MESSAGE'; id: string; content: string; streaming?: boolean }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_MODEL'; model: string }
  | { type: 'SET_MEMORY_SERVICE'; service: MemoryService }
  | { type: 'SET_MEMORY'; memory: LoadedMemory }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_EXITING'; exiting: boolean }
  | { type: 'RESET' };

// =============================================================================
// Context Types
// =============================================================================

/**
 * App context value.
 */
export interface AppContextValue {
  /** Current state */
  state: AppState;

  /** Dispatch function */
  dispatch: React.Dispatch<AppAction>;

  /** CLI configuration */
  config: CLIConfig;

  /** Submit user input */
  submitInput: (input: string) => void;

  /** Clear conversation */
  clearConversation: () => void;

  /** Exit application */
  exit: () => void;
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the main App component.
 */
export interface AppProps {
  /** CLI state */
  cliState: CLIState;

  /** Callback when app exits */
  onExit?: () => void;
}

/**
 * Props for layout components.
 */
export interface LayoutProps {
  children: React.ReactNode;
}
