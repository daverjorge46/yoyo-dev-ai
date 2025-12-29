/**
 * User Preferences Utility
 *
 * Loads user configuration from ~/.yoyo-dev/tui-config.json
 * - Custom color schemes
 * - Layout proportions
 * - Keybindings
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ColorScheme {
  primary: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  textBody: string;
  background: string;
  surface: string;
}

export interface LayoutPreferences {
  splitRatio: number; // 0.0-1.0 (e.g., 0.4 = 40% left, 60% right)
  borderStyle: 'single' | 'double' | 'round' | 'bold';
  showTimestamps: boolean;
}

export interface KeyBindings {
  help: string;
  quit: string;
  refresh: string;
  commandPalette: string;
  closeModal: string;
  focusLeft: string;
  focusRight: string;
  toggleFocus: string;
  moveUp: string;
  moveDown: string;
  jumpTop: string;
  jumpBottom: string;
  expandCollapse: string;
  selectTask: string;
  scrollLogsUp: string;
  scrollLogsDown: string;
}

export interface UserPreferences {
  colorScheme: Partial<ColorScheme>;
  layout: Partial<LayoutPreferences>;
  keyBindings: Partial<KeyBindings>;
}

const CONFIG_FILE = '.yoyo-dev/tui-config.json';

/**
 * Get user config file path
 */
function getConfigFilePath(): string {
  return join(homedir(), CONFIG_FILE);
}

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  colorScheme: {},
  layout: {
    splitRatio: 0.4,
    borderStyle: 'round',
    showTimestamps: true,
  },
  keyBindings: {
    help: '?',
    quit: 'q',
    refresh: 'r',
    commandPalette: '/',
    closeModal: 'escape',
    focusLeft: 'h',
    focusRight: 'l',
    toggleFocus: 'tab',
    moveUp: 'k',
    moveDown: 'j',
    jumpTop: 'g',
    jumpBottom: 'G',
    expandCollapse: 'return',
    selectTask: 'space',
    scrollLogsUp: 'ctrl+u',
    scrollLogsDown: 'ctrl+d',
  },
};

/**
 * Load user preferences from disk
 */
export function loadUserPreferences(): UserPreferences {
  try {
    const filePath = getConfigFilePath();

    if (!existsSync(filePath)) {
      return DEFAULT_PREFERENCES;
    }

    const content = readFileSync(filePath, 'utf-8');
    const userConfig = JSON.parse(content);

    // Merge with defaults
    return {
      colorScheme: { ...DEFAULT_PREFERENCES.colorScheme, ...userConfig.colorScheme },
      layout: { ...DEFAULT_PREFERENCES.layout, ...userConfig.layout },
      keyBindings: { ...DEFAULT_PREFERENCES.keyBindings, ...userConfig.keyBindings },
    };
  } catch (error) {
    console.error('[UserPreferences] Failed to load user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Get specific preference value with fallback
 */
export function getPreference<K extends keyof UserPreferences>(
  preferences: UserPreferences,
  category: K,
  key: keyof UserPreferences[K]
): any {
  return preferences[category][key] ?? DEFAULT_PREFERENCES[category][key];
}

/**
 * Validate layout preferences
 */
export function validateLayoutPreferences(layout: Partial<LayoutPreferences>): boolean {
  if (layout.splitRatio !== undefined) {
    if (layout.splitRatio < 0 || layout.splitRatio > 1) {
      console.warn('[UserPreferences] Invalid splitRatio, must be between 0 and 1');
      return false;
    }
  }

  if (layout.borderStyle !== undefined) {
    const validStyles = ['single', 'double', 'round', 'bold'];
    if (!validStyles.includes(layout.borderStyle)) {
      console.warn('[UserPreferences] Invalid borderStyle, must be one of:', validStyles);
      return false;
    }
  }

  return true;
}

/**
 * Get example config for documentation
 */
export function getExampleConfig(): string {
  return JSON.stringify(
    {
      colorScheme: {
        primary: '#89b4fa',
        success: '#a6e3a1',
        warning: '#f9e2af',
        error: '#f38ba8',
      },
      layout: {
        splitRatio: 0.4,
        borderStyle: 'round',
        showTimestamps: true,
      },
      keyBindings: {
        help: '?',
        quit: 'q',
        refresh: 'r',
        commandPalette: '/',
      },
    },
    null,
    2
  );
}
