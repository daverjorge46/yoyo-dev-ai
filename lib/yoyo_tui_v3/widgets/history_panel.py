"""
HistoryPanel widget for Yoyo Dev TUI.

Displays recent action history with timestamps and status indicators.
Enhanced with scroll support and click handlers.
"""

from datetime import datetime
from textual.widget import Widget
from textual.containers import VerticalScroll
from textual.widgets import Static, Label
from textual.message import Message
from textual.events import Click
from rich.text import Text
from typing import List, Optional

from ..models import EventType, Event, HistoryEntry, ActionType
from ..utils.panel_icons import PanelIcons
from ..utils.headers import render_header, render_footer_link


class HistoryPanel(Widget):
    """
    History panel showing recent actions and events.

    Displays last 10 history entries with:
    - Action type icon
    - Description
    - Relative timestamp
    - Success/failure indicator

    Features:
    - Scrollable content area
    - Click handlers for history entries
    - Enhanced visual styling
    """

    # Custom message for entry clicks
    class EntryClicked(Message):
        """Message sent when a history entry is clicked."""
        def __init__(self, entry_id: str):
            self.entry_id = entry_id
            super().__init__()

    class ViewAllClicked(Message):
        """Message sent when View All History is clicked."""
        def __init__(self):
            super().__init__()

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
        self._history_entries: List[HistoryEntry] = []
        self._subscriptions = []  # Track handler references
        self._entry_positions = {}  # Track entry positions for click detection

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events and track subscriptions
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        self._subscriptions.append((EventType.TASK_COMPLETED, self._on_task_completed))
        self.event_bus.subscribe(EventType.TASK_COMPLETED, self._on_task_completed)

        self._subscriptions.append((EventType.SPEC_CREATED, self._on_spec_created))
        self.event_bus.subscribe(EventType.SPEC_CREATED, self._on_spec_created)

        self._subscriptions.append((EventType.FIX_CREATED, self._on_fix_created))
        self.event_bus.subscribe(EventType.FIX_CREATED, self._on_fix_created)

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

    def on_click(self, event: Click) -> None:
        """
        Handle click events for entry selection and navigation.

        Clicking anywhere in the panel focuses it.
        Future: detect specific entry clicks for navigation.
        """
        self.add_class("panel-focused")

        # For now, simple click handling
        # More sophisticated click detection would require tracking render positions

    def render(self) -> Text:
        """
        Render the history panel with enhanced styling.

        Returns:
            Rich Text object with formatted history
        """
        text = Text()

        # Enhanced header with box-drawing characters
        text.append_text(render_header("RECENT HISTORY", 40))
        text.append("\n")

        if not self._history_entries:
            text.append("  No recent activity\n\n", style="dim")
            text.append("  Run ", style="dim")
            text.append("/create-new", style="bold yellow")
            text.append(" to start a new feature\n", style="dim")
            return text

        # Render each history entry with enhanced styling
        for entry in self._history_entries:
            # Get status icon using PanelIcons
            status_icon = self.get_entry_status_icon(entry.success)
            status_style = "green" if entry.success else "red bold"

            # Get action type icon
            action_icon = self.get_action_type_icon(entry.action_type)

            # Format timestamp
            timestamp_str = self.format_relative_time(entry.timestamp)

            # Build entry with improved layout
            text.append(f"  {status_icon} ", style=f"bold {status_style}")
            text.append(f"{action_icon} ", style="bold")
            text.append(f"{entry.description}", style=status_style)
            text.append(f"  {PanelIcons.LINK} ", style="dim")
            text.append(f"{timestamp_str}\n", style="dim italic")

        # Separator before footer
        text.append("\n")
        text.append("─" * 38 + "\n\n", style="dim")

        # View all link with enhanced styling
        text.append_text(render_footer_link("View All History", "→"))

        return text

    def get_entry_status_icon(self, success: bool) -> str:
        """
        Get status icon for history entry.

        Args:
            success: Whether entry was successful

        Returns:
            Status icon string
        """
        return PanelIcons.COMPLETED if success else PanelIcons.ERROR

    def get_action_type_icon(self, action_type: ActionType) -> str:
        """
        Get icon for action type using PanelIcons.

        Args:
            action_type: Type of action

        Returns:
            Action type icon string
        """
        icon_map = {
            ActionType.TASK: PanelIcons.TASK,
            ActionType.SPEC: PanelIcons.SPEC,
            ActionType.GIT: PanelIcons.GIT,
            ActionType.FIX: PanelIcons.FIX,
            ActionType.COMMAND: PanelIcons.COMMAND,
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
