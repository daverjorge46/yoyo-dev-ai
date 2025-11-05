"""
FocusManager - Track and manage active pane focus for split view

This module provides focus management functionality for split view panes,
including tracking the active pane, toggling between panes, and rendering
visual indicators (borders) to show which pane is currently active.
"""

from typing import Optional, List, Any


class FocusManager:
    """
    Manages focus state and visual indicators for split view panes.

    Tracks which pane is currently active and provides methods to switch
    focus between panes and render appropriate visual indicators.
    """

    def __init__(self):
        """Initialize the FocusManager with no active pane."""
        self.active_pane: Optional[Any] = None
        self.panes: List[Any] = []

    def set_active(self, pane: Optional[Any]) -> None:
        """
        Mark a pane as the active (focused) pane.

        Args:
            pane: The pane to mark as active, or None to clear active state
        """
        self.active_pane = pane

    def get_active(self) -> Optional[Any]:
        """
        Get the currently active pane.

        Returns:
            The active pane, or None if no pane is active
        """
        return self.active_pane

    def toggle(self) -> None:
        """
        Switch focus to the other pane.

        If there are exactly 2 panes, toggles between them.
        With 0 or 1 panes, does nothing or stays on the same pane.
        Handles edge cases gracefully (e.g., active pane not in list).
        """
        if len(self.panes) == 0:
            # No panes to toggle
            return

        if len(self.panes) == 1:
            # Only one pane, keep it active
            return

        # For 2 panes, toggle between them
        if len(self.panes) == 2:
            try:
                current_idx = self.panes.index(self.active_pane)
                next_idx = (current_idx + 1) % 2
                self.active_pane = self.panes[next_idx]
            except (ValueError, TypeError):
                # Active pane not in list or None, default to first pane
                if self.panes:
                    self.active_pane = self.panes[0]

    def render_indicators(self, term_controller: Any, border_style: Any) -> None:
        """
        Draw borders around panes with appropriate colors based on focus state.

        Active pane gets the active color (bright cyan by default),
        inactive panes get the inactive color (dim white by default).

        Args:
            term_controller: Terminal controller with draw_border method
            border_style: Border style configuration with active/inactive colors
        """
        for pane in self.panes:
            is_active = (pane == self.active_pane)
            color = border_style.active if is_active else border_style.inactive
            term_controller.draw_border(pane.bounds, color)
