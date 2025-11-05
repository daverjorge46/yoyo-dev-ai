"""
Tasks Screen for Yoyo Dev TUI.

Displays detailed view of active tasks.
"""

from textual.screen import Screen
from textual.widgets import Static
from textual.containers import Container, ScrollableContainer
from textual.binding import Binding
from rich.text import Text


class TasksScreen(Screen):
    """
    Tasks screen showing detailed view of active work.

    Press ESC or q to close.
    """

    BINDINGS = [
        Binding("escape", "close", "Close"),
        Binding("q", "close", "Close"),
        Binding("r", "refresh", "Refresh"),
    ]

    CSS = """
    TasksScreen {
        align: center middle;
    }

    #tasks-container {
        width: 100;
        height: 90%;
        background: $panel;
        border: heavy $primary;
        padding: 2;
    }

    #tasks-content {
        height: auto;
    }
    """

    def __init__(self, data_manager, event_bus, **kwargs):
        """Initialize TasksScreen."""
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus

    def compose(self):
        """Compose the tasks screen layout."""
        with Container(id="tasks-container"):
            with ScrollableContainer(id="tasks-scroll"):
                yield Static(self._build_tasks_content(), id="tasks-content")

    def _build_tasks_content(self) -> Text:
        """
        Build the tasks content.

        Returns:
            Rich Text object with tasks content
        """
        content = Text()

        # Header
        content.append("╔════════════════════════════════════════════════════════════════════════════════╗\n", style="bold cyan")
        content.append("║                          ", style="bold cyan")
        content.append("ACTIVE TASKS", style="bold white")
        content.append("║\n", style="bold cyan")
        content.append("╚════════════════════════════════════════════════════════════════════════════════╝\n\n", style="bold cyan")

        # Get active specs and fixes
        specs = self.data_manager.get_all_specs() or []
        fixes = self.data_manager.get_all_fixes() or []

        if not specs and not fixes:
            content.append("  No active work found.\n\n", style="dim")
            content.append("  💡 Use ", style="dim")
            content.append("/create-new", style="bold green")
            content.append(" to create a new feature or ", style="dim")
            content.append("/create-fix", style="bold green")
            content.append(" to fix a bug.\n", style="dim")
        else:
            # Active Specs
            if specs:
                content.append("📋 ACTIVE SPECS\n", style="bold yellow")
                content.append("─" * 80 + "\n\n", style="dim")

                for spec in specs:
                    content.append(f"  • {spec.name}\n", style="bold cyan")
                    content.append(f"    Status: ", style="dim")
                    content.append(f"{spec.status}\n", style="green" if spec.status == "active" else "yellow")
                    content.append(f"    Created: {spec.created_date}\n", style="dim")
                    if spec.total_tasks:
                        completed = spec.completed_tasks or 0
                        total = spec.total_tasks
                        progress = (completed / total * 100) if total > 0 else 0
                        content.append(f"    Progress: {completed}/{total} tasks ({progress:.0f}%)\n", style="dim")
                    content.append("\n")

            # Active Fixes
            if fixes:
                content.append("🔧 ACTIVE FIXES\n", style="bold yellow")
                content.append("─" * 80 + "\n\n", style="dim")

                for fix in fixes:
                    content.append(f"  • {fix.name}\n", style="bold magenta")
                    content.append(f"    Status: ", style="dim")
                    content.append(f"{fix.status}\n", style="green" if fix.status == "active" else "yellow")
                    content.append(f"    Created: {fix.created_date}\n", style="dim")
                    if fix.total_tasks:
                        completed = fix.completed_tasks or 0
                        total = fix.total_tasks
                        progress = (completed / total * 100) if total > 0 else 0
                        content.append(f"    Progress: {completed}/{total} tasks ({progress:.0f}%)\n", style="dim")
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

    def action_close(self) -> None:
        """Close the tasks screen."""
        self.app.pop_screen()

    def action_refresh(self) -> None:
        """Refresh tasks data."""
        # Update the content widget
        content_widget = self.query_one("#tasks-content", Static)
        content_widget.update(self._build_tasks_content())
        self.notify("Tasks refreshed", severity="information")
