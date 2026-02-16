import React, { useState } from 'react';
import { KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { useGateway } from '../contexts/GatewayContext';

/**
 * Full-screen gate shown when the gateway token could not be auto-loaded.
 * The user can paste their token manually to connect.
 */
export function TokenGate() {
  const { error, submitToken, state } = useGateway();
  const [token, setToken] = useState('');
  const isConnecting = state === 'connecting';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed) {
      submitToken(trimmed);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-terminal-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-terminal-card rounded-xl shadow-lg border border-gray-200 dark:border-terminal-border p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10">
              <KeyRound className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-terminal-text">
                Yoyo AI Gateway
              </h1>
              <p className="text-sm text-gray-500 dark:text-terminal-text-secondary">
                Enter your gateway token to connect
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Token form */}
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="gateway-token"
              className="block text-sm font-medium text-gray-700 dark:text-terminal-text-secondary mb-2"
            >
              Gateway Token
            </label>
            <input
              id="gateway-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your gateway token..."
              disabled={isConnecting}
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-terminal-border bg-white dark:bg-terminal-elevated text-gray-900 dark:text-terminal-text placeholder-gray-400 dark:placeholder-terminal-text-secondary focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent disabled:opacity-50 font-mono text-sm"
            />

            <button
              type="submit"
              disabled={!token.trim() || isConnecting}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium text-sm transition-colors disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </form>

          {/* Help text */}
          <p className="mt-4 text-xs text-gray-400 dark:text-terminal-text-secondary text-center">
            Token is stored in <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-terminal-elevated">~/.yoyoclaw/.gateway-token</code>
          </p>
        </div>
      </div>
    </div>
  );
}
