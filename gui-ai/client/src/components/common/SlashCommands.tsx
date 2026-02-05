/**
 * SlashCommands Component
 *
 * Shows autocomplete suggestions when user types "/" in the chat input.
 * Displays available OpenClaw commands with descriptions.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Cpu,
  RefreshCw,
  Info,
  Trash2,
  HelpCircle,
  MessageSquare,
  Settings,
  Zap
} from 'lucide-react';

export interface SlashCommand {
  command: string;
  description: string;
  icon: React.ReactNode;
  example?: string;
}

// Available OpenClaw slash commands
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/model',
    description: 'Change AI model',
    icon: <Cpu className="w-4 h-4" />,
    example: '/model moonshot/kimi-k2-0905-preview',
  },
  {
    command: '/status',
    description: 'Show current session status and model',
    icon: <Info className="w-4 h-4" />,
  },
  {
    command: '/new',
    description: 'Start a new conversation session',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    command: '/clear',
    description: 'Clear conversation history',
    icon: <Trash2 className="w-4 h-4" />,
  },
  {
    command: '/help',
    description: 'Show available commands',
    icon: <HelpCircle className="w-4 h-4" />,
  },
  {
    command: '/config',
    description: 'Show or modify configuration',
    icon: <Settings className="w-4 h-4" />,
  },
  {
    command: '/skills',
    description: 'List available skills',
    icon: <Zap className="w-4 h-4" />,
  },
  {
    command: '/context',
    description: 'Show current context',
    icon: <MessageSquare className="w-4 h-4" />,
  },
];

interface SlashCommandsProps {
  input: string;
  onSelectCommand: (command: string) => void;
  visible: boolean;
}

export function SlashCommands({ input, onSelectCommand, visible }: SlashCommandsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on input
  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.command.toLowerCase().startsWith(input.toLowerCase())
  );

  // Reset selection when input changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [input]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current) {
      const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!visible || filteredCommands.length === 0) {
    return null;
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!visible) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelectCommand(filteredCommands[selectedIndex].command + ' ');
        }
        break;
      case 'Escape':
        e.preventDefault();
        // Parent will handle closing
        break;
    }
  };

  // Expose keyboard handler
  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, selectedIndex, filteredCommands]);

  return (
    <div
      className="
        absolute bottom-full left-0 right-0 mb-2
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-xl
        max-h-[300px] overflow-auto
        z-50
      "
    >
      <div className="p-2">
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-3 py-2">
          Commands
        </div>
        <div ref={containerRef} className="space-y-1">
          {filteredCommands.map((cmd, index) => (
            <button
              key={cmd.command}
              onClick={() => onSelectCommand(cmd.command + ' ')}
              className={`
                w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left
                transition-colors
                ${
                  index === selectedIndex
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                }
              `}
            >
              <div className={`
                p-2 rounded-lg
                ${index === selectedIndex
                  ? 'bg-primary-500/20 text-primary-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
              `}>
                {cmd.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-semibold text-sm">
                  {cmd.command}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {cmd.description}
                </div>
                {cmd.example && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                    Example: {cmd.example}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SlashCommands;
