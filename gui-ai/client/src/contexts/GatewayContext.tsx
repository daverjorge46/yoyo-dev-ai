import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { GatewayClient } from '../lib/gateway-client';
import type { ConnectionState, GatewayTokenResponse } from '../lib/gateway-types';

interface GatewayContextValue {
  client: GatewayClient | null;
  state: ConnectionState;
  error: string | null;
  reconnect: () => void;
  /** True when waiting for manual token input */
  needsToken: boolean;
  /** Submit a token manually (when auto-load failed) */
  submitToken: (token: string) => void;
}

const GatewayContext = createContext<GatewayContextValue>({
  client: null,
  state: 'disconnected',
  error: null,
  reconnect: () => {},
  needsToken: false,
  submitToken: () => {},
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
  const [needsToken, setNeedsToken] = useState(false);
  const clientRef = useRef<GatewayClient | null>(null);

  const connectWithToken = useCallback(async (token: string, gatewayUrl: string) => {
    // Build full WebSocket URL from the relative path (/ws/gateway)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = gatewayUrl.startsWith('/')
      ? `${wsProtocol}//${window.location.host}${gatewayUrl}`
      : gatewayUrl;

    console.log('[GatewayProvider] Connecting to WebSocket:', wsUrl);

    const gatewayClient = new GatewayClient(wsUrl, token);

    gatewayClient.onStateChange((newState) => {
      console.log('[GatewayProvider] State change:', newState);
      setState(newState);
      if (newState === 'connected') {
        setError(null);
        setNeedsToken(false);
      }
    });

    clientRef.current = gatewayClient;
    setClient(gatewayClient);
    setState('connecting');
    setNeedsToken(false);

    await gatewayClient.connect();
    console.log('[GatewayProvider] Connected successfully');
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        console.log('[GatewayProvider] Fetching gateway token...');
        const res = await fetch('/api/gateway-token');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detail = (body as Record<string, string>).error || `HTTP ${res.status}`;
          console.warn('[GatewayProvider] Token auto-load failed:', detail);
          if (!cancelled) {
            setError(detail);
            setNeedsToken(true);
            setState('error');
          }
          return;
        }
        const data: GatewayTokenResponse = await res.json();
        console.log('[GatewayProvider] Token received, gateway URL:', data.gatewayUrl);

        if (cancelled) return;

        await connectWithToken(data.token, data.gatewayUrl);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setError(msg);
          setNeedsToken(true);
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
  }, [connectWithToken]);

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

  const submitToken = useCallback(async (token: string) => {
    try {
      // Disconnect existing client if any
      clientRef.current?.disconnect();
      clientRef.current = null;
      setClient(null);
      setError(null);

      // Use the proxy WebSocket URL
      await connectWithToken(token, '/ws/gateway');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      setState('error');
      // Keep needsToken true so the input stays visible
      setNeedsToken(true);
    }
  }, [connectWithToken]);

  return (
    <GatewayContext.Provider value={{ client, state, error, reconnect, needsToken, submitToken }}>
      {children}
    </GatewayContext.Provider>
  );
}
