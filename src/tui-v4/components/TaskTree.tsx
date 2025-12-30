/**
 * TaskTree Component
 *
 * Hierarchical task tree with:
 * - Collapsible groups
 * - Keyboard navigation
 * - Status indicators
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TaskItem } from './TaskItem.js';
import { useTaskNavigation } from '../hooks/useTaskNavigation.js';
import { useAppStore } from '../backend/state-manager.js';
import { textStyles } from '../theme/styles.js';

export interface TaskTreeProps {
  initialCollapsed?: boolean;
}

export const TaskTree: React.FC<TaskTreeProps> = ({ initialCollapsed: _initialCollapsed = false }) => {
  const tasks = useAppStore((state) => state.tasks);
  const activeTask = useAppStore((state) => state.activeTask);
  const navigation = useTaskNavigation();

  if (tasks.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor color={textStyles.secondary.color}>
          No tasks available
        </Text>
      </Box>
    );
  }

  const flatTasks = navigation.getFlatTasks();

  return (
    <Box flexDirection="column">
      {flatTasks.map((task, index) => {
        const selected = index === navigation.cursorPosition;
        const isActive = task.id === activeTask;
        const hasChildren = task.children && task.children.length > 0;
        const isExpanded = navigation.isExpanded(task.id);

        return (
          <Box key={task.id} flexDirection="column">
            <Box>
              {/* Expand/collapse indicator for parent tasks */}
              {hasChildren && (
                <Text>{isExpanded ? '▼' : '▶'} </Text>
              )}
              {!hasChildren && <Text>  </Text>}

              <TaskItem
                task={task}
                depth={task.depth || 0}
                selected={selected || isActive}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
