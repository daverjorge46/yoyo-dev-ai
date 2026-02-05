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
        console.log('[GatewayProvider] Fetching gateway token...');
        // Fetch gateway token from our Hono backend
        const res = await fetch('/api/gateway-token');
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[GatewayProvider] Token fetch failed:', res.status, errorText);
          throw new Error(`Failed to fetch gateway token: ${res.status} - ${errorText}`);
        }
        const data: GatewayTokenResponse = await res.json();
        console.log('[GatewayProvider] Token received, gateway URL:', data.gatewayUrl);

        if (cancelled) return;

        // Build full WebSocket URL from the relative path (/ws/gateway)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = data.gatewayUrl.startsWith('/')
          ? `${wsProtocol}//${window.location.host}${data.gatewayUrl}`
          : data.gatewayUrl;

        console.log('[GatewayProvider] Connecting to WebSocket:', wsUrl);

        // Create and connect the gateway client
        const gatewayClient = new GatewayClient(wsUrl, data.token);

        // Listen for state changes
        gatewayClient.onStateChange((newState) => {
          if (!cancelled) {
            console.log('[GatewayProvider] State change:', newState);
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
        console.log('[GatewayProvider] Connected successfully');
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setError(msg);
          setState('error');
          console.error('[GatewayProvider] Init failed:', msg, err);
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
