"""
Layout Manager for Split View

Handles pane dimension calculations, split ratios, minimum size validation,
and dynamic resize operations for the split view interface.
"""

import os
from dataclasses import dataclass
from typing import Tuple


@dataclass
class PaneBounds:
    """Defines rectangular area for a pane"""
    x: int        # Left column (0-indexed)
    y: int        # Top row (0-indexed)
    width: int    # Width in columns
    height: int   # Height in rows


class LayoutManager:
    """
    Manages layout calculations for split view panes.

    Provides methods to:
    - Calculate pane dimensions based on split ratio
    - Validate minimum terminal size requirements
    - Dynamically resize panes
    - Handle edge cases for terminal dimensions
    """

    # Minimum terminal size requirement (standard terminal is 80x24)
    MIN_WIDTH = 80
    MIN_HEIGHT = 24

    # Minimum pane width to ensure usability
    MIN_PANE_WIDTH = 20

    # Border width between panes
    BORDER_WIDTH = 1

    def calculate_split(
        self,
        width: int,
        height: int,
        ratio: float
    ) -> Tuple[PaneBounds, PaneBounds]:
        """
        Calculate bounds for left and right panes based on split ratio.

        Args:
            width: Terminal width in columns
            height: Terminal height in rows
            ratio: Fraction of width for left pane (0.1-0.9)

        Returns:
            Tuple of (left_bounds, right_bounds)

        Raises:
            ValueError: If terminal is too small or ratio is invalid
        """
        # Validate ratio range
        if ratio < 0.1 or ratio > 0.9:
            raise ValueError("Ratio must be between 0.1 and 0.9")

        # Validate dimensions are positive
        if width <= 0 or height <= 0:
            raise ValueError("Terminal dimensions must be positive")

        # Validate minimum terminal size
        if width < self.MIN_WIDTH or height < self.MIN_HEIGHT:
            raise ValueError(
                f"Terminal too small. Minimum {self.MIN_WIDTH}x{self.MIN_HEIGHT}, "
                f"current: {width}x{height}"
            )

        # Calculate split point (where left pane ends)
        split_col = int(width * ratio)

        # Left pane (Claude) - goes from 0 to split_col-1
        left = PaneBounds(
            x=0,
            y=0,
            width=split_col,
            height=height
        )

        # Right pane (TUI) - starts at split_col and goes to end
        # (the visual border is drawn at the boundary, not taking space)
        right = PaneBounds(
            x=split_col,
            y=0,
            width=width - split_col,
            height=height
        )

        return left, right

    def resize_pane(
        self,
        left_pane: PaneBounds,
        right_pane: PaneBounds,
        delta: int
    ) -> Tuple[PaneBounds, PaneBounds]:
        """
        Adjust pane widths by delta columns.

        Positive delta increases left pane width (decreases right).
        Negative delta decreases left pane width (increases right).

        Args:
            left_pane: Current left pane bounds
            right_pane: Current right pane bounds
            delta: Columns to add to left pane (can be negative)

        Returns:
            Tuple of (new_left_bounds, new_right_bounds)
        """
        # Calculate total available width (excluding border)
        total_width = left_pane.width + right_pane.width

        # Calculate new widths
        new_left_width = left_pane.width + delta
        new_right_width = right_pane.width - delta

        # Clamp to minimum pane widths
        if new_left_width < self.MIN_PANE_WIDTH:
            new_left_width = self.MIN_PANE_WIDTH
            new_right_width = total_width - self.MIN_PANE_WIDTH

        if new_right_width < self.MIN_PANE_WIDTH:
            new_right_width = self.MIN_PANE_WIDTH
            new_left_width = total_width - self.MIN_PANE_WIDTH

        # Create new bounds
        new_left = PaneBounds(
            x=left_pane.x,
            y=left_pane.y,
            width=new_left_width,
            height=left_pane.height
        )

        # Right pane x position adjusts based on new left width
        new_right = PaneBounds(
            x=new_left_width,
            y=right_pane.y,
            width=new_right_width,
            height=right_pane.height
        )

        return new_left, new_right

    def validate_minimum_size(self) -> bool:
        """
        Check if current terminal meets minimum size requirements.

        Returns:
            True if terminal is large enough, False otherwise
        """
        try:
            width, height = os.get_terminal_size()
            return width >= self.MIN_WIDTH and height >= self.MIN_HEIGHT
        except OSError:
            # If we can't get terminal size, assume it's not valid
            return False
