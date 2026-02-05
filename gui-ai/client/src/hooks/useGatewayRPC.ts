import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useGateway } from '../contexts/GatewayContext';
import { useCallback } from 'react';

/**
 * Hook for making RPC queries to the OpenClaw gateway via WebSocket.
 * Wraps TanStack Query's useQuery with automatic gateway client integration.
 */
export function useGatewayQuery<T = unknown>(
  method: string,
  params?: unknown,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'> & {
    timeoutMs?: number;
  },
) {
  const { client, state } = useGateway();
  const { timeoutMs, ...queryOptions } = options || {};

  return useQuery<T, Error>({
    queryKey: ['gateway', method, params],
    queryFn: async () => {
      if (!client?.isConnected) {
        throw new Error('Gateway not connected');
      }
      return client.request<T>(method, params, timeoutMs);
    },
    enabled: state === 'connected' && !!client,
    ...queryOptions,
  });
}

/**
 * Hook for making RPC mutations (write operations) to the OpenClaw gateway.
 */
export function useGatewayMutation<TParams = unknown, TResponse = unknown>(
  method: string,
  options?: {
    timeoutMs?: number;
    onSuccess?: (data: TResponse) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: string[];
  },
) {
  const { client } = useGateway();
  const queryClient = useQueryClient();

  return useMutation<TResponse, Error, TParams>({
    mutationFn: async (params: TParams) => {
      if (!client?.isConnected) {
        throw new Error('Gateway not connected');
      }
      return client.request<TResponse>(method, params, options?.timeoutMs);
    },
    onSuccess: (data) => {
      // Invalidate related queries
      if (options?.invalidateQueries) {
        for (const key of options.invalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['gateway', key] });
        }
      }
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Hook to get a request function for imperative RPC calls.
 */
export function useGatewayRequest() {
  const { client } = useGateway();

  return useCallback(
    async <T = unknown>(method: string, params?: unknown, timeoutMs?: number): Promise<T> => {
      if (!client?.isConnected) {
        throw new Error('Gateway not connected');
      }
      return client.request<T>(method, params, timeoutMs);
    },
    [client],
  );
}
