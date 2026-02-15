import { useState } from 'react';
import {
  History,
  MessageSquare,
  Trash2,
  RefreshCw,
  Clock,
  Coins,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Minimize2,
  User,
  Sparkles,
  X,
  Bot,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery, useGatewayMutation, useGatewayRequest } from '../hooks/useGatewayRPC';
import { useGatewayTick } from '../hooks/useGatewayEvent';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type { SessionsListResponse, SessionPreviewResponse, Session } from '../lib/gateway-types';

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTokens(tokens?: number): string {
  if (tokens == null) return '0';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

// Session detail preview panel
function SessionPreview({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const request = useGatewayRequest();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }> | null>(null);
  const [loading, setLoading] = useState(true);

  // Load preview on mount
  useState(() => {
    request<SessionPreviewResponse>('sessions.preview', { sessionKey: session.key })
      .then((res) => {
        setMessages(res?.messages || []);
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => setLoading(false));
  });

  return (
    <Card className="mt-2 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-terminal-elevated border-b border-terminal-border">
        <span className="text-xs font-medium text-terminal-text-secondary">
          Message Preview - {session.key}
        </span>
        <button onClick={onClose} className="p-0.5 hover:bg-terminal-surface rounded">
          <X className="w-3.5 h-3.5 text-terminal-text-muted" />
        </button>
      </div>

      <div className="max-h-80 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="divide-y divide-terminal-border/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-terminal-elevated/30' : ''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === 'user' ? 'bg-primary-500/20' : 'bg-accent-500/20'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="w-3 h-3 text-primary-400" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-accent-400" />
                  )}
                </div>
                <p className="text-terminal-text-secondary text-xs leading-relaxed line-clamp-4">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-terminal-text-muted">
            No messages in this session
          </div>
        )}
      </div>
    </Card>
  );
}

function SessionCard({
  session,
  isExpanded,
  onToggleExpand,
  onDeleted,
}: {
  session: Session;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDeleted: () => void;
}) {
  const isActive = session.lastActivity
    ? Date.now() - new Date(session.lastActivity).getTime() < 300_000
    : false;

  const deleteMutation = useGatewayMutation<{ sessionKey: string }, unknown>(
    'sessions.delete',
    {
      onSuccess: onDeleted,
      invalidateQueries: ['sessions.list'],
    },
  );

  const resetMutation = useGatewayMutation<{ sessionKey: string }, unknown>(
    'sessions.reset',
    { invalidateQueries: ['sessions.list'] },
  );

  const compactMutation = useGatewayMutation<{ sessionKey: string }, unknown>(
    'sessions.compact',
    { invalidateQueries: ['sessions.list'] },
  );

  return (
    <div>
      <Card className="p-4 hover:bg-terminal-elevated/50 transition-colors group">
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-500/10' : 'bg-terminal-elevated'}`}>
            <MessageSquare className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-terminal-text-muted'}`} />
          </div>

          {/* Session info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-terminal-text truncate font-mono text-sm">
                {session.label || session.key}
              </h3>
              {isActive && <Badge variant="success">Active</Badge>}
              {session.model && <Badge variant="default">{session.model}</Badge>}
            </div>

            {session.agentId && (
              <div className="flex items-center gap-1 text-xs text-terminal-text-secondary mb-1.5">
                <Bot className="w-3 h-3" />
                <span>{session.agentId}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-terminal-text-muted">
              {session.messageCount != null && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {session.messageCount} msgs
                </span>
              )}
              {session.tokenUsage?.total != null && (
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {formatTokens(session.tokenUsage.total)} tokens
                </span>
              )}
              {session.lastActivity && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(session.lastActivity)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              title="Compact session"
              icon={<Minimize2 className="w-3.5 h-3.5" />}
              loading={compactMutation.isPending}
              onClick={() => compactMutation.mutate({ sessionKey: session.key })}
            />
            <Button
              size="sm"
              variant="ghost"
              title="Reset session"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              loading={resetMutation.isPending}
              onClick={() => resetMutation.mutate({ sessionKey: session.key })}
            />
            <Button
              size="sm"
              variant="ghost"
              title="Delete session"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              loading={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Delete session "${session.key}"?`)) {
                  deleteMutation.mutate({ sessionKey: session.key });
                }
              }}
            />
            <button
              onClick={onToggleExpand}
              className="p-1.5 hover:bg-terminal-elevated rounded transition-colors"
            >
              <ChevronRight className={`w-4 h-4 text-terminal-text-muted transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Expanded preview */}
      {isExpanded && (
        <SessionPreview session={session} onClose={onToggleExpand} />
      )}
    </div>
  );
}

export default function Sessions() {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const { isConnected } = useGatewayStatus();

  const {
    data: sessionsData,
    isLoading,
    refetch,
  } = useGatewayQuery<SessionsListResponse>(
    'sessions.list',
    { limit: 50, includeGlobal: true },
    { staleTime: 15_000 },
  );

  // Auto-refresh on tick
  useGatewayTick(() => {
    refetch();
  });

  const sessions = sessionsData?.sessions || [];
  const activeSessions = sessions.filter(
    (s) => s.lastActivity && Date.now() - new Date(s.lastActivity).getTime() < 300_000,
  ).length;
  const totalTokens = sessions.reduce(
    (sum, s) => sum + (s.tokenUsage?.total ?? 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-terminal-text flex items-center gap-3">
              <History className="w-7 h-7 text-cyan-400" />
              Sessions
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              View and manage conversation sessions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-terminal-text-secondary">
              <span className="text-emerald-400 font-medium">{activeSessions}</span>
              <span className="text-terminal-text-muted"> active</span>
              <span className="mx-2 text-terminal-border">|</span>
              <span className="text-cyan-400 font-medium">{formatTokens(totalTokens)}</span>
              <span className="text-terminal-text-muted"> tokens</span>
            </div>
            <Button
              icon={<RefreshCw className="w-4 h-4" />}
              variant="secondary"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Gateway disconnected warning */}
      {!isConnected && (
        <Card className="p-4 mb-6 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium text-terminal-text">Gateway disconnected</h3>
              <p className="text-sm text-terminal-text-secondary">
                Connect to the YoyoClaw gateway to view sessions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Sessions list */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions
            .sort((a, b) => {
              const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
              const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
              return bTime - aTime;
            })
            .map((session) => (
              <SessionCard
                key={session.key}
                session={session}
                isExpanded={expandedKey === session.key}
                onToggleExpand={() =>
                  setExpandedKey(expandedKey === session.key ? null : session.key)
                }
                onDeleted={() => {
                  if (expandedKey === session.key) setExpandedKey(null);
                }}
              />
            ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <History className="w-16 h-16 mx-auto text-terminal-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No active sessions
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {isConnected
              ? 'Sessions will appear here when conversations start.'
              : 'Connect to the gateway to view sessions.'}
          </p>
        </Card>
      )}
    </div>
  );
}
