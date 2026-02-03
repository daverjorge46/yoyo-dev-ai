import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug,
  Mail,
  Calendar,
  FolderOpen,
  MessageSquare,
  CheckSquare,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Clock,
  Activity,
  X,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoader } from '../components/common/LoadingSpinner';
import type { Connection } from '../types';

const TYPE_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  calendar: Calendar,
  storage: FolderOpen,
  messaging: MessageSquare,
  tasks: CheckSquare,
  other: Link2,
};

const TYPE_COLORS: Record<string, string> = {
  email: 'text-info-light',
  calendar: 'text-accent-400',
  storage: 'text-primary-400',
  messaging: 'text-success-light',
  tasks: 'text-warning-light',
  other: 'text-terminal-text-secondary',
};

const AVAILABLE_CONNECTIONS = [
  { type: 'email', provider: 'gmail', name: 'Gmail', description: 'Read and send emails' },
  { type: 'email', provider: 'outlook', name: 'Outlook', description: 'Microsoft email service' },
  { type: 'storage', provider: 'gdrive', name: 'Google Drive', description: 'Cloud file storage' },
  { type: 'storage', provider: 'dropbox', name: 'Dropbox', description: 'File sync and share' },
  { type: 'calendar', provider: 'gcalendar', name: 'Google Calendar', description: 'Schedule and events' },
  { type: 'messaging', provider: 'slack', name: 'Slack', description: 'Team messaging' },
  { type: 'tasks', provider: 'todoist', name: 'Todoist', description: 'Task management' },
];

// Connection card
function ConnectionCard({
  connection,
  onRefresh,
  onDisconnect,
  onViewActivity,
}: {
  connection: Connection;
  onRefresh: () => void;
  onDisconnect: () => void;
  onViewActivity: () => void;
}) {
  const Icon = TYPE_ICONS[connection.type] || Link2;
  const color = TYPE_COLORS[connection.type] || 'text-terminal-text-secondary';

  return (
    <Card
      variant={connection.connected ? 'accent' : 'default'}
      className={`p-4 ${connection.connected ? 'border-l-success' : 'border-l-terminal-text-muted'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md bg-terminal-elevated ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-terminal-text">{connection.name}</h4>
            {connection.account && (
              <p className="text-xs text-terminal-text-secondary">{connection.account}</p>
            )}
          </div>
        </div>
        <Badge variant={connection.connected ? 'success' : 'muted'}>
          {connection.connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      {/* Permissions */}
      {connection.permissions.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-terminal-text-muted mb-1">Permissions:</p>
          <div className="flex flex-wrap gap-1">
            {connection.permissions.map((perm) => (
              <span
                key={perm}
                className="text-xs px-1.5 py-0.5 bg-terminal-elevated rounded text-terminal-text-secondary"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {connection.stats && (
        <div className="flex items-center gap-4 mb-3 text-xs text-terminal-text-muted">
          {connection.stats.itemsProcessed !== undefined && (
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {connection.stats.itemsProcessed} processed
            </span>
          )}
          {connection.stats.actionsToday !== undefined && (
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {connection.stats.actionsToday} actions today
            </span>
          )}
        </div>
      )}

      {/* Last sync */}
      {connection.lastSync && (
        <p className="text-xs text-terminal-text-muted mb-3 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last sync: {new Date(connection.lastSync).toLocaleString()}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-terminal-border">
        {connection.connected && (
          <>
            <Button size="sm" variant="ghost" onClick={onRefresh}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            <Button size="sm" variant="ghost" onClick={onViewActivity}>
              <Activity className="w-3 h-3" /> Activity
            </Button>
          </>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onDisconnect}>
          <Trash2 className="w-3 h-3" /> {connection.connected ? 'Disconnect' : 'Remove'}
        </Button>
      </div>
    </Card>
  );
}

// Add connection modal
function AddConnectionModal({
  onClose,
  onAdd,
  existingProviders,
}: {
  onClose: () => void;
  onAdd: (provider: string) => void;
  existingProviders: string[];
}) {
  const availableToAdd = AVAILABLE_CONNECTIONS.filter(
    (c) => !existingProviders.includes(c.provider)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-terminal-border">
            <h3 className="font-semibold text-terminal-text">Add Connection</h3>
            <button onClick={onClose} className="p-1 hover:bg-terminal-elevated rounded">
              <X className="w-5 h-5 text-terminal-text-muted" />
            </button>
          </div>

          <div className="p-4 max-h-[400px] overflow-auto">
            {availableToAdd.length === 0 ? (
              <p className="text-sm text-terminal-text-secondary text-center py-4">
                All available connections have been added.
              </p>
            ) : (
              <div className="space-y-2">
                {availableToAdd.map((conn) => {
                  const Icon = TYPE_ICONS[conn.type] || Link2;
                  const color = TYPE_COLORS[conn.type] || 'text-terminal-text-secondary';

                  return (
                    <button
                      key={conn.provider}
                      className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-terminal-elevated transition-colors text-left"
                      onClick={() => onAdd(conn.provider)}
                    >
                      <div className={`p-2 rounded-md bg-terminal-elevated ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-terminal-text">{conn.name}</p>
                        <p className="text-xs text-terminal-text-secondary">{conn.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-terminal-text-muted" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default function Connections() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch connections
  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await fetch('/api/connections');
      if (!res.ok) throw new Error('Failed to fetch connections');
      const data = await res.json();
      return data.connections || [];
    },
  });

  // Refresh connection mutation
  const refreshConnection = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/connections/${id}/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh connection');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  // Disconnect mutation
  const disconnectConnection = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  // Add connection (would trigger OAuth flow)
  const addConnection = useMutation({
    mutationFn: async (provider: string) => {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error('Failed to add connection');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setShowAddModal(false);
    },
  });

  const connectedCount = connections.filter((c) => c.connected).length;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Connections</h1>
          <p className="text-xs text-terminal-text-secondary mt-0.5">
            {connectedCount} of {connections.length} services connected
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          Add Connection
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {connections.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No connections yet"
            description="Connect your services to enable YoYo AI to help you manage them."
            action={{ label: 'Add Connection', onClick: () => setShowAddModal(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                connection={conn}
                onRefresh={() => refreshConnection.mutate(conn.id)}
                onDisconnect={() => disconnectConnection.mutate(conn.id)}
                onViewActivity={() => {
                  // Could open a detail panel or navigate
                  console.log('View activity for', conn.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add connection modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddConnectionModal
            onClose={() => setShowAddModal(false)}
            onAdd={(provider) => addConnection.mutate(provider)}
            existingProviders={connections.map((c) => c.provider)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
