import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  History,
  MessageSquare,
  Trash2,
  RefreshCw,
  User,
  Clock,
  Coins,
  ChevronRight,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

interface Session {
  id: string;
  channelId?: string;
  channelType?: string;
  userId?: string;
  userName?: string;
  model?: string;
  messageCount: number;
  tokenCount: number;
  createdAt: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function SessionCard({ session }: { session: Session }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/openclaw/sessions/${session.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const isActive = Date.now() - session.lastActivity < 300000; // Active in last 5 min

  return (
    <Card className="p-4 hover:bg-terminal-elevated/50 transition-colors group">
      <div className="flex items-start gap-4">
        {/* User avatar */}
        <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-500/10' : 'bg-terminal-elevated'}`}>
          <User className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-terminal-text-muted'}`} />
        </div>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-terminal-text truncate">
              {session.userName || session.userId || `Session ${session.id.slice(0, 8)}`}
            </h3>
            {isActive && (
              <Badge variant="success">Active</Badge>
            )}
            {session.channelType && (
              <Badge variant="default">{session.channelType}</Badge>
            )}
          </div>

          {session.model && (
            <p className="text-xs text-terminal-text-secondary mb-2">
              Model: {session.model}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-terminal-text-muted">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {session.messageCount} messages
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {formatTokens(session.tokenCount)} tokens
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(session.lastActivity)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 className="w-4 h-4" />}
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          />
          <ChevronRight className="w-4 h-4 text-terminal-text-muted" />
        </div>
      </div>
    </Card>
  );
}

export default function Sessions() {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await fetch('/api/openclaw/sessions');
      if (!res.ok) {
        if (res.status === 503) return [];
        throw new Error('Failed to fetch sessions');
      }
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: openclawStatus } = useQuery({
    queryKey: ['openclaw-status'],
    queryFn: async () => {
      const res = await fetch('/api/status/openclaw');
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/openclaw/sessions', {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear sessions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const activeSessions = sessions?.filter(s => Date.now() - s.lastActivity < 300000).length ?? 0;
  const totalTokens = sessions?.reduce((sum, s) => sum + s.tokenCount, 0) ?? 0;

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
              <span className="text-terminal-text-muted"> tokens used</span>
            </div>
            <Button
              icon={<Archive className="w-4 h-4" />}
              variant="secondary"
              loading={clearAllMutation.isPending}
              onClick={() => {
                if (confirm('Clear all sessions?')) {
                  clearAllMutation.mutate();
                }
              }}
            >
              Clear All
            </Button>
            <Button icon={<RefreshCw className="w-4 h-4" />} variant="secondary">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* OpenClaw status warning */}
      {!openclawStatus?.connected && (
        <Card className="p-4 mb-6 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium text-terminal-text">OpenClaw not connected</h3>
              <p className="text-sm text-terminal-text-secondary">
                Start OpenClaw daemon to view sessions: <code className="text-cyan-400">yoyo-ai start</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Sessions list */}
      {sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions
            .sort((a, b) => b.lastActivity - a.lastActivity)
            .map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-terminal-text-muted mb-4">
            <History className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            No active sessions
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {openclawStatus?.connected
              ? 'Sessions will appear here when users start conversations.'
              : 'Start OpenClaw daemon to view sessions.'}
          </p>
        </Card>
      )}
    </div>
  );
}
