/**
 * ApiKeySettings Component
 *
 * UI for configuring Anthropic API key.
 * Provides secure input with show/hide toggle and validation.
 *
 * Accessibility:
 * - Proper ARIA labels
 * - Focus management
 * - Screen reader announcements
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface ApiKeySettingsProps {
  /** Callback when API key is saved. Should return a promise. */
  onSave: (apiKey: string) => Promise<void>;
  /** Optional callback called after successful save */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ApiKeySettings({ onSave, onSuccess }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(trimmedKey);

      // Success
      setSuccess(true);
      setApiKey('');
      setError(null);

      // Call success callback
      onSuccess?.();

      // Focus input for next entry (use setTimeout to ensure it happens after state updates)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const canSave = apiKey.trim().length > 0 && !isLoading;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Configure API Key
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter your Anthropic API key to enable the chat feature.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* API Key Input */}
          <div>
            <label
              htmlFor="api-key-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              API Key
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="api-key-input"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
                placeholder="sk-ant-..."
                className="
                  w-full px-4 py-2.5 pr-12 rounded-lg
                  bg-white dark:bg-gray-900
                  border border-gray-300 dark:border-gray-600
                  text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                aria-label="Anthropic API Key"
              />

              {/* Show/Hide Toggle */}
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={isLoading}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  p-1 rounded
                  text-gray-500 dark:text-gray-400
                  hover:text-gray-700 dark:hover:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-150
                "
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Get API Key Link */}
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Don't have an API key?{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-1
                  text-indigo-600 dark:text-indigo-400
                  hover:text-indigo-700 dark:hover:text-indigo-300
                  hover:underline
                "
              >
                Get one from Anthropic
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={!canSave}
            className="
              w-full flex items-center justify-center gap-2
              px-4 py-2.5 rounded-lg
              bg-indigo-600 text-white
              hover:bg-indigo-700
              focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              font-medium
            "
            aria-label={isLoading ? 'Saving API key...' : 'Save API key'}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>

          {/* Success Message */}
          {success && (
            <div
              className="
                flex items-start gap-3 p-4 rounded-lg
                bg-green-50 dark:bg-green-900/20
                text-green-700 dark:text-green-400
              "
              role="alert"
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">API key saved successfully</p>
                <p className="text-sm mt-1 opacity-80">
                  You can now use the chat feature to explore your codebase.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              className="
                flex items-start gap-3 p-4 rounded-lg
                bg-red-50 dark:bg-red-900/20
                text-red-700 dark:text-red-400
              "
              role="alert"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Failed to save API key</p>
                <p className="text-sm mt-1 opacity-80">{error}</p>
              </div>
            </div>
          )}
        </form>

        {/* Security Note */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Note:</strong> Your API key is stored locally in your browser and sent
            directly to Anthropic's API. It is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ApiKeySettings;
