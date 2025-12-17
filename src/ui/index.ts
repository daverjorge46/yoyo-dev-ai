/**
 * UI Module Exports
 *
 * Public API for the React/Ink terminal UI.
 */

// App
export { App, default as AppComponent } from './App.js';

// Context
export {
  AppProvider,
  useAppContext,
  useAppState,
  useAppConfig,
} from './context.js';

// Components
export {
  StatusBar,
  Input,
  Output,
  Spinner,
  ProgressBar,
  StepProgress,
  Loading,
} from './components/index.js';

// Hooks
export { useInputHistory } from './hooks/index.js';

// Types
export type {
  AppMode,
  Message,
  AppState,
  AppAction,
  AppContextValue,
  AppProps,
  LayoutProps,
} from './types.js';

export { INITIAL_APP_STATE } from './types.js';
