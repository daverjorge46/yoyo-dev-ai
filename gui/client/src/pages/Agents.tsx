/**
 * Agents Page
 *
 * Displays agent management with grid view, CRUD operations,
 * and orchestration system visualization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Plus, Upload, Bot, Crown, RefreshCw } from 'lucide-react';
import type { Agent, AgentSummary, AgentStats as AgentStatsType, AgentFormState } from '../../../shared/types/agent';
import { AgentCard, AgentCardSkeleton } from '../components/agents/AgentCard';
import { AgentFormEditor } from '../components/agents/AgentFormEditor';
import { AgentDetailView } from '../components/agents/AgentDetailView';
import { AgentStats, AgentStatsSkeleton } from '../components/agents/AgentStats';
import { AgentImportModal } from '../components/agents/AgentImportModal';
import { OrchestrationVisualization } from '../components/agents/OrchestrationVisualization';
import { SearchInput } from '../components/common/SearchInput';

// =============================================================================
// API Functions
// =============================================================================

async function fetchAgents(): Promise<{ agents: AgentSummary[]; stats: AgentStatsType }> {
  const res = await fetch('/api/agent-definitions');
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

async function fetchAgentDetail(id: string): Promise<Agent> {
  const res = await fetch(`/api/agent-definitions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch agent');
  return res.json();
}

async function createAgent(data: AgentFormState): Promise<Agent> {
  const res = await fetch('/api/agent-definitions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create agent');
  }
  return res.json();
}

async function updateAgent(id: string, data: AgentFormState): Promise<Agent> {
  const res = await fetch(`/api/agent-definitions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update agent');
  }
  return res.json();
}

async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`/api/agent-definitions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete agent');
  }
}

async function duplicateAgent(id: string): Promise<Agent> {
  const res = await fetch(`/api/agent-definitions/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to duplicate agent');
  }
  return res.json();
}

async function importAgent(content: string, filename: string): Promise<Agent> {
  const res = await fetch('/api/agent-definitions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to import agent');
  }
  return res.json();
}

// =============================================================================
// View Modes
// =============================================================================

type ViewMode = 'grid' | 'detail' | 'create' | 'edit';

// =============================================================================
// Agents Page Component
// =============================================================================

export default function Agents() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'Primary' | 'Subagent'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['agent-definitions'],
    queryFn: fetchAgents,
  });

  const { data: selectedAgent, isLoading: detailLoading } = useQuery({
    queryKey: ['agent-definition', selectedAgentId],
    queryFn: () => fetchAgentDetail(selectedAgentId!),
    enabled: !!selectedAgentId && viewMode === 'detail',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      showNotification('success', `Agent "${agent.name}" created successfully`);
      setViewMode('grid');
    },
    onError: (error: Error) => {
      showNotification('error', error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgentFormState }) => updateAgent(id, data),
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['agent-definition', agent.id] });
      showNotification('success', `Agent "${agent.name}" updated successfully`);
      setViewMode('detail');
      setEditingAgent(null);
    },
    onError: (error: Error) => {
      showNotification('error', error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      showNotification('success', 'Agent deleted successfully');
      setViewMode('grid');
      setSelectedAgentId(null);
    },
    onError: (error: Error) => {
      showNotification('error', error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateAgent,
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      showNotification('success', `Agent duplicated as "${agent.name}"`);
      setSelectedAgentId(agent.id);
      setViewMode('detail');
    },
    onError: (error: Error) => {
      showNotification('error', error.message);
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ content, filename }: { content: string; filename: string }) => importAgent(content, filename),
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] });
      showNotification('success', `Agent "${agent.name}" imported successfully`);
      setShowImportModal(false);
      setSelectedAgentId(agent.id);
      setViewMode('detail');
    },
    onError: (error: Error) => {
      throw error; // Let the modal handle the error
    },
  });

  // Helpers
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter agents
  const filteredAgents = useMemo(() => {
    if (!agentsData?.agents) return [];

    return agentsData.agents.filter((agent) => {
      const matchesSearch =
        searchQuery === '' ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMode = modeFilter === 'all' || agent.mode === modeFilter;

      return matchesSearch && matchesMode;
    });
  }, [agentsData, searchQuery, modeFilter]);

  // Handlers
  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    setViewMode('detail');
  };

  const handleCreateNew = () => {
    setEditingAgent(null);
    setViewMode('create');
  };

  const handleEditAgent = () => {
    if (selectedAgent) {
      setEditingAgent(selectedAgent);
      setViewMode('edit');
    }
  };

  const handleDuplicateAgent = () => {
    if (selectedAgentId) {
      duplicateMutation.mutate(selectedAgentId);
    }
  };

  const handleDeleteAgent = () => {
    if (selectedAgentId) {
      deleteMutation.mutate(selectedAgentId);
    }
  };

  const handleFormSubmit = (data: AgentFormState) => {
    if (viewMode === 'edit' && editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFormCancel = () => {
    if (viewMode === 'edit' && selectedAgentId) {
      setViewMode('detail');
    } else {
      setViewMode('grid');
    }
    setEditingAgent(null);
  };

  const handleImport = async (content: string, filename: string) => {
    await importMutation.mutateAsync({ content, filename });
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setSelectedAgentId(null);
  };

  // Render form editor
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="h-full">
        <AgentFormEditor
          agent={editingAgent}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    );
  }

  // Render detail view
  if (viewMode === 'detail' && selectedAgentId) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 text-terminal-orange animate-spin" />
        </div>
      );
    }

    if (!selectedAgent) {
      return (
        <div className="text-center text-gray-500 py-8">
          Agent not found
        </div>
      );
    }

    return (
      <div className="h-full">
        <AgentDetailView
          agent={selectedAgent}
          onEdit={handleEditAgent}
          onDuplicate={handleDuplicateAgent}
          onDelete={handleDeleteAgent}
          onBack={handleBackToGrid}
        />
      </div>
    );
  }

  // Render grid view (default)
  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agents
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Multi-agent orchestration system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-terminal-bg-tertiary text-gray-300 hover:text-white hover:bg-terminal-bg-quaternary transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-orange text-black font-medium hover:bg-terminal-orange/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Agent</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {agentsError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          Failed to load agents. Please try again.
        </div>
      )}

      {/* Stats */}
      {agentsLoading ? (
        <AgentStatsSkeleton />
      ) : agentsData?.stats ? (
        <AgentStats stats={agentsData.stats} />
      ) : null}

      {/* Orchestration Visualization */}
      <OrchestrationVisualization defaultOpen={false} />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search agents..."
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModeFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              modeFilter === 'all'
                ? 'bg-terminal-orange text-black font-medium'
                : 'bg-terminal-bg-tertiary text-gray-300 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setModeFilter('Primary')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              modeFilter === 'Primary'
                ? 'bg-terminal-orange text-black font-medium'
                : 'bg-terminal-bg-tertiary text-gray-300 hover:text-white'
            }`}
          >
            <Crown className="h-4 w-4" />
            Primary
          </button>
          <button
            onClick={() => setModeFilter('Subagent')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              modeFilter === 'Subagent'
                ? 'bg-terminal-orange text-black font-medium'
                : 'bg-terminal-bg-tertiary text-gray-300 hover:text-white'
            }`}
          >
            <Bot className="h-4 w-4" />
            Subagent
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      {agentsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="terminal-card p-8 text-center">
          <div className="text-gray-400 dark:text-terminal-text-muted mb-4">
            <Bot className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-terminal-text mb-2">
            {searchQuery || modeFilter !== 'all' ? 'No Matching Agents' : 'No Agents Yet'}
          </h3>
          <p className="text-gray-500 dark:text-terminal-text-secondary mb-4">
            {searchQuery || modeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Create your first agent to get started.'}
          </p>
          {!searchQuery && modeFilter === 'all' && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-orange text-black font-medium hover:bg-terminal-orange/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Agent
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={() => handleSelectAgent(agent.id)}
              selected={selectedAgentId === agent.id}
            />
          ))}
        </div>
      )}

      {/* Import Modal */}
      <AgentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
}
