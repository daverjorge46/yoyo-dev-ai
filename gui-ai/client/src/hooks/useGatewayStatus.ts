import { useState, useEffect } from 'react';
import { useGateway } from '../contexts/GatewayContext';
import type { ConnectionState } from '../lib/gateway-types';

interface GatewayStatus {
  /** Current WebSocket connection state */
  connectionState: ConnectionState;
  /** Whether connected to the gateway */
  isConnected: boolean;
  /** Connection error message, if any */
  error: string | null;
  /** Gateway version string (e.g., '2026.2.3-1') */
  gatewayVersion: string | null;
  /** Timestamp of the last tick event from gateway */
  lastTickTs: number | null;
  /** Manually trigger a reconnection */
  reconnect: () => void;
}

/**
 * Hook exposing the gateway connection status for use in
 * headers, status indicators, and health displays.
 */
export function useGatewayStatus(): GatewayStatus {
  const { client, state, error, reconnect } = useGateway();
  const [gatewayVersion, setGatewayVersion] = useState<string | null>(null);
  const [lastTickTs, setLastTickTs] = useState<number | null>(null);

  // Poll client properties when state changes
  useEffect(() => {
    if (client) {
      setGatewayVersion(client.gatewayVersion);
      setLastTickTs(client.lastTickTs);
    }
  }, [client, state]);

  // Listen for tick events to update lastTickTs
  useEffect(() => {
    if (!client) return;

    const unsubscribe = client.on('tick', (payload) => {
      const tick = payload as { ts?: number };
      if (tick?.ts) {
        setLastTickTs(tick.ts);
      }
    });

    return unsubscribe;
  }, [client]);

  return {
    connectionState: state,
    isConnected: state === 'connected',
    error,
    gatewayVersion,
    lastTickTs,
    reconnect,
  };
}
