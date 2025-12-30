/**
 * useClaudeChat Hook
 *
 * React hook to connect Claude Code service to Zustand store.
 * Manages connection lifecycle and message handling.
 */

import { useEffect, useCallback } from 'react';
import { useAppStore, ChatMessage, ToolCall } from '../backend/state-manager.js';
import { claudeService } from '../backend/services/ClaudeService.js';

export interface UseClaudeChatReturn {
  isConnected: boolean;
  isThinking: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendMessage: (content: string) => Promise<void>;
  approveTool: (toolId: string) => Promise<void>;
  denyTool: (toolId: string) => Promise<void>;
}

export function useClaudeChat(): UseClaudeChatReturn {
  // Get store state and actions
  const isConnected = useAppStore((s) => s.isClaudeConnected);
  const isThinking = useAppStore((s) => s.isClaudeThinking);
  const setClaudeConnected = useAppStore((s) => s.setClaudeConnected);
  const setClaudeThinking = useAppStore((s) => s.setClaudeThinking);
  const addMessage = useAppStore((s) => s.addMessage);
  const updateMessage = useAppStore((s) => s.updateMessage);

  // Setup event listeners
  useEffect(() => {
    const handleConnected = () => {
      setClaudeConnected(true);
    };

    const handleDisconnected = () => {
      setClaudeConnected(false);
      setClaudeThinking(false);
    };

    const handleMessage = (message: ChatMessage) => {
      // Check if this is an update to an existing streaming message
      const existingMessages = useAppStore.getState().chatMessages;
      const existing = existingMessages.find((m) => m.id === message.id);

      if (existing && existing.isStreaming) {
        // Update existing streaming message
        updateMessage(message.id, {
          content: existing.content + message.content,
        });
      } else {
        addMessage(message);
      }
    };

    const handleToolApproval = (tool: ToolCall, messageId: string) => {
      // Add tool to message
      const existingMessages = useAppStore.getState().chatMessages;
      const message = existingMessages.find((m) => m.id === messageId);

      if (message) {
        const updatedTools = [...(message.tools || []), tool];
        updateMessage(messageId, { tools: updatedTools });
      }
    };

    const handleThinking = (thinking: boolean) => {
      setClaudeThinking(thinking);
    };

    const handleError = (error: Error) => {
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);
    };

    // Register listeners
    claudeService.on('connected', handleConnected);
    claudeService.on('disconnected', handleDisconnected);
    claudeService.on('message', handleMessage);
    claudeService.on('toolApproval', handleToolApproval);
    claudeService.on('thinking', handleThinking);
    claudeService.on('error', handleError);

    // Cleanup
    return () => {
      claudeService.off('connected', handleConnected);
      claudeService.off('disconnected', handleDisconnected);
      claudeService.off('message', handleMessage);
      claudeService.off('toolApproval', handleToolApproval);
      claudeService.off('thinking', handleThinking);
      claudeService.off('error', handleError);
    };
  }, [setClaudeConnected, setClaudeThinking, addMessage, updateMessage]);

  // Connect to Claude
  const connect = useCallback(async (): Promise<boolean> => {
    return await claudeService.connect();
  }, []);

  // Disconnect from Claude
  const disconnect = useCallback(() => {
    claudeService.disconnect();
  }, []);

  // Send a message
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    await claudeService.sendMessage(content);
  }, []);

  // Approve tool
  const approveTool = useCallback(async (toolId: string): Promise<void> => {
    await claudeService.approveTool(toolId);
  }, []);

  // Deny tool
  const denyTool = useCallback(async (toolId: string): Promise<void> => {
    await claudeService.denyTool(toolId);
  }, []);

  return {
    isConnected,
    isThinking,
    connect,
    disconnect,
    sendMessage,
    approveTool,
    denyTool,
  };
}
