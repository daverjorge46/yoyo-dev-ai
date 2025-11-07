"""
HistoryDetailScreen for Yoyo Dev TUI v3.

Detailed history entry view with action details and context.
"""

from textual.screen import Screen
from textual.containers import Container, Vertical, ScrollableContainer
from textual.widgets import Static, Label
from textual.binding import Binding
from rich.text import Text
from rich.table import Table
from datetime import datetime
from typing import Optional

from ..models import HistoryEntry, ActionType, EventType, Event


class HistoryDetailScreen(Screen):
    """
    Detailed history entry screen with full information.

    Layout:
    ┌─────────────────────────────────────────────────────────┐
    │ ✓ SPEC: Created spec: user-authentication                │
    │ Oct 29, 2025 at 2:30 PM                                  │
    ├─────────────────────────────────────────────────────────┤
    │ Details:                                                 │
    │                                                          │
    │ Specification created with 5 tasks:                      │
    │ - Task 1: Setup auth service                            │
    │ - Task 2: Add login UI                                  │
    │ - Task 3: Add logout                                    │
    │ - Task 4: Write tests                                   │
    │ - Task 5: Deploy                                        │
    └─────────────────────────────────────────────────────────┘

    Keyboard Shortcuts:
    - esc: Back to main dashboard
    - c: Copy details to clipboard
    - r: Refresh
    """

    BINDINGS = [
        Binding("escape", "back", "Back"),
        Binding("c", "copy", "Copy"),
        Binding("r", "refresh", "Refresh"),
    ]

    CSS = """
    HistoryDetailScreen {
        layout: vertical;
    }

    #history-header {
        height: 3;
        background: $panel;
        border: solid $primary;
        padding: 1;
    }

    #history-content {
        height: 1fr;
        padding: 1;
    }

    .status-success {
        color: $success;
    }

    .status-failure {
        color: $error;
    }
    """

    # Action type icons
    ACTION_ICONS = {
        ActionType.SPEC: "📝",
        ActionType.TASK: "✓",
        ActionType.GIT: "🔀",
        ActionType.FIX: "🔧",
        ActionType.COMMAND: "⚡",
    }

    def __init__(
        self,
        entry: HistoryEntry,
        data_manager,
        event_bus,
        **kwargs
    ):
        """
        Initialize HistoryDetailScreen.

        Args:
            entry: HistoryEntry object to display
            data_manager: DataManager instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)

        # Store dependencies
        self.entry = entry
        self.data_manager = data_manager
        self.event_bus = event_bus

        # Track event subscriptions for cleanup
        self._subscriptions = []

        # Widget references
        self._header_widget = None
        self._content_widget = None

    def compose(self):
        """Compose the history detail layout."""
        # Header with action type, description, timestamp
        self._header_widget = Static("", id="history-header")
        yield self._header_widget

        # Scrollable content with details
        with ScrollableContainer(id="history-content"):
            self._content_widget = Static("")
            yield self._content_widget

    def on_mount(self) -> None:
        """Called when screen is mounted."""
        # Subscribe to events (store reference for cleanup)
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        # Initial display
        self._update_display()

    def on_unmount(self) -> None:
        """Called when screen is unmounted."""
        # Unsubscribe all event handlers to prevent memory leaks
        for event_type, handler in self._subscriptions:
            self.event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    # ========================================================================
    # Event Handlers
    # ========================================================================

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self.refresh_display()

    # ========================================================================
    # Actions (Keyboard Shortcuts)
    # ========================================================================

    def action_back(self) -> None:
        """Go back to main dashboard."""
        self.app.pop_screen()

    def action_copy(self) -> None:
        """Copy details to clipboard."""
        # TODO: Implement clipboard copy
        self.notify("Copy to clipboard (coming soon)", severity="information")

    def copy_details(self) -> None:
        """Alias for action_copy."""
        self.action_copy()

    def action_refresh(self) -> None:
        """Refresh history data."""
        self.refresh_display()
        self.notify("History refreshed", severity="information")

    # ========================================================================
    # Display Methods
    # ========================================================================

    def _update_display(self) -> None:
        """Update the display with current history entry."""
        # Update header
        if self._header_widget:
            header_content = self._build_header()
            self._header_widget.update(header_content)

        # Update content
        if self._content_widget:
            content = self._build_content()
            self._content_widget.update(content)

    def _build_header(self) -> Text:
        """
        Build header content with action type, success indicator, description, timestamp.

        Returns:
            Rich Text object with formatted header
        """
        text = Text()

        # Success/failure indicator
        if self.entry.success:
            text.append("✓ ", style="bold green")
        else:
            text.append("✗ ", style="bold red")

        # Action type icon and name
        icon = self.ACTION_ICONS.get(self.entry.action_type, "")
        if icon:
            text.append(f"{icon} ", style="")

        text.append(self.entry.action_type.value.upper(), style="bold cyan")
        text.append(": ", style="bold")

        # Description
        text.append(self.entry.description, style="")
        text.append("\n")

        # Timestamp
        formatted_time = self._format_timestamp(self.entry.timestamp)
        text.append(formatted_time, style="dim")

        return text

    def _build_content(self) -> Text:
        """
        Build content with full details.

        Returns:
            Rich Text object with formatted content
        """
        text = Text()

        # Details section
        text.append("\n")
        text.append("Details:\n", style="bold underline")
        text.append("\n")

        if self.entry.details:
            # Display full details
            text.append(self.entry.details, style="")
        else:
            text.append("  No additional details\n", style="dim italic")

        return text

    def _format_timestamp(self, timestamp: datetime) -> str:
        """
        Format timestamp in human-readable format.

        Args:
            timestamp: datetime object

        Returns:
            Formatted timestamp string (e.g., "Oct 29, 2025 at 2:30 PM")
        """
        return timestamp.strftime("%b %d, %Y at %I:%M %p")

    def _get_status_style(self, success: bool) -> str:
        """Get style for success/failure status."""
        return "bold green" if success else "bold red"

    def refresh_display(self) -> None:
        """Refresh display with updated data (public API)."""
        # History entries are typically immutable, but we update display anyway
        self._update_display()
