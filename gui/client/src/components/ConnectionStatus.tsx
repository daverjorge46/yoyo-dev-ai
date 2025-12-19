/**
 * ConnectionStatus Component
 *
 * Displays WebSocket connection status with visual indicator.
 */

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { ConnectionStatus as ConnectionStatusType } from '../hooks/useWebSocket';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onReconnect?: () => void;
}

export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'bg-green-500',
          textColor: 'text-green-600 dark:text-green-400',
          label: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          label: 'Connecting...',
          pulse: true,
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          label: 'Reconnecting...',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'bg-red-500',
          textColor: 'text-red-600 dark:text-red-400',
          label: 'Disconnected',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator dot */}
      <div className="relative">
        <div
          className={`h-2 w-2 rounded-full ${config.color} ${
            config.pulse ? 'animate-pulse' : ''
          }`}
        />
        {config.pulse && (
          <div
            className={`absolute inset-0 h-2 w-2 rounded-full ${config.color} animate-ping opacity-75`}
          />
        )}
      </div>

      {/* Status text with icon */}
      <div className={`flex items-center gap-1.5 text-sm ${config.textColor}`}>
        <Icon
          className={`h-3.5 w-3.5 ${config.pulse ? 'animate-spin' : ''}`}
          style={{ animationDuration: '2s' }}
        />
        <span>{config.label}</span>
      </div>

      {/* Reconnect button when disconnected */}
      {status === 'disconnected' && onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-2 px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
