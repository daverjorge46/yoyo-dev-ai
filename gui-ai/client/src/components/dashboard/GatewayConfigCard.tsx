import { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Pencil,
  Save,
  X,
  Key,
  Cpu,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useGatewayQuery } from '../../hooks/useGatewayRPC';
import type { StatusResponse, ModelsListResponse, Model } from '../../lib/gateway-types';

function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return `${token.slice(0, 4)}${'*'.repeat(Math.min(token.length - 8, 8))}${token.slice(-4)}`;
}

// --- Token Section ---

function TokenSection() {
  const [token, setToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gateway-token')
      .then((r) => r.json())
      .then((data) => {
        if (data.token) setToken(data.token);
        else setError('Token not configured');
      })
      .catch(() => setError('Failed to load token'))
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => {
    setEditValue(token || '');
    setEditing(true);
    setError(null);
    setSuccess(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditValue('');
    setError(null);
  };

  const handleSave = async () => {
    if (!editValue || editValue.length < 8) {
      setError('Token must be at least 8 characters');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/gateway-token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: editValue }),
      });
      const data = await res.json();

      if (data.success) {
        setToken(editValue);
        setEditing(false);
        setEditValue('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to update token');
      }
    } catch {
      setError('Failed to save token');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-terminal-text-muted" />
        <span className="text-sm text-terminal-text-muted">Loading token...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Key className="w-4 h-4 text-primary dark:text-terminal-orange" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-terminal-text">Gateway Token</h4>
        {success && (
          <span className="flex items-center gap-1 text-xs text-success dark:text-terminal-green">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm font-mono bg-gray-50 dark:bg-terminal-surface border border-gray-300 dark:border-terminal-border rounded-md text-gray-900 dark:text-terminal-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-terminal-orange"
            placeholder="Enter gateway token..."
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-terminal-elevated transition-colors text-success dark:text-terminal-green disabled:opacity-50"
            title="Save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-terminal-elevated transition-colors text-gray-500 dark:text-terminal-text-muted"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-1.5 text-sm font-mono bg-gray-50 dark:bg-terminal-surface border border-gray-200 dark:border-terminal-border rounded-md text-gray-700 dark:text-terminal-text-secondary select-all">
            {token ? (revealed ? token : maskToken(token)) : 'Not configured'}
          </code>
          {token && (
            <button
              onClick={() => setRevealed(!revealed)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-terminal-elevated transition-colors text-gray-500 dark:text-terminal-text-muted"
              title={revealed ? 'Hide token' : 'Reveal token'}
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-terminal-elevated transition-colors text-gray-500 dark:text-terminal-text-muted"
            title="Edit token"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-error">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// --- Model Configuration Section ---

function ModelConfigSection() {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: statusData, isLoading: statusLoading } = useGatewayQuery<StatusResponse>(
    'status',
    undefined,
    { staleTime: 10_000 },
  );

  const { data: modelsData, isLoading: modelsLoading } = useGatewayQuery<ModelsListResponse>(
    'models.list',
    undefined,
    { staleTime: 60_000 },
  );

  const activeModel = statusData?.agents?.defaults?.model?.primary || 'unknown';
  const fallbackModels = statusData?.agents?.defaults?.model?.fallback || [];
  const models = modelsData?.models || [];

  // Initialize selected model from active model
  useEffect(() => {
    if (activeModel && activeModel !== 'unknown' && !selectedModel) {
      setSelectedModel(activeModel);
    }
  }, [activeModel, selectedModel]);

  // Group models by provider
  const groupedModels = models.reduce<Record<string, Model[]>>((acc, model) => {
    const provider = model.provider || 'Other';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {});

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);

    try {
      if (saveAsDefault) {
        const res = await fetch('/api/gateway-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultModel: newModel }),
        });
        const data = await res.json();
        if (!data.success) {
          setSaveError(data.error || 'Failed to persist model');
          return;
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Failed to update model');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-primary dark:text-terminal-orange" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-terminal-text">Model Configuration</h4>
        {saveSuccess && (
          <span className="flex items-center gap-1 text-xs text-success dark:text-terminal-green">
            <Check className="w-3 h-3" /> Updated
          </span>
        )}
      </div>

      {/* Active Model */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 dark:text-terminal-text-muted">Active Model</span>
        <div className="mt-1 flex items-center gap-2">
          {statusLoading ? (
            <div className="h-6 w-40 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
          ) : (
            <>
              {activeModel.includes('/') && (
                <Badge variant="info">
                  {activeModel.split('/')[0]}
                </Badge>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-terminal-text">
                {activeModel.includes('/') ? activeModel.split('/')[1] : activeModel}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Model Selector */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 dark:text-terminal-text-muted">Default Model</span>
        <div className="mt-1">
          {modelsLoading ? (
            <div className="h-9 bg-gray-200 dark:bg-terminal-elevated rounded animate-pulse" />
          ) : (
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-terminal-surface border border-gray-300 dark:border-terminal-border rounded-md text-gray-900 dark:text-terminal-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-terminal-orange disabled:opacity-50"
            >
              {models.length === 0 && (
                <option value="">No models available</option>
              )}
              {Object.entries(groupedModels).map(([provider, providerModels]) => (
                <optgroup key={provider} label={provider}>
                  {providerModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id}
                      {model.contextWindow ? ` (${Math.round(model.contextWindow / 1000)}k ctx)` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Save as default checkbox */}
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAsDefault}
          onChange={(e) => setSaveAsDefault(e.target.checked)}
          className="rounded border-gray-300 dark:border-terminal-border text-primary dark:text-terminal-orange focus:ring-primary dark:focus:ring-terminal-orange"
        />
        <span className="text-xs text-gray-600 dark:text-terminal-text-secondary">
          Save as default (persist to config)
        </span>
      </label>

      {/* Fallback Models */}
      {fallbackModels.length > 0 && (
        <div>
          <span className="text-xs text-gray-500 dark:text-terminal-text-muted">Fallback Models</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {fallbackModels.map((fb) => (
              <Badge key={fb} variant="default">
                {fb}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-error">
          <AlertCircle className="w-3 h-3" />
          <span>{saveError}</span>
        </div>
      )}
    </div>
  );
}

// --- Main Card ---

export function GatewayConfigCard() {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-terminal-text mb-4">
        Gateway Configuration
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TokenSection />
        <ModelConfigSection />
      </div>
    </Card>
  );
}

export default GatewayConfigCard;
