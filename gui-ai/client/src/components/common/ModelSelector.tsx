/**
 * ModelSelector Component
 *
 * Dropdown selector for choosing AI models in the chat interface.
 * Fetches available models from YoyoClaw gateway via WebSocket RPC.
 * Falls back to DEFAULT_MODELS if gateway is unavailable.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Cpu, Check } from 'lucide-react';
import { useGatewayQuery } from '../../hooks/useGatewayRPC';
import type { ModelsListResponse, Model as GatewayModel } from '../../lib/gateway-types';

export interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

interface ModelSelectorProps {
  models?: Model[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

// Fallback models when gateway is unavailable
export const DEFAULT_MODELS: Model[] = [
  { id: 'default', name: 'Default', provider: 'YoyoClaw', description: 'Default agent model' },
];

function mapGatewayModels(gatewayModels: GatewayModel[]): Model[] {
  return gatewayModels.map((m) => ({
    id: m.id,
    name: m.name || m.id,
    provider: m.provider || 'Unknown',
    description: m.contextWindow
      ? `${Math.round(m.contextWindow / 1000)}k context`
      : undefined,
  }));
}

export function ModelSelector({
  models: propModels,
  selectedModel,
  onSelectModel,
  disabled = false,
  compact = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-fetch from gateway if no models prop provided
  const { data: gatewayData } = useGatewayQuery<ModelsListResponse>(
    'models.list',
    undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !propModels, // Only fetch if no models provided via props
    },
  );

  // Resolve models: props > gateway > fallback
  const models: Model[] = propModels
    || (gatewayData?.models ? mapGatewayModels(gatewayData.models) : DEFAULT_MODELS);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    setIsOpen(false);
  };

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, Model[]>,
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 rounded transition-colors
          ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          hover:bg-gray-100 dark:hover:bg-gray-700
          text-gray-600 dark:text-gray-300
          hover:text-gray-800 dark:hover:text-white
          border border-transparent
          ${isOpen ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : ''}
        `}
        title={`Current model: ${currentModel?.name || 'Default'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Cpu className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        {!compact && (
          <span className="text-sm font-medium max-w-[120px] truncate">
            {currentModel?.name || 'Default'}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute bottom-full left-0 mb-2
            min-w-[220px] max-h-[320px] overflow-auto
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            z-50
          "
          role="listbox"
          aria-label="Select model"
        >
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">
              Select Model
            </div>

            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className="mb-2 last:mb-0">
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1">
                  {provider}
                </div>
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`
                      w-full flex items-center justify-between gap-2
                      px-2 py-2 rounded-md text-left
                      transition-colors
                      ${
                        selectedModel === model.id
                          ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                      }
                    `}
                    role="option"
                    aria-selected={selectedModel === model.id}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{model.name}</div>
                      {model.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {model.description}
                        </div>
                      )}
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-4 h-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
