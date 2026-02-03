/**
 * useGuiContext Hook
 *
 * Provides GUI context information including mode (dev/ai) and available features.
 * Uses React Query for caching and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query';

export type GuiMode = 'dev' | 'ai';

export interface GuiFeatures {
  specs: boolean;
  fixes: boolean;
  roadmap: boolean;
  memory: boolean;
  skills: boolean;
  chat: boolean;
  agents: boolean;
  terminals: boolean;
  qa: boolean;
}

export interface GuiContext {
  mode: GuiMode;
  port: number;
  projectRoot: string;
  version: string;
  features: GuiFeatures;
}

async function fetchContext(): Promise<GuiContext> {
  const res = await fetch('/api/context');
  if (!res.ok) {
    throw new Error('Failed to fetch GUI context');
  }
  return res.json();
}

/**
 * Hook to get the current GUI context
 *
 * @returns Object containing:
 *   - context: The GUI context (mode, features, etc.)
 *   - isLoading: Whether the context is being fetched
 *   - isDevMode: Convenience boolean for dev mode check
 *   - isAiMode: Convenience boolean for ai mode check
 *   - hasFeature: Function to check if a feature is enabled
 */
export function useGuiContext() {
  const { data: context, isLoading, error } = useQuery({
    queryKey: ['gui-context'],
    queryFn: fetchContext,
    staleTime: Infinity, // Context doesn't change during session
    gcTime: Infinity,
    retry: 3,
  });

  // Default context for loading state
  const defaultContext: GuiContext = {
    mode: 'dev',
    port: 3456,
    projectRoot: '',
    version: '7.0.0',
    features: {
      specs: true,
      fixes: true,
      roadmap: true,
      memory: true,
      skills: true,
      chat: true,
      agents: true,
      terminals: true,
      qa: true,
    },
  };

  const currentContext = context ?? defaultContext;

  return {
    context: currentContext,
    isLoading,
    error,
    isDevMode: currentContext.mode === 'dev',
    isAiMode: currentContext.mode === 'ai',
    hasFeature: (feature: keyof GuiFeatures) => currentContext.features[feature],
  };
}

/**
 * Get mode-specific title
 */
export function getModeTitle(mode: GuiMode): string {
  return mode === 'dev' ? 'Yoyo Dev' : 'Yoyo AI';
}

/**
 * Get mode-specific description
 */
export function getModeDescription(mode: GuiMode): string {
  return mode === 'dev'
    ? 'Development Environment Dashboard'
    : 'Business & Personal AI Assistant';
}
