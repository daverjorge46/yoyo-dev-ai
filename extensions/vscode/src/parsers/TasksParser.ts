import { Logger } from '../utils/Logger';

export interface Task {
  id: string;          // e.g., "1.1", "2.3"
  title: string;       // Task title
  description: string;
  completed: boolean;
  subtasks: Task[];
  isGroup: boolean;    // true if "Task Group", false if individual task
  depth: number;       // Nesting level
}

/**
 * Parser for tasks.md files
 */
export class TasksParser {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Parse tasks.md content into hierarchical structure
   */
  public parse(content: string): Task[] {
    const lines = content.split('\n');
    const tasks: Task[] = [];
    let currentGroup: Task | null = null;
    let currentTask: Task | null = null;

    for (const line of lines) {
      // Task Group: ### Task Group N: Name
      if (line.startsWith('### Task Group')) {
        const match = line.match(/### Task Group (\d+):\s*(.+)/);
        if (match) {
          currentGroup = {
            id: match[1],
            title: match[2].replace('✅', '').trim(),
            description: '',
            completed: line.includes('✅'),
            subtasks: [],
            isGroup: true,
            depth: 0,
          };
          tasks.push(currentGroup);
          currentTask = null;
        }
      }
      // Individual Task: #### Task N.M: Name
      else if (line.startsWith('#### Task')) {
        const match = line.match(/#### Task ([\d.]+):\s*(.+)/);
        if (match && currentGroup) {
          currentTask = {
            id: match[1],
            title: match[2].replace('✅', '').trim(),
            description: '',
            completed: line.includes('✅'),
            subtasks: [],
            isGroup: false,
            depth: 1,
          };
          currentGroup.subtasks.push(currentTask);
        }
      }
      // Description line (after task header)
      else if (line.startsWith('**Description**:') && currentTask) {
        currentTask.description = line.replace('**Description**:', '').trim();
      }
      // Check for completion status in acceptance criteria
      else if (line.trim().startsWith('- [x]') && currentTask) {
        // Mark as completed if any acceptance criteria is checked
        // (we'll refine this later if needed)
        if (!currentTask.completed) {
          currentTask.completed = true;
        }
      }
    }

    // Mark groups as complete if all subtasks complete
    for (const group of tasks) {
      if (group.subtasks.length > 0) {
        const allComplete = group.subtasks.every((t) => t.completed);
        if (allComplete && !group.completed) {
          group.completed = true;
        }
      }
    }

    this.logger.debug(`Parsed ${tasks.length} task groups`);
    return tasks;
  }

  /**
   * Count completed and total tasks
   */
  public getTaskStats(tasks: Task[]): { completed: number; total: number } {
    let completed = 0;
    let total = 0;

    for (const group of tasks) {
      for (const task of group.subtasks) {
        total++;
        if (task.completed) {
          completed++;
        }
      }
    }

    return { completed, total };
  }
}
