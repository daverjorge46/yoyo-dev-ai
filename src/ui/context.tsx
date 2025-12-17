/**
 * App Context
 *
 * React context for sharing state across the application.
 * Uses useReducer for predictable state updates.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useApp } from 'ink';
import { v4 as uuid } from 'uuid';
import type { CLIConfig } from '../cli/types.js';
import { MemoryService } from '../memory/index.js';
import {
  initializeCommands,
  isCommand,
  routeCommand,
} from '../commands/index.js';
import type {
  AppState,
  AppAction,
  AppContextValue,
  Message,
} from './types.js';
import { INITIAL_APP_STATE } from './types.js';

// Initialize commands on module load
initializeCommands();

// =============================================================================
// Reducer
// =============================================================================

/**
 * App state reducer.
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_INPUT':
      return { ...state, input: action.input };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.id
            ? { ...msg, content: action.content, streaming: action.streaming ?? msg.streaming }
            : msg
        ),
      };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };

    case 'SET_MODEL':
      return { ...state, model: action.model };

    case 'SET_MEMORY_SERVICE':
      return { ...state, memoryService: action.service };

    case 'SET_MEMORY':
      return { ...state, memory: action.memory };

    case 'SET_ERROR':
      return { ...state, error: action.error, mode: action.error ? 'error' : state.mode };

    case 'SET_EXITING':
      return { ...state, exiting: action.exiting };

    case 'RESET':
      return { ...INITIAL_APP_STATE };

    default:
      return state;
  }
}

// =============================================================================
// Context
// =============================================================================

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Props for AppProvider.
 */
interface AppProviderProps {
  children: React.ReactNode;
  config: CLIConfig;
  initialModel?: string;
  projectRoot?: string;
}

/**
 * App context provider.
 */
export function AppProvider({
  children,
  config,
  initialModel,
  projectRoot,
}: AppProviderProps): React.ReactElement {
  const { exit: inkExit } = useApp();
  const [state, dispatch] = useReducer(appReducer, {
    ...INITIAL_APP_STATE,
    model: initialModel ?? config.defaultModel,
  });

  // Initialize memory service
  useEffect(() => {
    if (!config.memory.enabled) return undefined;

    try {
      const service = new MemoryService({
        projectRoot: projectRoot ?? process.cwd(),
        globalPath: config.memory.globalPath,
      });
      service.initialize();

      dispatch({ type: 'SET_MEMORY_SERVICE', service });

      // Load memory
      const memory = service.loadAllMemory();
      dispatch({ type: 'SET_MEMORY', memory });

      // Cleanup on unmount
      return () => {
        service.close();
      };
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: `Failed to initialize memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return undefined;
    }
  }, [config.memory.enabled, config.memory.globalPath, projectRoot]);

  /**
   * Submit user input.
   */
  const submitInput = useCallback(async (input: string) => {
    if (!input.trim()) return;

    // Check if it's a command
    if (isCommand(input)) {
      dispatch({ type: 'SET_MODE', mode: 'processing' });

      const result = await routeCommand(input, {
        state,
        dispatch,
        config,
      });

      // Add command result as system message
      const systemMessage: Message = {
        id: uuid(),
        role: 'system',
        content: result.success ? (result.output ?? 'Command executed') : `Error: ${result.error}`,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', message: systemMessage });
      dispatch({ type: 'SET_MODE', mode: 'idle' });
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: uuid(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMessage });
    dispatch({ type: 'SET_INPUT', input: '' });
    dispatch({ type: 'SET_MODE', mode: 'processing' });

    // TODO: Send to AI (Phase 3)
    // For now, add a placeholder response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: uuid(),
        role: 'assistant',
        content: `Processing: "${input}"\n\nAI integration coming in Phase 3...`,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', message: assistantMessage });
      dispatch({ type: 'SET_MODE', mode: 'idle' });
    }, 500);
  }, [state, config]);

  /**
   * Clear conversation.
   */
  const clearConversation = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'SET_MODE', mode: 'idle' });
  }, []);

  /**
   * Exit application.
   */
  const exit = useCallback(() => {
    dispatch({ type: 'SET_EXITING', exiting: true });

    // Close memory service
    if (state.memoryService) {
      state.memoryService.close();
    }

    // Exit Ink
    inkExit();
  }, [inkExit, state.memoryService]);

  const value: AppContextValue = {
    state,
    dispatch,
    config,
    submitInput,
    clearConversation,
    exit,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to access app context.
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

/**
 * Hook to access app state.
 */
export function useAppState(): AppState {
  return useAppContext().state;
}

/**
 * Hook to access app config.
 */
export function useAppConfig(): CLIConfig {
  return useAppContext().config;
}
