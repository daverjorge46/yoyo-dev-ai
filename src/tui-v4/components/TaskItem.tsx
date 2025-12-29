/**
 * TaskItem Component
 *
 * Individual task row with:
 * - Task number, status icon, title
 * - Indentation based on depth
 * - Selected/focused visual states
 */

import React from 'react';
import { Box, Text } from 'ink';
import { StatusIcon } from './StatusIcon.js';
import { textStyles } from '../theme/styles.js';
import { Task } from '../backend/state-manager.js';

export interface TaskItemProps {
  task: Task;
  depth: number;
  selected?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, depth, selected = false }) => {
  // Calculate indentation (2 spaces per depth level)
  const indent = '  '.repeat(depth);

  // Truncate long titles to fit terminal
  const maxTitleLength = 50 - (depth * 2);
  const title = task.title.length > maxTitleLength
    ? task.title.substring(0, maxTitleLength - 3) + '...'
    : task.title;

  return (
    <Box>
      <Text>
        {indent}
        <StatusIcon status={task.status} />
        {' '}
        <Text bold={selected} color={selected ? textStyles.title.color : textStyles.body.color}>
          {task.number}
        </Text>
        {' '}
        <Text color={selected ? textStyles.body.color : textStyles.secondary.color}>
          {title}
        </Text>
      </Text>
    </Box>
  );
};
