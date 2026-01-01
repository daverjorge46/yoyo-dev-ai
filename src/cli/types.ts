/**
 * CLI Types
 *
 * Type definitions for the Yoyo AI CLI.
 */

// =============================================================================
// CLI Arguments
// =============================================================================

/**
 * Parsed CLI arguments.
 */
export interface CLIArgs {
  /** AI model to use (e.g., 'claude-sonnet', 'gpt-4') */
  model?: string;

  /** Start a new conversation (clear previous context) */
  new: boolean;

  /** Continue previous conversation */
  continue: boolean;

  /** Direct prompt for headless mode */
  prompt?: string;

  /** Run in headless mode (no interactive UI) */
  headless: boolean;

  /** Output format for headless mode */
  output: OutputFormat;

  /** Show version */
  version: boolean;

  /** Show help */
  help: boolean;

  /** Working directory */
  cwd: string;

  /** Verbose output */
  verbose: boolean;

  /** Remaining positional arguments */
  args: string[];
}

/**
 * Output format for headless mode.
 */
export type OutputFormat = 'text' | 'json' | 'stream-json';

// =============================================================================
// Configuration
// =============================================================================

/**
 * CLI configuration.
 */
export interface CLIConfig {
  /** Default AI model */
  defaultModel: string;

  /** Memory settings */
  memory: {
    /** Enable memory system */
    enabled: boolean;
    /** Project memory path */
    projectPath: string;
    /** Global memory path */
    globalPath: string;
  };

  /** UI settings */
  ui: {
    /** Enable colors */
    colors: boolean;
    /** Enable animations */
    animations: boolean;
    /** Theme */
    theme: 'dark' | 'light' | 'auto';
  };

  /** API settings */
  api: {
    /** API base URL */
    baseUrl?: string;
    /** Request timeout in ms */
    timeout: number;
  };

  /** Debug settings */
  debug: {
    /** Enable debug mode */
    enabled: boolean;
    /** Log level */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Default CLI configuration.
 */
export const DEFAULT_CONFIG: CLIConfig = {
  defaultModel: 'claude-sonnet',
  memory: {
    enabled: true,
    projectPath: '.yoyo-dev/memory',
    globalPath: '~/.yoyo-dev/memory',
  },
  ui: {
    colors: true,
    animations: true,
    theme: 'auto',
  },
  api: {
    timeout: 30000,
  },
  debug: {
    enabled: false,
    logLevel: 'warn',
  },
};

// =============================================================================
// CLI State
// =============================================================================

/**
 * CLI runtime state.
 */
export interface CLIState {
  /** Current configuration */
  config: CLIConfig;

  /** Parsed arguments */
  args: CLIArgs;

  /** Whether CLI is initialized */
  initialized: boolean;

  /** Current working directory */
  cwd: string;

  /** Is running in interactive mode */
  interactive: boolean;

  /** Current model */
  model: string;
}

// =============================================================================
// Exit Codes
// =============================================================================

/**
 * CLI exit codes.
 */
export enum ExitCode {
  /** Success */
  SUCCESS = 0,
  /** General error */
  ERROR = 1,
  /** Configuration error */
  CONFIG_ERROR = 2,
  /** API error */
  API_ERROR = 3,
  /** User cancelled */
  CANCELLED = 130,
}
