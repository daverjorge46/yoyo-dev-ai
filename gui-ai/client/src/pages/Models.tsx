import { useState } from 'react';
import {
  Cpu,
  Search,
  Eye,
  Wrench,
  Zap,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type { ModelsListResponse, Model } from '../lib/gateway-types';

function formatContextWindow(tokens?: number): string {
  if (!tokens) return '';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return tokens.toString();
}

function ModelCard({ model }: { model: Model }) {
  return (
    <Card variant="hover" className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary-500/10">
          <Cpu className="w-5 h-5 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-terminal-text truncate">
              {model.name || model.id}
            </h3>
            {model.contextWindow && (
              <Badge variant="muted">{formatContextWindow(model.contextWindow)} ctx</Badge>
            )}
          </div>

          <p className="text-xs font-mono text-terminal-text-muted mb-2">{model.id}</p>

          {/* Capabilities */}
          {model.capabilities && (
            <div className="flex items-center gap-2">
              {model.capabilities.vision && (
                <Badge variant="info">
                  <Eye className="w-3 h-3" />
                  Vision
                </Badge>
              )}
              {model.capabilities.tools && (
                <Badge variant="accent">
                  <Wrench className="w-3 h-3" />
                  Tools
                </Badge>
              )}
              {model.capabilities.streaming && (
                <Badge variant="success">
                  <Zap className="w-3 h-3" />
                  Streaming
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Models() {
  const [search, setSearch] = useState('');
  const { isConnected } = useGatewayStatus();

  const {
    data: modelsData,
    isLoading,
    refetch,
  } = useGatewayQuery<ModelsListResponse>('models.list', undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const allModels = modelsData?.models || [];

  // Filter by search
  const filtered = search
    ? allModels.filter(
        (m) =>
          m.id.toLowerCase().includes(search.toLowerCase()) ||
          (m.name && m.name.toLowerCase().includes(search.toLowerCase())) ||
          (m.provider && m.provider.toLowerCase().includes(search.toLowerCase())),
      )
    : allModels;

  // Group by provider
  const grouped = filtered.reduce(
    (acc, model) => {
      const provider = model.provider || 'Other';
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<string, Model[]>,
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
              <Cpu className="w-7 h-7 text-primary-400" />
              Models
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              Available LLM models from the gateway
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="primary">{allModels.length} models</Badge>
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
                Connect to the OpenClaw gateway to view models.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      {allModels.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
            <input
              type="text"
              placeholder="Search models by name, ID, or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-terminal-elevated border border-terminal-border rounded-lg text-sm text-terminal-text placeholder-terminal-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Models grouped by provider */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([provider, models]) => (
              <div key={provider}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-terminal-text-secondary uppercase tracking-wider">
                    {provider}
                  </h2>
                  <Badge variant="muted">{models.length}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {models.map((model) => (
                    <ModelCard key={model.id} model={model} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Cpu className="w-16 h-16 mx-auto text-terminal-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            {search ? 'No models match your search' : 'No models available'}
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {search
              ? 'Try a different search term.'
              : isConnected
                ? 'No models configured in the gateway.'
                : 'Connect to the gateway to view models.'}
          </p>
        </Card>
      )}
    </div>
  );
}
