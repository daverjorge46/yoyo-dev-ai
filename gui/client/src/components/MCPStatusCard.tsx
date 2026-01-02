/**
 * MCPStatusCard Component
 *
 * Terminal-styled display of MCP server status.
 */

import { useQuery } from '@tanstack/react-query';
import { Server, AlertTriangle, Circle } from 'lucide-react';

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
      <div className="terminal-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="terminal-card p-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-500 dark:text-terminal-text-muted" />
          <span className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
            MCP Servers
          </span>
        </div>
        <p className="text-sm text-error dark:text-terminal-red mt-2">Failed to load</p>
      </div>
    );
  }

  if (!mcp?.available) {
    return (
      <div className="terminal-card p-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-500 dark:text-terminal-text-muted" />
          <span className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
            MCP Servers
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-warning-dark dark:text-terminal-yellow">
          <AlertTriangle className="h-4 w-4" />
          <span>{mcp?.error || 'MCP not available'}</span>
        </div>
      </div>
    );
  }

  const runningCount = mcp.servers.filter((s) => s.status === 'running').length;

  return (
    <div className="terminal-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-brand dark:text-terminal-orange" />
          <span className="text-sm font-semibold text-gray-900 dark:text-terminal-text uppercase tracking-wide">
            MCP Servers
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-terminal-text-muted">
          {mcp.gateway && `via ${mcp.gateway}`}
        </span>
      </div>

      {/* Client Status */}
      <div className="flex items-center gap-2 mb-4 py-2 px-3 bg-gray-50 dark:bg-terminal-elevated rounded">
        {mcp.clientConnected ? (
          <>
            <Circle className="h-2 w-2 text-terminal-green fill-terminal-green" />
            <span className="text-sm text-success dark:text-terminal-green font-medium">
              Claude connected
            </span>
          </>
        ) : (
          <>
            <Circle className="h-2 w-2 text-terminal-yellow fill-terminal-yellow" />
            <span className="text-sm text-warning-dark dark:text-terminal-yellow font-medium">
              Claude not connected
            </span>
          </>
        )}
      </div>

      {/* Server List */}
      {mcp.servers.length > 0 ? (
        <div className="space-y-2">
          {mcp.servers.map((server, index) => (
            <div
              key={server.name || `server-${index}`}
              className="flex items-center justify-between text-sm py-2 px-3 bg-gray-50 dark:bg-terminal-elevated rounded"
            >
              <div className="flex items-center gap-2">
                {server.status === 'running' ? (
                  <Circle className="h-2 w-2 text-terminal-green fill-terminal-green" />
                ) : (
                  <Circle className="h-2 w-2 text-terminal-red fill-terminal-red" />
                )}
                <span className="text-gray-900 dark:text-terminal-text font-mono">{server.name}</span>
              </div>
              {server.tag && (
                <span className="text-xs text-gray-400 dark:text-terminal-text-muted">{server.tag}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-terminal-text-muted">No servers enabled</p>
      )}

      {/* Server Count */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-terminal-border flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-terminal-text-muted">
          {mcp.servers.length} server{mcp.servers.length !== 1 ? 's' : ''} enabled
        </span>
        <span className="text-terminal-green font-medium">
          {runningCount} running
        </span>
      </div>
    </div>
  );
}
