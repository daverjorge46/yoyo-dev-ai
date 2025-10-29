"""
HistoryPanel widget for Yoyo Dev TUI.

Displays recent action history with timestamps and status indicators.
"""

from datetime import datetime
from textual.widget import Widget
from textual.containers import VerticalScroll
from textual.widgets import Static, Label
from rich.text import Text

from ..models import EventType, Event, HistoryEntry, ActionType


class HistoryPanel(Widget):
    """
    History panel showing recent actions and events.

    Displays last 10 history entries with:
    - Action type icon
    - Description
    - Relative timestamp
    - Success/failure indicator
    """

    def __init__(self, data_manager, event_bus, **kwargs):
        """
        Initialize HistoryPanel.

        Args:
            data_manager: DataManager instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus

        self.title = "RECENT HISTORY"
        self._history_entries = []

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)
        self.event_bus.subscribe(EventType.TASK_COMPLETED, self._on_task_completed)
        self.event_bus.subscribe(EventType.SPEC_CREATED, self._on_spec_created)
        self.event_bus.subscribe(EventType.FIX_CREATED, self._on_fix_created)

        # Initial data load
        self._update_display()

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self._update_display()

    def _on_task_completed(self, event: Event) -> None:
        """Handle TASK_COMPLETED events."""
        self._update_display()

    def _on_spec_created(self, event: Event) -> None:
        """Handle SPEC_CREATED events."""
        self._update_display()

    def _on_fix_created(self, event: Event) -> None:
        """Handle FIX_CREATED events."""
        self._update_display()

    def _update_display(self) -> None:
        """Update display with latest history."""
        try:
            # Fetch recent history (last 10 entries)
            self._history_entries = self.data_manager.get_recent_history(count=10)

            # Trigger re-render
            self.refresh()

        except Exception as e:
            # Handle errors gracefully
            self._history_entries = []

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def render(self) -> Text:
        """
        Render the history panel.

        Returns:
            Rich Text object with formatted history
        """
        text = Text()

        # Header
        text.append(f"{self.title}\n\n", style="bold cyan")

        if not self._history_entries:
            text.append("No recent activity\n", style="dim")
            text.append("\nRun /create-new to start a new feature", style="italic yellow")
            return text

        # Render each history entry
        for entry in self._history_entries:
            # Get status icon
            status_icon = self.get_entry_status_icon(entry.success)

            # Get action type icon
            action_icon = self.get_action_type_icon(entry.action_type)

            # Format timestamp
            timestamp_str = self.format_relative_time(entry.timestamp)

            # Build entry line
            entry_line = f"{status_icon} {action_icon} {entry.description}"

            # Add with appropriate color
            if entry.success:
                text.append(entry_line, style="green")
            else:
                text.append(entry_line, style="red bold")

            # Add timestamp
            text.append(f"  [{timestamp_str}]\n", style="dim")

        # View all link
        text.append("\n[View All History]", style="italic cyan underline")

        return text

    def get_entry_status_icon(self, success: bool) -> str:
        """
        Get status icon for history entry.

        Args:
            success: Whether entry was successful

        Returns:
            Status icon string
        """
        return "✓" if success else "✗"

    def get_action_type_icon(self, action_type: ActionType) -> str:
        """
        Get icon for action type.

        Args:
            action_type: Type of action

        Returns:
            Action type icon string
        """
        icon_map = {
            ActionType.TASK: "📋",
            ActionType.SPEC: "⚡",
            ActionType.GIT: "🔀",
            ActionType.FIX: "🐛",
            ActionType.COMMAND: "▶",
        }
        return icon_map.get(action_type, "•")

    def format_relative_time(self, timestamp: datetime) -> str:
        """
        Format timestamp as relative time.

        Args:
            timestamp: Timestamp to format

        Returns:
            Formatted time string (e.g., "2 min ago")
        """
        now = datetime.now()
        diff = now - timestamp

        seconds = int(diff.total_seconds())

        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = seconds // 60
            return f"{minutes} min ago"
        elif seconds < 86400:
            hours = seconds // 3600
            return f"{hours} hr ago"
        else:
            days = seconds // 86400
            return f"{days} day{'s' if days != 1 else ''} ago"

    def show_full_history(self) -> None:
        """Navigate to full history screen."""
        # This would be implemented by the screen/app
        # Placeholder for navigation action
        pass

    def show_entry_detail(self, entry: HistoryEntry) -> None:
        """
        Show details for a history entry.

        Args:
            entry: History entry to show details for
        """
        # This would be implemented by the screen/app
        # Placeholder for detail view action
        pass
