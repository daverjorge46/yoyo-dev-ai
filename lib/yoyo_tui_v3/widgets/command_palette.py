"""
CommandPalettePanel widget for Yoyo Dev TUI.

Displays intelligent command suggestions and detected errors.
Enhanced with scroll support and click-to-copy functionality.
"""

from textual.widget import Widget
from textual.containers import VerticalScroll
from textual.widgets import Static
from textual.message import Message
from textual.events import Click
from rich.text import Text
from typing import List, Optional

from ..models import EventType, Event, CommandSuggestion, DetectedError
from ..utils.panel_icons import PanelIcons
from ..utils.headers import render_header, render_subheader
from ..utils.clipboard import copy_to_clipboard


class CommandPalettePanel(Widget):
    """
    Panel showing intelligent command suggestions and errors.

    Displays:
    - Suggested actions based on project state
    - Recent detected errors with fixes
    - Command search hint

    Features:
    - Scrollable content area
    - Click-to-copy commands
    - Enhanced visual styling
    """

    # Custom message for command copy
    class CommandCopied(Message):
        """Message sent when a command is copied to clipboard."""
        def __init__(self, command: str):
            self.command = command
            super().__init__()

    class CommandClicked(Message):
        """Message sent when a command is clicked."""
        def __init__(self, command: str):
            self.command = command
            super().__init__()

    def __init__(self, data_manager, event_bus, command_suggester=None, error_detector=None, **kwargs):
        """
        Initialize CommandPalettePanel.

        Args:
            data_manager: DataManager instance
            event_bus: EventBus instance
            command_suggester: IntelligentCommandSuggester instance (optional)
            error_detector: ErrorDetector instance (optional)
            **kwargs: Additional Widget parameters (id, classes, etc.)
        """
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus
        self.command_suggester = command_suggester
        self.error_detector = error_detector

        self._suggestions: List[CommandSuggestion] = []
        self._errors: List[DetectedError] = []
        self._subscriptions = []  # Track handler references
        self._command_positions = {}  # Track command positions for click detection

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events and track subscriptions
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        self._subscriptions.append((EventType.COMMAND_SUGGESTIONS_UPDATED, self._on_suggestions_updated))
        self.event_bus.subscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, self._on_suggestions_updated)

        self._subscriptions.append((EventType.ERROR_DETECTED, self._on_error_detected))
        self.event_bus.subscribe(EventType.ERROR_DETECTED, self._on_error_detected)

        # Initial data load
        self._update_display()

    def on_unmount(self) -> None:
        """Called when widget is unmounted. Clean up subscriptions."""
        # Unsubscribe all handlers
        for event_type, handler in self._subscriptions:
            self.event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self._update_display()

    def _on_suggestions_updated(self, event: Event) -> None:
        """Handle COMMAND_SUGGESTIONS_UPDATED events."""
        self._update_display()

    def _on_error_detected(self, event: Event) -> None:
        """Handle ERROR_DETECTED events."""
        self._update_display()

    def _update_display(self) -> None:
        """Update display with latest data."""
        try:
            # Fetch command suggestions
            self._suggestions = self.data_manager.get_command_suggestions() or []

            # Fetch recent errors
            self._errors = self.data_manager.get_recent_errors() or []

        except Exception as e:
            # Handle errors gracefully
            self._suggestions = []
            self._errors = []

        # Trigger re-render
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def get_severity_icon(self, severity: str) -> str:
        """
        Get icon for error severity.

        Args:
            severity: Severity level (low, medium, high, critical)

        Returns:
            Icon string for severity
        """
        return PanelIcons.get_severity_icon(severity)

    def get_severity_style(self, severity: str) -> str:
        """
        Get style for error severity.

        Args:
            severity: Severity level

        Returns:
            Rich style string
        """
        return PanelIcons.get_severity_style(severity)

    def _copy_command(self, command: str) -> bool:
        """
        Copy a command to the clipboard.

        Args:
            command: Command string to copy

        Returns:
            True if copy succeeded
        """
        success = copy_to_clipboard(command)
        if success:
            self.post_message(self.CommandCopied(command))
        return success

    def on_click(self, event: Click) -> None:
        """
        Handle click events for command copying.

        Clicking anywhere in the panel focuses it.
        Future: detect specific command clicks for copying.
        """
        self.add_class("panel-focused")

        # Try to copy the first suggested command on any click (simple implementation)
        # More sophisticated click detection would require tracking render positions
        if self._suggestions:
            first_command = self._suggestions[0].command
            if self._copy_command(first_command):
                # Notify the app about the copy
                self.app.notify(f"Copied: {first_command}", severity="information", timeout=2)

    def render(self) -> Text:
        """
        Render the command palette panel with enhanced styling.

        Returns:
            Rich Text object with panel content
        """
        text = Text()

        # Enhanced header with box-drawing characters
        text.append_text(render_header("COMMAND PALETTE", 40))
        text.append("\n")

        # Suggested Actions section
        text.append_text(render_subheader("Suggested Actions", 38))
        text.append("\n")

        if self._suggestions:
            for suggestion in self._suggestions[:5]:  # Show top 5
                # Command with copy hint
                text.append(f"  {suggestion.icon} ", style="bold")
                text.append(f"{suggestion.command}", style="bold green")
                text.append(" [click to copy]\n", style="dim italic")
                text.append(f"    {PanelIcons.LINK} {suggestion.reason}\n\n", style="dim")
        else:
            text.append("  No suggestions available.\n\n", style="dim")

        # Recent Errors section
        text.append_text(render_subheader("Recent Errors", 38))
        text.append("\n")

        if self._errors:
            for error in self._errors[:3]:  # Show top 3
                severity_icon = self.get_severity_icon(error.severity)
                severity_style = self.get_severity_style(error.severity)

                text.append(f"  {severity_icon} ", style="bold")
                text.append(f"{error.message}\n", style=severity_style)
                text.append(f"    {PanelIcons.LINK} {error.suggested_fix}\n\n", style="yellow")
        else:
            text.append(f"  {PanelIcons.COMPLETED} No errors detected.\n\n", style="dim green")

        # Search hint footer
        text.append("─" * 38 + "\n\n", style="dim")
        text.append("  [", style="dim")
        text.append(" / ", style="bold cyan")
        text.append("Search Commands]\n", style="dim")

        return text
