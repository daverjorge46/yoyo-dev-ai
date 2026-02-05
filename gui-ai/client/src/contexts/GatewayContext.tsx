import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { GatewayClient } from '../lib/gateway-client';
import type { ConnectionState, GatewayTokenResponse } from '../lib/gateway-types';

interface GatewayContextValue {
  client: GatewayClient | null;
  state: ConnectionState;
  error: string | null;
  reconnect: () => void;
}

const GatewayContext = createContext<GatewayContextValue>({
  client: null,
  state: 'disconnected',
  error: null,
  reconnect: () => {},
});

export function useGateway(): GatewayContextValue {
  return useContext(GatewayContext);
}

export function useGatewayClient(): GatewayClient {
  const { client } = useContext(GatewayContext);
  if (!client) {
    throw new Error('Gateway client not available. Is GatewayProvider mounted and connected?');
  }
  return client;
}

interface GatewayProviderProps {
  children: React.ReactNode;
}

export function GatewayProvider({ children }: GatewayProviderProps) {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<GatewayClient | null>(null);
  const clientRef = useRef<GatewayClient | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Fetch gateway token from our Hono backend
        const res = await fetch('/api/gateway-token');
        if (!res.ok) {
          throw new Error(`Failed to fetch gateway token: ${res.status}`);
        }
        const data: GatewayTokenResponse = await res.json();

        if (cancelled) return;

        // Create and connect the gateway client
        const gatewayClient = new GatewayClient(data.gatewayUrl, data.token);

        // Listen for state changes
        gatewayClient.onStateChange((newState) => {
          if (!cancelled) {
            setState(newState);
            if (newState === 'connected') {
              setError(null);
            }
          }
        });

        clientRef.current = gatewayClient;
        setClient(gatewayClient);
        setState('connecting');

        await gatewayClient.connect();
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setError(msg);
          setState('error');
          console.error('[GatewayProvider] Init failed:', msg);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const reconnect = useCallback(() => {
    const c = clientRef.current;
    if (c) {
      c.disconnect();
      setError(null);
      setState('connecting');
      c.connect().catch((err) => {
        setError(err instanceof Error ? err.message : 'Reconnect failed');
      });
    }
  }, []);

  return (
    <GatewayContext.Provider value={{ client, state, error, reconnect }}>
      {children}
    </GatewayContext.Provider>
  );
}
