/**
 * Session Persistence Utility
 *
 * Saves and restores TUI session state:
 * - Focus state (active panel)
 * - Scroll positions
 * - Collapsed tasks
 * - Last active spec
 *
 * Saved to: .yoyo-dev/.tui-session.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SessionState {
  focusedPanel: 'left' | 'right';
  scrollPosition: {
    tasks: number;
    logs: number;
  };
  collapsedTasks: string[]; // Task IDs that are collapsed
  activeTaskId: string | null;
  activeSpecPath: string | null;
  lastUpdated: string;
}

const SESSION_FILE = '.yoyo-dev/.tui-session.json';

/**
 * Get session file path
 */
function getSessionFilePath(): string {
  return join(process.cwd(), SESSION_FILE);
}

/**
 * Save session state to disk
 */
export function saveSession(state: Partial<SessionState>): void {
  try {
    const filePath = getSessionFilePath();

    // Load existing session or create new
    let session: SessionState = {
      focusedPanel: 'left',
      scrollPosition: { tasks: 0, logs: 0 },
      collapsedTasks: [],
      activeTaskId: null,
      activeSpecPath: null,
      lastUpdated: new Date().toISOString(),
    };

    if (existsSync(filePath)) {
      const existing = readFileSync(filePath, 'utf-8');
      session = { ...session, ...JSON.parse(existing) };
    }

    // Merge with new state
    const updatedSession: SessionState = {
      ...session,
      ...state,
      lastUpdated: new Date().toISOString(),
    };

    writeFileSync(filePath, JSON.stringify(updatedSession, null, 2), 'utf-8');
  } catch (error) {
    console.error('[SessionPersistence] Failed to save session:', error);
  }
}

/**
 * Load session state from disk
 */
export function loadSession(): SessionState | null {
  try {
    const filePath = getSessionFilePath();

    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[SessionPersistence] Failed to load session:', error);
    return null;
  }
}

/**
 * Clear session state
 */
export function clearSession(): void {
  try {
    const filePath = getSessionFilePath();

    if (existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify({
        focusedPanel: 'left',
        scrollPosition: { tasks: 0, logs: 0 },
        collapsedTasks: [],
        activeTaskId: null,
        activeSpecPath: null,
        lastUpdated: new Date().toISOString(),
      }, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('[SessionPersistence] Failed to clear session:', error);
  }
}
