/**
 * useChatConfig Hook
 *
 * Manages chat API key configuration.
 * Handles localStorage persistence and backend synchronization.
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UseChatConfigReturn {
  /** Whether API key is configured */
  isConfigured: boolean;
  /** Whether a configuration request is in progress */
  isLoading: boolean;
  /** Current error, if any */
  error: Error | null;
  /** Configure API key (saves to localStorage and backend) */
  configureApiKey: (apiKey: string) => Promise<boolean>;
  /** Clear API key from localStorage */
  clearApiKey: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'YOYO_CHAT_API_KEY';
const CONFIGURE_ENDPOINT = '/api/chat/configure';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Load API key from localStorage
 */
function loadApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to load API key from localStorage:', err);
    return null;
  }
}

/**
 * Save API key to localStorage
 */
function saveApiKey(apiKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, apiKey);
  } catch (err) {
    console.error('Failed to save API key to localStorage:', err);
    throw new Error('Failed to save API key locally');
  }
}

/**
 * Remove API key from localStorage
 */
function removeApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove API key from localStorage:', err);
  }
}

/**
 * Configure API key via backend
 */
async function configureApiKeyBackend(apiKey: string): Promise<boolean> {
  const response = await fetch(CONFIGURE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Configuration failed' }));
    throw new Error(error.error || error.message || 'Failed to configure API key');
  }

  const data = await response.json();
  return data.success === true;
}

// =============================================================================
// Hook
// =============================================================================

export function useChatConfig(): UseChatConfigReturn {
  // State
  const [apiKey, setApiKey] = useState<string | null>(() => loadApiKey());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Derived state
  const isConfigured = apiKey !== null && apiKey.trim().length > 0;

  // Configure API key
  const configureApiKey = useCallback(async (newApiKey: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate input
      const trimmedKey = newApiKey.trim();
      if (!trimmedKey) {
        throw new Error('API key cannot be empty');
      }

      // Configure backend first
      const success = await configureApiKeyBackend(trimmedKey);

      if (success) {
        // Save to localStorage
        saveApiKey(trimmedKey);
        setApiKey(trimmedKey);
        return true;
      } else {
        throw new Error('Backend configuration failed');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear API key
  const clearApiKey = useCallback(() => {
    removeApiKey();
    setApiKey(null);
    setError(null);
  }, []);

  return {
    isConfigured,
    isLoading,
    error,
    configureApiKey,
    clearApiKey,
  };
}

export default useChatConfig;
