/**
 * MCPStatusCard Component
 *
 * Displays MCP server status.
 */

import { useQuery } from '@tanstack/react-query';
import { Server, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface MCPServer {
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  image?: string;
  tag?: string;
}

interface MCPStatus {
  available: boolean;
  gateway: string | null;
  clientConnected: boolean;
  servers: MCPServer[];
  lastCheck: string;
  error: string | null;
}

async function fetchMCPStatus(): Promise<MCPStatus> {
  const res = await fetch('/api/mcp');
  if (!res.ok) throw new Error('Failed to fetch MCP status');
  return res.json();
}

export function MCPStatusCard() {
  const { data: mcp, isLoading, error } = useQuery({
    queryKey: ['mcp'],
    queryFn: fetchMCPStatus,
    refetchInterval: 60000, // Refresh every 60s
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Server className="h-4 w-4" />
          <span className="text-sm font-medium">MCP Servers</span>
        </div>
        <p className="text-sm text-red-500 mt-2">Failed to load</p>
      </div>
    );
  }

  if (!mcp?.available) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Server className="h-4 w-4" />
          <span className="text-sm font-medium">MCP Servers</span>
        </div>
        <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          {mcp?.error || 'MCP not available'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Server className="h-4 w-4" />
          <span className="text-sm font-medium">MCP Servers</span>
        </div>
        <span className="text-xs text-gray-400">
          {mcp.gateway && `via ${mcp.gateway}`}
        </span>
      </div>

      {/* Client Status */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        {mcp.clientConnected ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Claude connected
          </span>
        ) : (
          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Claude not connected
          </span>
        )}
      </div>

      {/* Server List */}
      {mcp.servers.length > 0 ? (
        <div className="space-y-1.5">
          {mcp.servers.map((server, index) => (
            <div
              key={server.name || `server-${index}`}
              className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded"
            >
              <div className="flex items-center gap-2">
                {server.status === 'running' ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className="text-gray-700 dark:text-gray-300">{server.name}</span>
              </div>
              {server.tag && (
                <span className="text-xs text-gray-400">{server.tag}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No servers enabled</p>
      )}

      {/* Server Count */}
      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
        {mcp.servers.length} server{mcp.servers.length !== 1 ? 's' : ''} enabled
      </div>
    </div>
  );
}
