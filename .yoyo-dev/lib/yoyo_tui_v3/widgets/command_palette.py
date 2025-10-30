"""
CommandPalettePanel widget for Yoyo Dev TUI.

Displays intelligent command suggestions and detected errors.
"""

from textual.widget import Widget
from rich.text import Text
from typing import List, Optional

from ..models import EventType, Event, CommandSuggestion, DetectedError


class CommandPalettePanel(Widget):
    """
    Panel showing intelligent command suggestions and errors.

    Displays:
    - Suggested actions based on project state
    - Recent detected errors with fixes
    - Command search hint
    """

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

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)
        self.event_bus.subscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, self._on_suggestions_updated)
        self.event_bus.subscribe(EventType.ERROR_DETECTED, self._on_error_detected)

        # Initial data load
        self._update_display()

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
        icon_map = {
            "critical": "🔴",
            "high": "⚠️",
            "medium": "⚡",
            "low": "ℹ️"
        }
        return icon_map.get(severity, "ℹ️")

    def render(self) -> Text:
        """
        Render the command palette panel.

        Returns:
            Rich Text object with panel content
        """
        text = Text()

        # Panel header
        text.append("COMMAND PALETTE\n", style="bold cyan")
        text.append("─" * 40 + "\n", style="dim")

        # Suggested Actions section
        if self._suggestions:
            text.append("\nSuggested Actions:\n", style="bold yellow")
            for suggestion in self._suggestions[:5]:  # Show top 5
                text.append(f"{suggestion.icon} ", style="bold")
                text.append(f"{suggestion.command}\n", style="bold green")
                text.append(f"  → {suggestion.reason}\n", style="dim")
        else:
            text.append("\nNo suggestions available.\n", style="dim")

        # Recent Errors section
        text.append("\n")
        if self._errors:
            text.append("Recent Errors:\n", style="bold red")
            for error in self._errors[:3]:  # Show top 3
                severity_icon = self.get_severity_icon(error.severity)
                text.append(f"{severity_icon} ", style="bold")
                text.append(f"{error.message}\n", style="red")
                text.append(f"  → {error.suggested_fix}\n", style="yellow")
        else:
            text.append("No errors detected. ✓\n", style="dim green")

        # Search hint
        text.append("\n" + "─" * 40 + "\n", style="dim")
        text.append("[", style="dim")
        text.append("Search Commands /", style="bold cyan")
        text.append("]\n", style="dim")

        return text
