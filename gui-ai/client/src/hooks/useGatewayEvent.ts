import { useEffect, useRef } from 'react';
import { useGateway } from '../contexts/GatewayContext';

/**
 * Hook to subscribe to YoyoClaw gateway events.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Re-subscribes when the client changes (reconnection).
 *
 * @param event - Event name (e.g., 'tick', 'chat.event', 'agent.event') or '*' for all
 * @param handler - Callback invoked with the event payload
 */
export function useGatewayEvent(
  event: string,
  handler: (payload: unknown) => void,
): void {
  const { client } = useGateway();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!client) return;

    const wrappedHandler = (payload: unknown) => {
      handlerRef.current(payload);
    };

    const unsubscribe = client.on(event, wrappedHandler);
    return unsubscribe;
  }, [client, event]);
}

/**
 * Hook to subscribe to tick events and trigger a callback.
 * Useful for auto-refreshing data on each gateway heartbeat (~30s).
 *
 * @param onTick - Callback invoked on each tick
 */
export function useGatewayTick(onTick: () => void): void {
  useGatewayEvent('tick', onTick);
}
