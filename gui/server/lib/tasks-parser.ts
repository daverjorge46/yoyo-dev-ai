/**
 * Tasks Parser
 *
 * Parses tasks.md files into structured task groups.
 * Supports multiple markdown formats used in .yoyo-dev/specs/
 */

// =============================================================================
// Types
// =============================================================================

export type ColumnId = 'backlog' | 'in_progress' | 'review' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  subtasks?: string[];
  /** Kanban column position (set externally from kanban-state.json) */
  column?: ColumnId;
}

export interface TaskGroup {
  id: string;
  title: string;
  tasks: Task[];
  completed: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clean a title by removing emphasis markers and number prefixes.
 * Examples:
 * - "**Title**" -> "Title"
 * - "1. Title" -> "Title"
 * - "1. **Title**" -> "Title"
 */
function cleanTitle(title: string): string {
  return title
    .replace(/^\d+\.\s*/, '')        // Remove "1. " prefix
    .replace(/\*\*/g, '')            // Remove ** emphasis
    .replace(/^\s+|\s+$/g, '');      // Trim whitespace
}

/**
 * Extract group ID from various header formats.
 * Returns [id, title] or null if not a group header.
 */
function parseGroupHeader(line: string): [string, string] | null {
  // Format: ## 1. Title or ## 1. **Title**
  const numericMatch = line.match(/^##\s+(\d+)\.\s*(.+)$/);
  if (numericMatch) {
    return [numericMatch[1], cleanTitle(numericMatch[2])];
  }

  // Format: ### Task 1: Title
  const taskMatch = line.match(/^###\s+Task\s+(\d+):\s*(.+)$/i);
  if (taskMatch) {
    return [taskMatch[1], cleanTitle(taskMatch[2])];
  }

  return null;
}

/**
 * Parse a task line. Returns [isCompleted, title] or null.
 */
function parseTaskLine(line: string): [boolean, string] | null {
  // Match: - [ ] or - [x] or - [X] at start of line (not indented)
  const match = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
  if (match) {
    const isCompleted = match[1].toLowerCase() === 'x';
    const title = cleanTitle(match[2]);
    return [isCompleted, title];
  }
  return null;
}

/**
 * Parse a subtask line. Returns [isCompleted, title] or null.
 */
function parseSubtaskLine(line: string): [boolean, string] | null {
  // Match: indented checkbox (2+ spaces before -)
  const match = line.match(/^\s+-\s+\[([ xX])\]\s+(.+)$/);
  if (match) {
    const isCompleted = match[1].toLowerCase() === 'x';
    // Keep subtask content as-is (may contain formatting)
    return [isCompleted, match[2].trim()];
  }
  return null;
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse a tasks.md file content into structured task groups.
 *
 * Supports multiple formats:
 * - Format A: ## 1. **Title** with - [ ] 1. Task
 * - Format B: ### Task 1: Title with - [ ] Subtask
 * - Format C: ## 1. Title (original format)
 *
 * @param content - Raw markdown content
 * @returns Array of task groups
 */
export function parseTasksFile(content: string): TaskGroup[] {
  const groups: TaskGroup[] = [];
  let currentGroup: TaskGroup | null = null;
  let currentTask: Task | null = null;
  let hasOrphanTasks = false;

  const lines = content.split('\n');

  for (const line of lines) {
    // Try to parse as group header
    const groupHeader = parseGroupHeader(line);
    if (groupHeader) {
      // Save previous group if exists
      if (currentGroup) {
        groups.push(currentGroup);
      }

      const [id, title] = groupHeader;
      currentGroup = {
        id,
        title,
        tasks: [],
        completed: false,
      };
      currentTask = null;
      continue;
    }

    // Try to parse as task
    const taskLine = parseTaskLine(line);
    if (taskLine) {
      const [isCompleted, title] = taskLine;

      // Create default group for orphan tasks
      if (!currentGroup) {
        currentGroup = {
          id: '0',
          title: 'Tasks',
          tasks: [],
          completed: false,
        };
        hasOrphanTasks = true;
      }

      currentTask = {
        id: `${currentGroup.id}.${currentGroup.tasks.length + 1}`,
        title,
        status: isCompleted ? 'completed' : 'pending',
        subtasks: [],
      };
      currentGroup.tasks.push(currentTask);
      continue;
    }

    // Try to parse as subtask
    const subtaskLine = parseSubtaskLine(line);
    if (subtaskLine && currentTask) {
      const [, subtaskTitle] = subtaskLine;
      // Skip metadata lines like "- **Context:**"
      if (!subtaskTitle.startsWith('**') || subtaskTitle.includes('[')) {
        currentTask.subtasks = currentTask.subtasks || [];
        currentTask.subtasks.push(subtaskTitle);
      }
      continue;
    }
  }

  // Don't forget the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  // Mark groups as completed if all tasks are completed
  for (const group of groups) {
    group.completed =
      group.tasks.length > 0 &&
      group.tasks.every((t) => t.status === 'completed');
  }

  return groups;
}
