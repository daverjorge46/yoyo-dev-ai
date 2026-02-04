/**
 * ModelSelector Component
 *
 * Dropdown selector for choosing AI models in the chat interface.
 * Positioned next to the attachment button in the chat input area.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Cpu, Check } from 'lucide-react';

export interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  disabled = false,
  compact = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    {} as Record<string, Model[]>
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
          hover:bg-terminal-elevated
          text-terminal-text-secondary
          hover:text-terminal-text
          border border-transparent
          ${isOpen ? 'bg-terminal-elevated border-terminal-border' : ''}
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
            bg-terminal-bg
            border border-terminal-border
            rounded-lg shadow-lg
            z-[100]
          "
          role="listbox"
          aria-label="Select model"
        >
          <div className="p-2">
            <div className="text-xs font-medium text-terminal-text-muted px-2 py-1 mb-1">
              Select Model
            </div>

            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className="mb-2 last:mb-0">
                <div className="text-xs font-semibold text-terminal-text-muted uppercase px-2 py-1">
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
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'hover:bg-terminal-elevated text-terminal-text'
                      }
                    `}
                    role="option"
                    aria-selected={selectedModel === model.id}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{model.name}</div>
                      {model.description && (
                        <div className="text-xs text-terminal-text-muted truncate">
                          {model.description}
                        </div>
                      )}
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-4 h-4 flex-shrink-0 text-primary-500" />
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

// Default models available
export const DEFAULT_MODELS: Model[] = [
  // OpenClaw / Local
  { id: 'default', name: 'Default', provider: 'OpenClaw', description: 'Default agent model' },
  // Anthropic Claude
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Latest balanced model' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Fast and capable' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Most powerful' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Fastest responses' },
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Latest multimodal' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Fast GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Quick and efficient' },
  // Google
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Experimental fast' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Advanced reasoning' },
  // Moonshot
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'Moonshot', description: 'Multilingual model' },
];

export default ModelSelector;
