/**
 * AgentCard Component
 *
 * Displays an agent definition in a card format.
 */

import { Bot, Thermometer, Cpu, MoreVertical, Edit, Copy, Trash2, Crown } from 'lucide-react';
import type { AgentSummary } from '../../../../shared/types/agent';
import { useState, useRef, useEffect } from 'react';

interface AgentCardProps {
  /** Agent data */
  agent: AgentSummary;
  /** Whether this card is selected */
  selected?: boolean;
  /** Click handler for selecting the card */
  onSelect?: () => void;
  /** Edit handler */
  onEdit?: () => void;
  /** Duplicate handler */
  onDuplicate?: () => void;
  /** Delete handler */
  onDelete?: () => void;
  /** Additional className */
  className?: string;
}

export function AgentCard({
  agent,
  selected = false,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  className = '',
}: AgentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // Format model name for display
  const formatModel = (model: string): string => {
    if (model.includes('opus')) return 'Opus 4.5';
    if (model.includes('sonnet')) return 'Sonnet 4';
    if (model.includes('gpt-4o')) return 'GPT-4o';
    if (model.includes('gemini')) return 'Gemini';
    return model.split('-').slice(-2).join(' ');
  };

  // Temperature color based on value
  const getTempColor = (temp: number): string => {
    if (temp <= 0.3) return 'text-blue-400';
    if (temp <= 0.7) return 'text-green-400';
    if (temp <= 1.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const isPrimary = agent.mode === 'Primary';
  const isProtected = agent.id === 'yoyo-ai';

  return (
    <div
      className={`
        relative rounded-lg border bg-terminal-bg-secondary overflow-hidden transition-all cursor-pointer
        ${selected ? 'border-terminal-orange ring-2 ring-terminal-orange/30' : 'border-terminal-border hover:border-gray-600'}
        ${className}
      `}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Agent icon */}
            <div className={`
              p-2 rounded-lg flex-shrink-0
              ${isPrimary ? 'bg-terminal-orange/20 text-terminal-orange' : 'bg-terminal-cyan/20 text-terminal-cyan'}
            `}>
              {isPrimary ? <Crown className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>

            {/* Name and mode */}
            <div className="min-w-0">
              <h3 className="font-medium text-white truncate">{agent.name}</h3>
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${isPrimary ? 'bg-terminal-orange/20 text-terminal-orange' : 'bg-terminal-cyan/20 text-terminal-cyan'}
              `}>
                {agent.mode}
              </span>
            </div>
          </div>

          {/* Menu button */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded hover:bg-terminal-bg-tertiary text-gray-400 hover:text-white transition-colors"
              aria-label="Agent options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-terminal-bg-tertiary border border-terminal-border rounded-lg shadow-lg py-1">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-terminal-bg-quaternary hover:text-white transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-terminal-bg-quaternary hover:text-white transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Duplicate</span>
                  </button>
                )}
                {onDelete && !isProtected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-terminal-bg-quaternary hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-400 line-clamp-2">{agent.description}</p>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {/* Model badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-terminal-bg-tertiary text-xs">
          <Cpu className="h-3 w-3 text-gray-500" />
          <span className="text-gray-300">{formatModel(agent.model)}</span>
        </div>

        {/* Temperature badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-terminal-bg-tertiary text-xs">
          <Thermometer className={`h-3 w-3 ${getTempColor(agent.temperature)}`} />
          <span className={getTempColor(agent.temperature)}>{agent.temperature.toFixed(1)}</span>
        </div>
      </div>

      {/* Protected indicator */}
      {isProtected && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-1.5 bg-terminal-orange/10 border-t border-terminal-orange/30">
          <span className="text-xs text-terminal-orange">Protected - Primary Orchestrator</span>
        </div>
      )}
    </div>
  );
}

/**
 * AgentCardSkeleton - Loading state for AgentCard
 */
export function AgentCardSkeleton() {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-bg-secondary p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-terminal-bg-tertiary" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-terminal-bg-tertiary rounded mb-2" />
          <div className="h-3 w-16 bg-terminal-bg-tertiary rounded" />
        </div>
      </div>
      <div className="h-8 bg-terminal-bg-tertiary rounded mb-3" />
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-terminal-bg-tertiary rounded" />
        <div className="h-6 w-14 bg-terminal-bg-tertiary rounded" />
      </div>
    </div>
  );
}
