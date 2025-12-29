/**
 * StatusIcon Component
 *
 * Renders task status as colored icon:
 * - completed → ✓ (green)
 * - in_progress → ⏳ (yellow)
 * - pending → ○ (dim)
 * - failed → ✗ (red)
 */

import React from 'react';
import { Text } from 'ink';
import { semanticColors } from '../theme/colors.js';

export interface StatusIconProps {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const iconMap = {
    completed: '✓',
    in_progress: '⏳',
    pending: '○',
    failed: '✗',
  };

  const colorMap = {
    completed: semanticColors.success,
    in_progress: semanticColors.warning,
    pending: semanticColors.textSecondary,
    failed: semanticColors.error,
  };

  const icon = iconMap[status];
  const color = colorMap[status];

  return (
    <Text color={color} dimColor={status === 'pending'}>
      {icon}
    </Text>
  );
};
