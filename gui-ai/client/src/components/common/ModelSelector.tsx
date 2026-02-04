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

      {/* Dropdown menu - Full screen modal on mobile */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[199] sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="
              fixed inset-x-0 bottom-0 top-auto
              sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:mb-2
              sm:min-w-[320px] sm:max-h-[400px]
              max-h-[70vh]
              overflow-hidden
              bg-white dark:bg-gray-900
              border-t sm:border border-gray-200 dark:border-gray-700
              rounded-t-2xl sm:rounded-xl
              shadow-2xl
              z-[200]
            "
            role="listbox"
            aria-label="Select model"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Select AI Model
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-auto max-h-[calc(70vh-80px)] sm:max-h-[320px] p-4">
              {Object.entries(groupedModels).map(([provider, providerModels]) => (
                <div key={provider} className="mb-6 last:mb-0">
                  <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    {provider}
                  </div>
                  <div className="space-y-2">
                    {providerModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className={`
                          w-full flex items-center justify-between gap-4
                          px-4 py-4 rounded-xl text-left
                          transition-all
                          ${
                            selectedModel === model.id
                              ? 'bg-primary-500 text-white shadow-lg'
                              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                          }
                        `}
                        role="option"
                        aria-selected={selectedModel === model.id}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-semibold">{model.name}</div>
                          {model.description && (
                            <div className={`text-sm mt-1 ${
                              selectedModel === model.id
                                ? 'text-white/80'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {model.description}
                            </div>
                          )}
                        </div>
                        {selectedModel === model.id && (
                          <Check className="w-6 h-6 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
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
