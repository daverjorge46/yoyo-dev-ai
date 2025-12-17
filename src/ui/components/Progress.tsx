/**
 * Progress and Spinner Components
 *
 * Visual feedback for loading states and task progress.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// =============================================================================
// Spinner Component
// =============================================================================

interface SpinnerProps {
  /** Spinner type */
  type?: 'dots' | 'line' | 'arc' | 'bounce';
  /** Label to show next to spinner */
  label?: string;
  /** Color of spinner */
  color?: string;
}

const SPINNER_FRAMES: Record<string, string[]> = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
};

/**
 * Animated spinner component.
 */
export function Spinner({
  type = 'dots',
  label,
  color = 'cyan',
}: SpinnerProps): React.ReactElement {
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = SPINNER_FRAMES[type] ?? SPINNER_FRAMES.dots;

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % (frames?.length ?? 1));
    }, 80);

    return () => clearInterval(timer);
  }, [frames?.length]);

  const frame = frames?.[frameIndex] ?? '?';

  return (
    <Text>
      <Text color={color}>{frame}</Text>
      {label && <Text> {label}</Text>}
    </Text>
  );
}

// =============================================================================
// Progress Bar Component
// =============================================================================

interface ProgressBarProps {
  /** Current progress (0-100) */
  percent: number;
  /** Width of progress bar in characters */
  width?: number;
  /** Show percentage label */
  showPercent?: boolean;
  /** Bar character */
  barChar?: string;
  /** Empty character */
  emptyChar?: string;
  /** Color of filled portion */
  color?: string;
}

/**
 * Progress bar component.
 */
export function ProgressBar({
  percent,
  width = 20,
  showPercent = true,
  barChar = '█',
  emptyChar = '░',
  color = 'green',
}: ProgressBarProps): React.ReactElement {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filledWidth = Math.round((clampedPercent / 100) * width);
  const emptyWidth = width - filledWidth;

  return (
    <Text>
      <Text color={color}>{barChar.repeat(filledWidth)}</Text>
      <Text color="gray">{emptyChar.repeat(emptyWidth)}</Text>
      {showPercent && (
        <Text color="gray"> {clampedPercent.toFixed(0)}%</Text>
      )}
    </Text>
  );
}

// =============================================================================
// Step Progress Component
// =============================================================================

interface Step {
  /** Step label */
  label: string;
  /** Step status */
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface StepProgressProps {
  /** List of steps */
  steps: Step[];
  /** Current step index */
  currentStep: number;
}

/**
 * Step indicator for multi-step processes.
 */
export function StepProgress({ steps, currentStep }: StepProgressProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {steps.map((step, index) => {
        let icon: string;
        let color: string;

        switch (step.status) {
          case 'completed':
            icon = '✓';
            color = 'green';
            break;
          case 'active':
            icon = '●';
            color = 'cyan';
            break;
          case 'error':
            icon = '✕';
            color = 'red';
            break;
          case 'pending':
          default:
            icon = '○';
            color = 'gray';
            break;
        }

        const isActive = index === currentStep;

        return (
          <Box key={index}>
            <Text color={color}>{icon} </Text>
            <Text bold={isActive} color={isActive ? 'white' : 'gray'}>
              {step.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// =============================================================================
// Loading Component
// =============================================================================

interface LoadingProps {
  /** Loading message */
  message?: string;
  /** Show spinner */
  showSpinner?: boolean;
}

/**
 * Combined loading indicator with spinner and message.
 */
export function Loading({
  message = 'Loading...',
  showSpinner = true,
}: LoadingProps): React.ReactElement {
  return (
    <Box>
      {showSpinner && <Spinner label={message} />}
      {!showSpinner && <Text color="gray">{message}</Text>}
    </Box>
  );
}

export default { Spinner, ProgressBar, StepProgress, Loading };
