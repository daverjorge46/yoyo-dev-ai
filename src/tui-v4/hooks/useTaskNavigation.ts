/**
 * useTaskNavigation Hook
 *
 * Handles keyboard navigation for task tree:
 * - j/k (up/down)
 * - g/G (top/bottom)
 * - Enter (expand/collapse)
 * - Space (select task)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppStore, Task } from '../backend/state-manager.js';

export interface UseTaskNavigationResult {
  cursorPosition: number;
  handleUp: () => void;
  handleDown: () => void;
  handleTop: () => void;
  handleBottom: () => void;
  handleSelect: () => void;
  handleToggle: () => void;
  getCurrentTask: () => Task | null;
  getFlatTasks: () => Task[];
  isExpanded: (taskId: string) => boolean;
}

export function useTaskNavigation(): UseTaskNavigationResult {
  const tasks = useAppStore((state) => state.tasks);
  const setActiveTask = useAppStore((state) => state.setActiveTask);

  const [cursorPosition, setCursorPosition] = useState(0);

  // Initialize with all parent tasks expanded
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    const expandAll = (tasks: Task[]) => {
      tasks.forEach(task => {
        if (task.children && task.children.length > 0) {
          initialExpanded.add(task.id);
          expandAll(task.children);
        }
      });
    };
    expandAll(tasks);
    return initialExpanded;
  });

  // Update expanded tasks when tasks change
  useEffect(() => {
    const newExpanded = new Set<string>();
    const expandAll = (tasks: Task[]) => {
      tasks.forEach(task => {
        if (task.children && task.children.length > 0) {
          newExpanded.add(task.id);
          expandAll(task.children);
        }
      });
    };
    expandAll(tasks);
    setExpandedTasks(newExpanded);
  }, [tasks]);

  // Flatten task tree for navigation
  const flatTasks = useMemo(() => {
    const flatten = (tasks: Task[], depth = 0): Array<Task & { depth: number }> => {
      const result: Array<Task & { depth: number }> = [];

      for (const task of tasks) {
        result.push({ ...task, depth });

        // Include children if expanded
        if (expandedTasks.has(task.id) && task.children.length > 0) {
          result.push(...flatten(task.children, depth + 1));
        }
      }

      return result;
    };

    return flatten(tasks);
  }, [tasks, expandedTasks]);

  const handleUp = useCallback(() => {
    setCursorPosition((prev) => Math.max(0, prev - 1));
  }, []);

  const handleDown = useCallback(() => {
    setCursorPosition((prev) => Math.min(flatTasks.length - 1, prev + 1));
  }, [flatTasks.length]);

  const handleTop = useCallback(() => {
    setCursorPosition(0);
  }, []);

  const handleBottom = useCallback(() => {
    setCursorPosition(Math.max(0, flatTasks.length - 1));
  }, [flatTasks.length]);

  const handleSelect = useCallback(() => {
    const currentTask = flatTasks[cursorPosition];
    if (currentTask) {
      setActiveTask(currentTask.id);
    }
  }, [cursorPosition, flatTasks, setActiveTask]);

  const handleToggle = useCallback(() => {
    const currentTask = flatTasks[cursorPosition];
    if (currentTask && currentTask.children.length > 0) {
      setExpandedTasks((prev) => {
        const next = new Set(prev);
        if (next.has(currentTask.id)) {
          next.delete(currentTask.id);
        } else {
          next.add(currentTask.id);
        }
        return next;
      });
    }
  }, [cursorPosition, flatTasks]);

  const getCurrentTask = useCallback(() => {
    return flatTasks[cursorPosition] || null;
  }, [cursorPosition, flatTasks]);

  const getFlatTasks = useCallback(() => {
    return flatTasks;
  }, [flatTasks]);

  const isExpanded = useCallback(
    (taskId: string) => {
      return expandedTasks.has(taskId);
    },
    [expandedTasks]
  );

  return {
    cursorPosition,
    handleUp,
    handleDown,
    handleTop,
    handleBottom,
    handleSelect,
    handleToggle,
    getCurrentTask,
    getFlatTasks,
    isExpanded,
  };
}
