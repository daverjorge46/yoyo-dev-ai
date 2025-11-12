import { Logger } from '../utils/Logger';

export interface WorkflowState {
  spec_name: string;
  created_at: string;
  execution_started?: string;
  execution_completed?: string;
  current_phase: string;
  active_task?: string;
  tasks_completed?: string;
  workflow_state: string;
  last_updated: string;
  notes?: string;
}

/**
 * Parser for state.json files
 */
export class StateParser {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Parse state.json content
   */
  public parse(content: string): WorkflowState | null {
    try {
      const state = JSON.parse(content) as WorkflowState;
      return state;
    } catch (error) {
      this.logger.error('Failed to parse state.json', error as Error);
      return null;
    }
  }

  /**
   * Get workflow progress percentage
   */
  public getProgress(state: WorkflowState, totalTasks: number): number {
    if (!state.tasks_completed || totalTasks === 0) {
      return 0;
    }

    const completed = state.tasks_completed.split(',').length;
    return Math.round((completed / totalTasks) * 100);
  }
}
