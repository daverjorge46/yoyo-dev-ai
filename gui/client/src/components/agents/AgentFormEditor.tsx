/**
 * AgentFormEditor Component
 *
 * Form-based editor for creating and editing agents.
 */

import { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import type { Agent, AgentFormState, AgentFormErrors, AGENT_MODELS, DEFAULT_AGENT_VALUES } from '../../../../shared/types/agent';
import { MarkdownPreview } from '../MarkdownPreview';

interface AgentFormEditorProps {
  /** Agent to edit (null for new agent) */
  agent?: Agent | null;
  /** Submit handler */
  onSubmit: (data: AgentFormState) => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Additional className */
  className?: string;
}

const MODEL_OPTIONS = [
  { value: 'claude-opus-4-5-20250514', label: 'Claude Opus 4.5' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export function AgentFormEditor({
  agent,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = '',
}: AgentFormEditorProps) {
  const isEditing = !!agent;

  const [formState, setFormState] = useState<AgentFormState>(() => {
    if (agent) {
      return {
        name: agent.name,
        description: agent.description,
        model: agent.model,
        temperature: agent.temperature,
        mode: agent.mode,
        content: agent.content,
        outputPrefix: agent.outputPrefix || '',
        fallbackModel: agent.fallbackModel || '',
      };
    }
    return {
      name: '',
      description: '',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      mode: 'Subagent',
      content: `## Identity

You are a specialized agent for...

---

## Core Responsibilities

1.
2.
3.

---

## Tool Access

- Read - Read files
- Write - Write files
- Bash - Execute commands`,
      outputPrefix: '',
      fallbackModel: '',
    };
  });

  const [errors, setErrors] = useState<AgentFormErrors>({});
  const [showPreview, setShowPreview] = useState(false);

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      setFormState({
        name: agent.name,
        description: agent.description,
        model: agent.model,
        temperature: agent.temperature,
        mode: agent.mode,
        content: agent.content,
        outputPrefix: agent.outputPrefix || '',
        fallbackModel: agent.fallbackModel || '',
      });
    }
  }, [agent]);

  const validate = (): boolean => {
    const newErrors: AgentFormErrors = {};

    if (!formState.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z0-9\s-]+$/.test(formState.name)) {
      newErrors.name = 'Name can only contain letters, numbers, spaces, and hyphens';
    }

    if (!formState.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formState.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formState.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    if (formState.temperature < 0 || formState.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    if (!formState.content.trim()) {
      newErrors.content = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formState);
    }
  };

  const updateField = <K extends keyof AgentFormState>(
    field: K,
    value: AgentFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field as keyof AgentFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-terminal-border">
        <h2 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit Agent' : 'Create New Agent'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-terminal-bg-tertiary text-gray-400 hover:text-white transition-colors"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="text-sm">{showPreview ? 'Hide Preview' : 'Preview'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded hover:bg-terminal-bg-tertiary text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={`w-full px-3 py-2 bg-terminal-bg-secondary border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terminal-orange ${
              errors.name ? 'border-red-500' : 'border-terminal-border'
            }`}
            placeholder="e.g., Research Agent"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formState.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
            className={`w-full px-3 py-2 bg-terminal-bg-secondary border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terminal-orange resize-none ${
              errors.description ? 'border-red-500' : 'border-terminal-border'
            }`}
            placeholder="Brief description of the agent's role and capabilities"
          />
          <div className="flex justify-between mt-1">
            {errors.description ? (
              <p className="text-sm text-red-400">{errors.description}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-500">
              {formState.description.length}/200
            </span>
          </div>
        </div>

        {/* Model & Temperature Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Model
            </label>
            <select
              value={formState.model}
              onChange={(e) => updateField('model', e.target.value)}
              className="w-full px-3 py-2 bg-terminal-bg-secondary border border-terminal-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-terminal-orange"
            >
              {MODEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Temperature: {formState.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formState.temperature}
              onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-terminal-bg-tertiary rounded-lg appearance-none cursor-pointer accent-terminal-orange"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Precise (0)</span>
              <span>Creative (2)</span>
            </div>
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Mode
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="Primary"
                checked={formState.mode === 'Primary'}
                onChange={(e) => updateField('mode', e.target.value as 'Primary' | 'Subagent')}
                className="accent-terminal-orange"
              />
              <span className="text-gray-300">Primary</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="Subagent"
                checked={formState.mode === 'Subagent'}
                onChange={(e) => updateField('mode', e.target.value as 'Primary' | 'Subagent')}
                className="accent-terminal-orange"
              />
              <span className="text-gray-300">Subagent</span>
            </label>
          </div>
        </div>

        {/* Output Prefix */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Output Prefix
          </label>
          <input
            type="text"
            value={formState.outputPrefix}
            onChange={(e) => updateField('outputPrefix', e.target.value)}
            className="w-full px-3 py-2 bg-terminal-bg-secondary border border-terminal-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terminal-orange"
            placeholder="e.g., [agent-name]"
          />
          <p className="mt-1 text-xs text-gray-500">
            Prefix for console output visibility (e.g., [yoyo-ai])
          </p>
        </div>

        {/* Content */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Agent Instructions <span className="text-red-400">*</span>
          </label>
          {showPreview ? (
            <div className="border border-terminal-border rounded-lg p-4 bg-terminal-bg-secondary min-h-[300px] overflow-auto">
              <MarkdownPreview content={formState.content} />
            </div>
          ) : (
            <textarea
              value={formState.content}
              onChange={(e) => updateField('content', e.target.value)}
              rows={15}
              className={`w-full px-3 py-2 bg-terminal-bg-secondary border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terminal-orange font-mono text-sm ${
                errors.content ? 'border-red-500' : 'border-terminal-border'
              }`}
              placeholder="## Identity\n\nYou are..."
            />
          )}
          {errors.content && (
            <p className="mt-1 text-sm text-red-400">{errors.content}</p>
          )}
        </div>
      </form>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-4 border-t border-terminal-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-terminal-bg-tertiary text-gray-300 hover:bg-terminal-bg-quaternary hover:text-white transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-orange text-black font-medium hover:bg-terminal-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Agent'}</span>
        </button>
      </div>
    </div>
  );
}
