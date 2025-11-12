import { EventEmitter } from 'events';

/**
 * Event type constants
 */
export enum YoyoEvent {
  TASK_UPDATED = 'task:updated',
  ROADMAP_UPDATED = 'roadmap:updated',
  SPEC_CHANGED = 'spec:changed',
  WORKFLOW_STATE_CHANGED = 'workflow:state:changed',
  GIT_STATUS_CHANGED = 'git:status:changed',
  CONFIG_CHANGED = 'config:changed',
}

/**
 * Event payload interfaces
 */
export interface TaskUpdatedEvent {
  specPath: string;
  taskId?: string;
  timestamp: number;
}

export interface RoadmapUpdatedEvent {
  roadmapPath: string;
  timestamp: number;
}

export interface SpecChangedEvent {
  specPath: string;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: number;
}

export interface WorkflowStateChangedEvent {
  state: string;
  specName: string;
  timestamp: number;
}

export interface GitStatusChangedEvent {
  branch: string;
  isDirty: boolean;
  timestamp: number;
}

/**
 * Centralized event bus for cross-component communication
 * Follows singleton pattern
 */
export class EventBus extends EventEmitter {
  private static _instance: EventBus | undefined;

  private constructor() {
    super();
    this.setMaxListeners(50); // Increase for multiple subscribers
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * Emit task updated event
   */
  public emitTaskUpdated(specPath: string, taskId?: string): void {
    this.emit(YoyoEvent.TASK_UPDATED, {
      specPath,
      taskId,
      timestamp: Date.now(),
    } as TaskUpdatedEvent);
  }

  /**
   * Emit roadmap updated event
   */
  public emitRoadmapUpdated(roadmapPath: string): void {
    this.emit(YoyoEvent.ROADMAP_UPDATED, {
      roadmapPath,
      timestamp: Date.now(),
    } as RoadmapUpdatedEvent);
  }

  /**
   * Emit spec changed event
   */
  public emitSpecChanged(
    specPath: string,
    changeType: 'created' | 'modified' | 'deleted'
  ): void {
    this.emit(YoyoEvent.SPEC_CHANGED, {
      specPath,
      changeType,
      timestamp: Date.now(),
    } as SpecChangedEvent);
  }

  /**
   * Emit workflow state changed event
   */
  public emitWorkflowStateChanged(state: string, specName: string): void {
    this.emit(YoyoEvent.WORKFLOW_STATE_CHANGED, {
      state,
      specName,
      timestamp: Date.now(),
    } as WorkflowStateChangedEvent);
  }

  /**
   * Emit git status changed event
   */
  public emitGitStatusChanged(branch: string, isDirty: boolean): void {
    this.emit(YoyoEvent.GIT_STATUS_CHANGED, {
      branch,
      isDirty,
      timestamp: Date.now(),
    } as GitStatusChangedEvent);
  }

  /**
   * Dispose event bus
   */
  public dispose(): void {
    this.removeAllListeners();
    EventBus._instance = undefined;
  }
}
