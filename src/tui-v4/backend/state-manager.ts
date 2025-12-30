/**
 * Centralized State Manager
 *
 * Zustand store with slices for:
 * - Tasks: Task tree, status, metadata
 * - Specs: Active spec, metadata
 * - Git: Branch, status
 * - MCP: Server connections
 * - Memory: Block count
 *
 * Provides pub/sub events for state changes.
 */

import { create } from 'zustand';
import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface Task {
  id: string;
  number: string;  // e.g., "1.1", "2.3"
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  parallelSafe: boolean;
  parent?: string;  // Parent task number
  children: Task[];
}

export interface Spec {
  path: string;
  name: string;
  created: string;
  phase: string;
  tasksCreated: string | null;
}

export interface GitStatus {
  branch: string | null;
  modified: number;
  added: number;
  deleted: number;
  ahead: number;
  behind: number;
}

export interface McpStatus {
  serverCount: number;
  connected: boolean;
}

export interface MemoryStatus {
  blockCount: number;
  lastUpdated: string | null;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tools?: ToolCall[];
  isStreaming?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'approved' | 'denied' | 'completed' | 'failed';
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  model: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// State Interface
// =============================================================================

interface AppState {
  // Task state
  tasks: Task[];
  activeTask: string | null;
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setActiveTask: (taskId: string | null) => void;

  // Spec state
  activeSpec: Spec | null;
  specs: Spec[];
  setActiveSpec: (spec: Spec | null) => void;
  setSpecs: (specs: Spec[]) => void;

  // Git state
  git: GitStatus;
  setGitStatus: (status: GitStatus) => void;

  // MCP state
  mcp: McpStatus;
  setMcpStatus: (status: McpStatus) => void;

  // Memory state
  memory: MemoryStatus;
  setMemoryStatus: (status: MemoryStatus) => void;

  // Chat state
  chatMessages: ChatMessage[];
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  isClaudeConnected: boolean;
  isClaudeThinking: boolean;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setActiveSession: (sessionId: string | null) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  setClaudeConnected: (connected: boolean) => void;
  setClaudeThinking: (thinking: boolean) => void;
  updateToolStatus: (messageId: string, toolId: string, status: ToolCall['status'], result?: string) => void;
}

// =============================================================================
// Event Emitter
// =============================================================================

export const stateEvents = new EventEmitter();

// Event types
export type StateEvent =
  | 'task_updated'
  | 'spec_changed'
  | 'git_status'
  | 'mcp_status'
  | 'memory_status'
  | 'execution_log'
  | 'chat_message'
  | 'chat_session'
  | 'claude_connected'
  | 'tool_approval';

// =============================================================================
// Zustand Store
// =============================================================================

export const useAppStore = create<AppState>((set, get) => ({
  // Task state
  tasks: [],
  activeTask: null,

  setTasks: (tasks) => {
    set({ tasks });
    stateEvents.emit('task_updated', { tasks });
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    }));
    stateEvents.emit('task_updated', { taskId, updates });
  },

  setActiveTask: (taskId) => {
    set({ activeTask: taskId });
  },

  // Spec state
  activeSpec: null,
  specs: [],

  setActiveSpec: (spec) => {
    set({ activeSpec: spec });
    stateEvents.emit('spec_changed', { spec });
  },

  setSpecs: (specs) => {
    set({ specs });
    stateEvents.emit('spec_changed', { specs });
  },

  // Git state
  git: {
    branch: null,
    modified: 0,
    added: 0,
    deleted: 0,
    ahead: 0,
    behind: 0,
  },

  setGitStatus: (status) => {
    set({ git: status });
    stateEvents.emit('git_status', { status });
  },

  // MCP state
  mcp: {
    serverCount: 0,
    connected: false,
  },

  setMcpStatus: (status) => {
    set({ mcp: status });
    stateEvents.emit('mcp_status', { status });
  },

  // Memory state
  memory: {
    blockCount: 0,
    lastUpdated: null,
  },

  setMemoryStatus: (status) => {
    set({ memory: status });
    stateEvents.emit('memory_status', { status });
  },

  // Chat state
  chatMessages: [],
  chatSessions: [],
  activeSessionId: null,
  isClaudeConnected: false,
  isClaudeThinking: false,

  addMessage: (message) => {
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    }));
    stateEvents.emit('chat_message', { message, action: 'add' });
  },

  updateMessage: (messageId, updates) => {
    set((state) => ({
      chatMessages: state.chatMessages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
    stateEvents.emit('chat_message', { messageId, updates, action: 'update' });
  },

  clearMessages: () => {
    set({ chatMessages: [] });
    stateEvents.emit('chat_message', { action: 'clear' });
  },

  setActiveSession: (sessionId) => {
    const session = sessionId
      ? get().chatSessions.find((s) => s.id === sessionId)
      : null;
    set({
      activeSessionId: sessionId,
      chatMessages: session?.messages || [],
    });
    stateEvents.emit('chat_session', { sessionId, action: 'activate' });
  },

  addSession: (session) => {
    set((state) => ({
      chatSessions: [...state.chatSessions, session],
    }));
    stateEvents.emit('chat_session', { session, action: 'add' });
  },

  updateSession: (sessionId, updates) => {
    set((state) => ({
      chatSessions: state.chatSessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    }));
    stateEvents.emit('chat_session', { sessionId, updates, action: 'update' });
  },

  setClaudeConnected: (connected) => {
    set({ isClaudeConnected: connected });
    stateEvents.emit('claude_connected', { connected });
  },

  setClaudeThinking: (thinking) => {
    set({ isClaudeThinking: thinking });
  },

  updateToolStatus: (messageId, toolId, status, result) => {
    set((state) => ({
      chatMessages: state.chatMessages.map((msg) => {
        if (msg.id !== messageId || !msg.tools) return msg;
        return {
          ...msg,
          tools: msg.tools.map((tool) =>
            tool.id === toolId ? { ...tool, status, result } : tool
          ),
        };
      }),
    }));
    stateEvents.emit('tool_approval', { messageId, toolId, status, result });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectTasks = (state: AppState) => state.tasks;
export const selectActiveTask = (state: AppState) => state.activeTask;
export const selectActiveSpec = (state: AppState) => state.activeSpec;
export const selectGitStatus = (state: AppState) => state.git;
export const selectMcpStatus = (state: AppState) => state.mcp;
export const selectMemoryStatus = (state: AppState) => state.memory;

// Chat selectors
export const selectChatMessages = (state: AppState) => state.chatMessages;
export const selectChatSessions = (state: AppState) => state.chatSessions;
export const selectActiveSessionId = (state: AppState) => state.activeSessionId;
export const selectIsClaudeConnected = (state: AppState) => state.isClaudeConnected;
export const selectIsClaudeThinking = (state: AppState) => state.isClaudeThinking;
