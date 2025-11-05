"""
History Screen for Yoyo Dev TUI.

Displays detailed command and action history.
"""

from textual.screen import Screen
from textual.widgets import Static
from textual.containers import Container, ScrollableContainer
from textual.binding import Binding
from rich.text import Text


class HistoryScreen(Screen):
    """
    History screen showing detailed command and action history.

    Press ESC or q to close.
    """

    BINDINGS = [
        Binding("escape", "close", "Close"),
        Binding("q", "close", "Close"),
        Binding("r", "refresh", "Refresh"),
    ]

    CSS = """
    HistoryScreen {
        align: center middle;
    }

    #history-container {
        width: 100;
        height: 90%;
        background: $panel;
        border: heavy $primary;
        padding: 2;
    }

    #history-content {
        height: auto;
    }
    """

    def __init__(self, data_manager, event_bus, **kwargs):
        """Initialize HistoryScreen."""
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus

    def compose(self):
        """Compose the history screen layout."""
        with Container(id="history-container"):
            with ScrollableContainer(id="history-scroll"):
                yield Static(self._build_history_content(), id="history-content")

    def _build_history_content(self) -> Text:
        """
        Build the history content.

        Returns:
            Rich Text object with history content
        """
        content = Text()

        # Header
        content.append("╔════════════════════════════════════════════════════════════════════════════════╗\n", style="bold cyan")
        content.append("║                       ", style="bold cyan")
        content.append("COMMAND HISTORY", style="bold white")
        content.append("║\n", style="bold cyan")
        content.append("╚════════════════════════════════════════════════════════════════════════════════╝\n\n", style="bold cyan")

        # Get history items
        history_items = self.data_manager.get_recent_history(count=30) or []

        if not history_items:
            content.append("  No history items found.\n\n", style="dim")
            content.append("  History will appear here as you use Yoyo Dev commands.\n", style="dim")
        else:
            content.append("📜 RECENT ACTIONS\n", style="bold yellow")
            content.append("─" * 80 + "\n\n", style="dim")

            for item in history_items:
                # Timestamp
                timestamp = item.timestamp if hasattr(item, 'timestamp') else "Unknown"
                content.append(f"  [{timestamp}] ", style="dim")

                # Action type icon and name
                action_type = item.action_type if hasattr(item, 'action_type') else "command"
                icon = self._get_action_icon(action_type)
                content.append(f"{icon} ", style="bold")

                # Command/action name
                command = item.command if hasattr(item, 'command') else str(item)
                content.append(f"{command}\n", style="bold cyan")

                # Description if available
                if hasattr(item, 'description') and item.description:
                    content.append(f"     {item.description}\n", style="dim")

                # Status if available
                if hasattr(item, 'status'):
                    status_style = "green" if item.status == "success" else "red" if item.status == "error" else "yellow"
                    content.append(f"     Status: ", style="dim")
                    content.append(f"{item.status}\n", style=status_style)

                content.append("\n")

        # Footer
        content.append("─" * 80 + "\n", style="dim")
        content.append("Press ", style="dim")
        content.append("r", style="bold cyan")
        content.append(" to refresh • ", style="dim")
        content.append("ESC", style="bold cyan")
        content.append(" or ", style="dim")
        content.append("q", style="bold cyan")
        content.append(" to close\n", style="dim")

        return content

    def _get_action_icon(self, action_type: str) -> str:
        """Get icon for action type."""
        icon_map = {
            "command": "⚡",
            "spec_created": "📋",
            "fix_created": "🔧",
            "task_completed": "✓",
            "execution_started": "▶️",
            "execution_completed": "✅",
            "error": "❌",
            "git": "🔀",
        }
        return icon_map.get(action_type, "•")

    def action_close(self) -> None:
        """Close the history screen."""
        self.app.pop_screen()

    def action_refresh(self) -> None:
        """Refresh history data."""
        # Update the content widget
        content_widget = self.query_one("#history-content", Static)
        content_widget.update(self._build_history_content())
        self.notify("History refreshed", severity="information")
