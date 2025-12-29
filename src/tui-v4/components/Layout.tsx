/**
 * Layout Component
 *
 * Two-column responsive layout system with:
 * - 40/60 split in wide terminals (>= 100 cols)
 * - Stacked layout in narrow terminals (< 100 cols)
 * - Focus border styling
 * - Dynamic panel sizing
 */

import React from 'react';
import { Box } from 'ink';
import { borders, layout } from '../theme/styles.js';

export interface LayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  focusedPanel: 'left' | 'right';
  terminalWidth: number;
}

export const Layout: React.FC<LayoutProps> = ({
  leftPanel,
  rightPanel,
  focusedPanel,
  terminalWidth,
}) => {
  // Determine if we should use two-column or stacked layout
  const isTwoColumn = terminalWidth >= layout.minWidthTwoColumn;

  // Calculate panel widths
  const leftWidth = isTwoColumn
    ? Math.floor(terminalWidth * layout.leftPanelWidth)
    : terminalWidth;

  const rightWidth = isTwoColumn
    ? Math.floor(terminalWidth * layout.rightPanelWidth)
    : terminalWidth;

  // Determine border styles based on focus
  const leftBorder = focusedPanel === 'left' ? borders.focused : borders.default;
  const rightBorder = focusedPanel === 'right' ? borders.focused : borders.default;

  if (isTwoColumn) {
    // Two-column layout for wide terminals
    return (
      <Box flexDirection="row" width="100%">
        {/* Left Panel (40%) */}
        <Box
          width={leftWidth}
          flexDirection="column"
          borderStyle={leftBorder.borderStyle}
          borderColor={leftBorder.borderColor}
          paddingX={1}
        >
          {leftPanel}
        </Box>

        {/* Right Panel (60%) */}
        <Box
          width={rightWidth}
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
        width={leftWidth}
        flexDirection="column"
        borderStyle={leftBorder.borderStyle}
        borderColor={leftBorder.borderColor}
        paddingX={1}
        marginBottom={1}
      >
        {leftPanel}
      </Box>

      {/* Right Panel (full width) */}
      <Box
        width={rightWidth}
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
