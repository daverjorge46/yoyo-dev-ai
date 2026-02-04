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
          flex items-center gap-1.5 rounded-md transition-colors
          ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          bg-primary-500/10 hover:bg-primary-500/20
          text-primary-500
          border border-primary-500/30
          ${isOpen ? 'bg-primary-500/20 border-primary-500/50' : ''}
        `}
        title={`Model: ${currentModel?.name || 'Default'} (click to change)`}
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
            fixed inset-x-4 bottom-20
            sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:mb-2
            min-w-[280px] max-h-[60vh] sm:max-h-[400px] overflow-auto
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-2xl
            z-[200]
          "
          role="listbox"
          aria-label="Select model"
        >
          <div className="p-3">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-2 py-2 mb-2 border-b border-gray-200 dark:border-gray-700">
              Select AI Model
            </div>

            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className="mb-3 last:mb-0">
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2 py-2">
                  {provider}
                </div>
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`
                      w-full flex items-center justify-between gap-3
                      px-3 py-3 rounded-lg text-left
                      transition-colors
                      ${
                        selectedModel === model.id
                          ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }
                    `}
                    role="option"
                    aria-selected={selectedModel === model.id}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium">{model.name}</div>
                      {model.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {model.description}
                        </div>
                      )}
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-5 h-5 flex-shrink-0 text-primary-500" />
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
