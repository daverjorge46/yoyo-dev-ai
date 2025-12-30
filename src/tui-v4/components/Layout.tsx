/**
 * Layout Component
 *
 * Flexible layout system supporting:
 * - Two-column layout: Tasks (40%) | Execution (60%)
 * - Three-column layout: Tasks (25%) | Chat (50%) | Execution (25%)
 * - Stacked layout for narrow terminals
 * - Focus border styling
 * - Dynamic panel sizing
 */

import React from 'react';
import { Box } from 'ink';
import { borders, layout } from '../theme/styles.js';

export type FocusablePanel = 'left' | 'center' | 'right';

export interface LayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  centerPanel?: React.ReactNode;
  focusedPanel: FocusablePanel;
  terminalWidth: number;
}

export const Layout: React.FC<LayoutProps> = ({
  leftPanel,
  rightPanel,
  centerPanel,
  focusedPanel,
  terminalWidth,
}) => {
  // Determine layout mode based on terminal width and presence of center panel
  const hasCenter = centerPanel !== undefined;
  const isThreeColumn = hasCenter && terminalWidth >= layout.minWidthThreeColumn;
  const isTwoColumn = !hasCenter && terminalWidth >= layout.minWidthTwoColumn;

  // Calculate panel widths for three-column layout
  const leftWidth3 = Math.floor(terminalWidth * layout.threeColumn.left);
  const centerWidth = Math.floor(terminalWidth * layout.threeColumn.center);
  const rightWidth3 = Math.floor(terminalWidth * layout.threeColumn.right);

  // Calculate panel widths for two-column layout
  const leftWidth2 = Math.floor(terminalWidth * layout.leftPanelWidth);
  const rightWidth2 = Math.floor(terminalWidth * layout.rightPanelWidth);

  // Determine border styles based on focus
  const getBorder = (panel: FocusablePanel) =>
    focusedPanel === panel ? borders.focused : borders.default;

  const leftBorder = getBorder('left');
  const centerBorder = getBorder('center');
  const rightBorder = getBorder('right');

  // Three-column layout for wide terminals with chat
  if (isThreeColumn) {
    return (
      <Box flexDirection="row" width="100%">
        {/* Left Panel - Tasks (25%) */}
        <Box
          width={leftWidth3}
          flexDirection="column"
          borderStyle={leftBorder.borderStyle}
          borderColor={leftBorder.borderColor}
          paddingX={1}
        >
          {leftPanel}
        </Box>

        {/* Center Panel - Chat (50%) */}
        <Box
          width={centerWidth}
          flexDirection="column"
          borderStyle={centerBorder.borderStyle}
          borderColor={centerBorder.borderColor}
          paddingX={1}
        >
          {centerPanel}
        </Box>

        {/* Right Panel - Execution (25%) */}
        <Box
          width={rightWidth3}
          flexDirection="column"
          borderStyle={rightBorder.borderStyle}
          borderColor={rightBorder.borderColor}
          paddingX={1}
        >
          {rightPanel}
        </Box>
      </Box>
    );
  }

  // Two-column layout for wide terminals without chat
  if (isTwoColumn) {
    return (
      <Box flexDirection="row" width="100%">
        {/* Left Panel (40%) */}
        <Box
          width={leftWidth2}
          flexDirection="column"
          borderStyle={leftBorder.borderStyle}
          borderColor={leftBorder.borderColor}
          paddingX={1}
        >
          {leftPanel}
        </Box>

        {/* Right Panel (60%) */}
        <Box
          width={rightWidth2}
          flexDirection="column"
          borderStyle={rightBorder.borderStyle}
          borderColor={rightBorder.borderColor}
          paddingX={1}
        >
          {rightPanel}
        </Box>
      </Box>
    );
  }

  // Stacked layout for narrow terminals
  return (
    <Box flexDirection="column" width="100%">
      {/* Left Panel (full width) */}
      <Box
        width={terminalWidth}
        flexDirection="column"
        borderStyle={leftBorder.borderStyle}
        borderColor={leftBorder.borderColor}
        paddingX={1}
        marginBottom={1}
      >
        {leftPanel}
      </Box>

      {/* Center Panel if present (full width) */}
      {hasCenter && (
        <Box
          width={terminalWidth}
          flexDirection="column"
          borderStyle={centerBorder.borderStyle}
          borderColor={centerBorder.borderColor}
          paddingX={1}
          marginBottom={1}
        >
          {centerPanel}
        </Box>
      )}

      {/* Right Panel (full width) */}
      <Box
        width={terminalWidth}
        flexDirection="column"
        borderStyle={rightBorder.borderStyle}
        borderColor={rightBorder.borderColor}
        paddingX={1}
      >
        {rightPanel}
      </Box>
    </Box>
  );
};
