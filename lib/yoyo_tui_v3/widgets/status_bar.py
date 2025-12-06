"""
StatusBar widget for Yoyo Dev TUI.

Displays project name, git branch, and activity status.
"""

from textual.widget import Widget
from textual.reactive import reactive
from rich.text import Text

from ..models import EventType, Event

# Version constant (synced with VERSION file)
YOYO_VERSION = "3.1.1"


class StatusBar(Widget):
    """
    Top status bar showing project info and current status.

    Layout: [Project Name] | [Git Branch] | [Activity Status]
    """

    # Reactive properties
    activity_status: reactive[str] = reactive("idle")

    def __init__(self, data_manager, event_bus, **kwargs):
        """
        Initialize StatusBar.

        Args:
            data_manager: DataManager instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus

        self._project_name = ""
        self._git_branch = ""
        self._subscriptions = []  # Track handler references

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events and track subscriptions
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

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

    def _update_display(self) -> None:
        """Update display with latest data."""
        try:
            # Fetch project name
            self._project_name = self.data_manager.get_project_name() or "Yoyo Dev"

            # Fetch git status
            git_status = self.data_manager.get_git_status()
            if git_status:
                self._git_branch = git_status.current_branch

                # Update activity status based on git state
                if git_status.has_conflicts:
                    self.activity_status = "error"
                elif git_status.has_uncommitted_changes:
                    # Keep current status (don't override if actively working)
                    pass
        except Exception as e:
            # Handle errors gracefully
            self._project_name = self._project_name or "Yoyo Dev"
            self._git_branch = self._git_branch or "unknown"

        # Trigger re-render
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def set_activity_status(self, status: str) -> None:
        """
        Set activity status.

        Args:
            status: One of "idle", "active", "error"

        Raises:
            ValueError: If status is invalid
        """
        valid_statuses = ["idle", "active", "error"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")

        self.activity_status = status
        self.refresh()

    def get_activity_color(self) -> str:
        """
        Get color for current activity status.

        Returns:
            Color string for activity indicator
        """
        color_map = {
            "idle": "green",
            "active": "yellow",
            "error": "red"
        }
        return color_map.get(self.activity_status, "white")

    def render(self) -> Text:
        """
        Render the status bar.

        Returns:
            Rich Text object with status bar content
        """
        # Build status text
        text = Text()

        # Version
        text.append("🚀 ", style="bold")
        text.append(f"Yoyo Dev v{YOYO_VERSION}", style="bold green")

        text.append("  |  ")

        # Project name
        text.append("📦 ", style="bold")
        text.append(self._project_name, style="bold cyan")

        text.append("  |  ")

        # Git branch
        text.append("🔀 ", style="bold")
        text.append(self._git_branch, style="bold magenta")

        text.append("  |  ")

        # Activity status
        activity_color = self.get_activity_color()
        activity_icon = {
            "idle": "●",
            "active": "⚡",
            "error": "✗"
        }.get(self.activity_status, "●")

        text.append(f"{activity_icon} ", style=f"bold {activity_color}")
        text.append(self.activity_status.title(), style=f"{activity_color}")

        return text
