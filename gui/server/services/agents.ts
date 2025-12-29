/**
 * Agent Tracker Service
 *
 * In-memory tracking of parallel agent execution progress.
 * Provides real-time status updates via WebSocket.
 */

import { wsManager } from './websocket.js';

// =============================================================================
// Types
// =============================================================================

export type AgentStatus = 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentLog {
  timestamp: number;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
}

export interface AgentProgress {
  id: string;
  type: string;
  status: AgentStatus;
  currentTask: string | null;
  startTime: number | null;
  endTime: number | null;
  progress: number;
  logs: AgentLog[];
  error: string | null;
  specId: string | null;
  taskGroupId: string | null;
}

export interface AgentStartParams {
  id: string;
  type: string;
  specId?: string;
  taskGroupId?: string;
  currentTask?: string;
}

export interface AgentUpdateParams {
  currentTask?: string;
  progress?: number;
  status?: AgentStatus;
  error?: string;
}

// =============================================================================
// AgentTracker Class
// =============================================================================

class AgentTracker {
  private agents: Map<string, AgentProgress> = new Map();
  private maxLogs = 100;

  /**
   * Start tracking a new agent
   */
  startAgent(params: AgentStartParams): AgentProgress {
    const agent: AgentProgress = {
      id: params.id,
      type: params.type,
      status: 'running',
      currentTask: params.currentTask || null,
      startTime: Date.now(),
      endTime: null,
      progress: 0,
      logs: [],
      error: null,
      specId: params.specId || null,
      taskGroupId: params.taskGroupId || null,
    };

    this.agents.set(params.id, agent);
    this.addLog(params.id, `Agent ${params.type} started`, 'info');
    this.broadcastAgentStarted(agent);

    return agent;
  }

  /**
   * Update agent progress
   */
  updateAgent(id: string, params: AgentUpdateParams): AgentProgress | null {
    const agent = this.agents.get(id);
    if (!agent) {
      console.warn(`[AgentTracker] Agent ${id} not found`);
      return null;
    }

    if (params.currentTask !== undefined) {
      agent.currentTask = params.currentTask;
    }

    if (params.progress !== undefined) {
      agent.progress = Math.min(100, Math.max(0, params.progress));
    }

    if (params.status !== undefined) {
      agent.status = params.status;
      if (params.status === 'completed' || params.status === 'failed' || params.status === 'cancelled') {
        agent.endTime = Date.now();
      }
    }

    if (params.error !== undefined) {
      agent.error = params.error;
    }

    this.broadcastAgentProgress(agent);

    return agent;
  }

  /**
   * Complete an agent successfully
   */
  completeAgent(id: string): AgentProgress | null {
    const agent = this.agents.get(id);
    if (!agent) {
      console.warn(`[AgentTracker] Agent ${id} not found`);
      return null;
    }

    agent.status = 'completed';
    agent.progress = 100;
    agent.endTime = Date.now();
    agent.currentTask = null;

    this.addLog(id, `Agent ${agent.type} completed successfully`, 'info');
    this.broadcastAgentCompleted(agent);

    return agent;
  }

  /**
   * Mark an agent as failed
   */
  failAgent(id: string, error: string): AgentProgress | null {
    const agent = this.agents.get(id);
    if (!agent) {
      console.warn(`[AgentTracker] Agent ${id} not found`);
      return null;
    }

    agent.status = 'failed';
    agent.error = error;
    agent.endTime = Date.now();

    this.addLog(id, `Agent ${agent.type} failed: ${error}`, 'error');
    this.broadcastAgentFailed(agent);

    return agent;
  }

  /**
   * Cancel an agent
   */
  cancelAgent(id: string): AgentProgress | null {
    const agent = this.agents.get(id);
    if (!agent) {
      console.warn(`[AgentTracker] Agent ${id} not found`);
      return null;
    }

    if (agent.status !== 'running' && agent.status !== 'waiting') {
      console.warn(`[AgentTracker] Agent ${id} cannot be cancelled (status: ${agent.status})`);
      return null;
    }

    agent.status = 'cancelled';
    agent.endTime = Date.now();

    this.addLog(id, `Agent ${agent.type} was cancelled`, 'warn');
    this.broadcastAgentProgress(agent);

    return agent;
  }

  /**
   * Add a log entry for an agent
   */
  addLog(id: string, message: string, level: AgentLog['level'] = 'info'): void {
    const agent = this.agents.get(id);
    if (!agent) {
      return;
    }

    const log: AgentLog = {
      timestamp: Date.now(),
      message,
      level,
    };

    agent.logs.push(log);

    // Keep only the last maxLogs entries
    if (agent.logs.length > this.maxLogs) {
      agent.logs = agent.logs.slice(-this.maxLogs);
    }

    this.broadcastAgentLog(id, log);
  }

  /**
   * Get a single agent by ID
   */
  getAgent(id: string): AgentProgress | null {
    return this.agents.get(id) || null;
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentProgress[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents filtered by status
   */
  getAgentsByStatus(status: AgentStatus): AgentProgress[] {
    return Array.from(this.agents.values()).filter((a) => a.status === status);
  }

  /**
   * Get running agents
   */
  getRunningAgents(): AgentProgress[] {
    return this.getAgentsByStatus('running');
  }

  /**
   * Get aggregate progress across all running agents
   */
  getAggregateProgress(): { total: number; completed: number; running: number; failed: number; percentage: number } {
    const agents = this.getAllAgents();
    const total = agents.length;
    const completed = agents.filter((a) => a.status === 'completed').length;
    const running = agents.filter((a) => a.status === 'running').length;
    const failed = agents.filter((a) => a.status === 'failed').length;

    // Calculate overall percentage based on individual agent progress
    let totalProgress = 0;
    for (const agent of agents) {
      totalProgress += agent.progress;
    }

    const percentage = total > 0 ? Math.round(totalProgress / total) : 0;

    return { total, completed, running, failed, percentage };
  }

  /**
   * Clear completed/failed/cancelled agents
   */
  clearFinishedAgents(): void {
    for (const [id, agent] of this.agents) {
      if (agent.status === 'completed' || agent.status === 'failed' || agent.status === 'cancelled') {
        this.agents.delete(id);
      }
    }
  }

  /**
   * Clear all agents
   */
  clearAllAgents(): void {
    this.agents.clear();
  }

  /**
   * Remove a specific agent
   */
  removeAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  // =============================================================================
  // WebSocket Broadcasting
  // =============================================================================

  private broadcastAgentStarted(agent: AgentProgress): void {
    wsManager.broadcast({
      type: 'agent:started' as any,
      payload: {
        data: this.serializeAgent(agent),
        timestamp: Date.now(),
      },
    });
  }

  private broadcastAgentProgress(agent: AgentProgress): void {
    wsManager.broadcast({
      type: 'agent:progress' as any,
      payload: {
        data: this.serializeAgent(agent),
        timestamp: Date.now(),
      },
    });
  }

  private broadcastAgentCompleted(agent: AgentProgress): void {
    wsManager.broadcast({
      type: 'agent:completed' as any,
      payload: {
        data: this.serializeAgent(agent),
        timestamp: Date.now(),
      },
    });
  }

  private broadcastAgentFailed(agent: AgentProgress): void {
    wsManager.broadcast({
      type: 'agent:failed' as any,
      payload: {
        data: this.serializeAgent(agent),
        timestamp: Date.now(),
      },
    });
  }

  private broadcastAgentLog(agentId: string, log: AgentLog): void {
    wsManager.broadcast({
      type: 'agent:log' as any,
      payload: {
        data: { agentId, log },
        timestamp: Date.now(),
      },
    });
  }

  private serializeAgent(agent: AgentProgress): AgentProgress & { duration: number | null } {
    const duration =
      agent.startTime !== null
        ? (agent.endTime ?? Date.now()) - agent.startTime
        : null;

    return {
      ...agent,
      // Include only last 20 logs in broadcast
      logs: agent.logs.slice(-20),
      duration,
    };
  }
}

// Singleton instance
export const agentTracker = new AgentTracker();
