"""
Terminal control module for ANSI/VT100 escape sequence management.

This module provides low-level terminal control functionality including:
- Alternate screen buffer management
- Cursor positioning and visibility
- Color control
- Border drawing with box-drawing characters

All operations use standard ANSI/VT100 escape sequences compatible with
modern terminal emulators (GNOME Terminal, Konsole, Alacritty, etc.).
"""

import sys
from dataclasses import dataclass
from typing import Optional


@dataclass
class PaneBounds:
    """
    Defines a rectangular area for a pane in the terminal.
    
    Attributes:
        x: Left column (0-indexed)
        y: Top row (0-indexed)
        width: Width in columns
        height: Height in rows
    """
    x: int
    y: int
    width: int
    height: int


class TerminalController:
    """
    Low-level terminal control using ANSI/VT100 escape sequences.
    
    This class provides methods to manipulate terminal state including
    screen buffers, cursor position/visibility, colors, and drawing
    borders with Unicode box-drawing characters.
    
    All coordinates are 0-indexed but converted to 1-indexed for ANSI
    escape sequences internally.
    """
    
    # ANSI Escape Sequences
    ESC = '\033'
    CSI = f'{ESC}['
    
    # Screen control
    ALT_SCREEN_ON = f'{CSI}?1049h'      # Enter alternate screen buffer
    ALT_SCREEN_OFF = f'{CSI}?1049l'     # Exit alternate screen buffer
    CLEAR_SCREEN = f'{CSI}2J'           # Clear entire screen
    
    # Cursor control
    HIDE_CURSOR = f'{CSI}?25l'          # Hide cursor
    SHOW_CURSOR = f'{CSI}?25h'          # Show cursor
    
    # Color codes (ANSI SGR parameters)
    COLORS = {
        'bright_cyan': f'{CSI}1;36m',   # Bold + Cyan
        'dim_white': f'{CSI}2;37m',     # Dim + White
        'reset': f'{CSI}0m'             # Reset all attributes
    }
    
    # Box-drawing characters (Unicode)
    BOX_CHARS = {
        'vertical': '│',
        'horizontal': '─',
        'top_left': '┌',
        'top_right': '┐',
        'bottom_left': '└',
        'bottom_right': '┘'
    }
    
    def enter_alt_screen(self) -> None:
        """
        Switch to alternate screen buffer.
        
        The alternate screen buffer provides a clean slate that doesn't
        affect the user's normal terminal scrollback. Essential for
        full-screen applications.
        """
        sys.stdout.write(self.ALT_SCREEN_ON)
        sys.stdout.flush()
    
    def exit_alt_screen(self) -> None:
        """
        Restore normal screen buffer.
        
        Returns to the primary screen buffer, restoring the user's
        previous terminal content and scrollback history.
        """
        sys.stdout.write(self.ALT_SCREEN_OFF)
        sys.stdout.flush()
    
    def clear_screen(self) -> None:
        """
        Clear the entire screen.
        
        Erases all content on the current screen without changing
        the cursor position.
        """
        sys.stdout.write(self.CLEAR_SCREEN)
        sys.stdout.flush()
    
    def move_cursor(self, row: int, col: int) -> None:
        """
        Move cursor to specified position.
        
        Args:
            row: Target row (0-indexed, converted to 1-indexed for ANSI)
            col: Target column (0-indexed, converted to 1-indexed for ANSI)
        
        Note:
            Negative coordinates are clamped to 1 (top-left corner).
            ANSI uses 1-indexed coordinates, so (0,0) becomes (1,1).
        """
        # Convert to 1-indexed and clamp to minimum of 1
        ansi_row = max(1, row + 1)
        ansi_col = max(1, col + 1)
        
        sys.stdout.write(f'{self.CSI}{ansi_row};{ansi_col}H')
        sys.stdout.flush()
    
    def hide_cursor(self) -> None:
        """
        Hide the cursor.
        
        Useful for full-screen applications where cursor visibility
        would be distracting.
        """
        sys.stdout.write(self.HIDE_CURSOR)
        sys.stdout.flush()
    
    def show_cursor(self) -> None:
        """
        Show the cursor.
        
        Restores cursor visibility. Should be called before exiting
        alternate screen to ensure cursor is visible in normal terminal.
        """
        sys.stdout.write(self.SHOW_CURSOR)
        sys.stdout.flush()
    
    def set_color(self, color: str) -> None:
        """
        Set foreground color using predefined color names.
        
        Args:
            color: Color name from COLORS dict ('bright_cyan', 'dim_white', 'reset')
        
        If an invalid color name is provided, no output is generated
        (fails silently for robustness).
        """
        if color in self.COLORS:
            sys.stdout.write(self.COLORS[color])
            sys.stdout.flush()
    
    def draw_border(self, bounds: PaneBounds, color: str) -> None:
        """
        Draw a border around the specified rectangular area.
        
        Uses Unicode box-drawing characters to create clean borders.
        The border is drawn using the specified color and reset to
        default color after completion.
        
        Args:
            bounds: Rectangular area to border
            color: Color name for the border
        
        Border layout:
            ┌─────────┐
            │         │
            │         │
            └─────────┘
        
        Note:
            For very small bounds (width < 2 or height < 2), the border
            may overlap or be malformed. Minimum recommended size is 3x3.
        """
        # Set border color
        self.set_color(color)
        
        # Calculate dimensions
        inner_width = max(0, bounds.width - 2)  # Width minus corners
        inner_height = max(0, bounds.height - 2)  # Height minus top/bottom
        
        # Draw top border
        self.move_cursor(bounds.y, bounds.x)
        sys.stdout.write(
            self.BOX_CHARS['top_left'] +
            self.BOX_CHARS['horizontal'] * inner_width +
            self.BOX_CHARS['top_right']
        )
        
        # Draw side borders
        for row_offset in range(1, bounds.height - 1):
            row = bounds.y + row_offset
            
            # Left border
            self.move_cursor(row, bounds.x)
            sys.stdout.write(self.BOX_CHARS['vertical'])
            
            # Right border
            self.move_cursor(row, bounds.x + bounds.width - 1)
            sys.stdout.write(self.BOX_CHARS['vertical'])
        
        # Draw bottom border
        self.move_cursor(bounds.y + bounds.height - 1, bounds.x)
        sys.stdout.write(
            self.BOX_CHARS['bottom_left'] +
            self.BOX_CHARS['horizontal'] * inner_width +
            self.BOX_CHARS['bottom_right']
        )
        
        # Reset color
        self.set_color('reset')
        sys.stdout.flush()


# Export main classes
__all__ = ['TerminalController', 'PaneBounds']
