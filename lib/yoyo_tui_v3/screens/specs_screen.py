"""
Specs Screen for Yoyo Dev TUI.

Displays list of all specs and fixes.
"""

from textual.screen import Screen
from textual.widgets import Static
from textual.containers import Container, ScrollableContainer
from textual.binding import Binding
from rich.text import Text


class SpecsScreen(Screen):
    """
    Specs screen showing all specs and fixes.

    Press ESC or q to close.
    """

    BINDINGS = [
        Binding("escape", "close", "Close"),
        Binding("q", "close", "Close"),
        Binding("r", "refresh", "Refresh"),
    ]

    CSS = """
    SpecsScreen {
        align: center middle;
    }

    #specs-container {
        width: 100;
        height: 90%;
        background: $panel;
        border: heavy $primary;
        padding: 2;
    }

    #specs-content {
        height: auto;
    }
    """

    def __init__(self, data_manager, event_bus, **kwargs):
        """Initialize SpecsScreen."""
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus

    def compose(self):
        """Compose the specs screen layout."""
        with Container(id="specs-container"):
            with ScrollableContainer(id="specs-scroll"):
                yield Static(self._build_specs_content(), id="specs-content")

    def _build_specs_content(self) -> Text:
        """
        Build the specs content.

        Returns:
            Rich Text object with specs content
        """
        content = Text()

        # Header
        content.append("╔════════════════════════════════════════════════════════════════════════════════╗\n", style="bold cyan")
        content.append("║                        ", style="bold cyan")
        content.append("SPECS & FIXES", style="bold white")
        content.append("                                   ║\n", style="bold cyan")
        content.append("╚════════════════════════════════════════════════════════════════════════════════╝\n\n", style="bold cyan")

        # Get all specs
        all_specs = self.data_manager.get_all_specs() or []
        specs = [s for s in all_specs if s.type == "spec"]
        fixes = [s for s in all_specs if s.type == "fix"]

        # Show specs
        if specs:
            content.append("📋 SPECIFICATIONS\n", style="bold yellow")
            content.append("─" * 80 + "\n\n", style="dim")

            # Group by status
            active = [s for s in specs if s.status == "active"]
            completed = [s for s in specs if s.status == "completed"]
            draft = [s for s in specs if s.status == "draft"]

            if active:
                content.append("  ⚡ Active:\n\n", style="bold green")
                for spec in active:
                    self._add_spec_entry(content, spec)

            if draft:
                content.append("  📝 Draft:\n\n", style="bold yellow")
                for spec in draft:
                    self._add_spec_entry(content, spec)

            if completed:
                content.append("  ✓ Completed:\n\n", style="bold dim")
                for spec in completed[:5]:  # Show only last 5 completed
                    self._add_spec_entry(content, spec)

        # Show fixes
        if fixes:
            content.append("\n🔧 FIXES\n", style="bold yellow")
            content.append("─" * 80 + "\n\n", style="dim")

            # Group by status
            active = [f for f in fixes if f.status == "active"]
            completed = [f for f in fixes if f.status == "completed"]

            if active:
                content.append("  ⚡ Active:\n\n", style="bold green")
                for fix in active:
                    self._add_spec_entry(content, fix)

            if completed:
                content.append("  ✓ Completed:\n\n", style="bold dim")
                for fix in completed[:5]:  # Show only last 5 completed
                    self._add_spec_entry(content, fix)

        if not specs and not fixes:
            content.append("  No specs or fixes found.\n\n", style="dim")
            content.append("  💡 Use ", style="dim")
            content.append("/create-new", style="bold green")
            content.append(" to create a new feature or ", style="dim")
            content.append("/create-fix", style="bold green")
            content.append(" to fix a bug.\n", style="dim")

        # Footer
        content.append("\n─" * 80 + "\n", style="dim")
        content.append("Press ", style="dim")
        content.append("r", style="bold cyan")
        content.append(" to refresh • ", style="dim")
        content.append("ESC", style="bold cyan")
        content.append(" or ", style="dim")
        content.append("q", style="bold cyan")
        content.append(" to close\n", style="dim")

        return content

    def _add_spec_entry(self, content: Text, spec) -> None:
        """Add a spec entry to content."""
        # Icon based on type
        icon = "📋" if spec.type == "spec" else "🔧"
        content.append(f"    {icon} ", style="bold")
        content.append(f"{spec.name}\n", style="bold cyan")
        content.append(f"       Created: {spec.created_date}", style="dim")

        # Show progress if available
        if spec.total_tasks and spec.total_tasks > 0:
            completed = spec.completed_tasks or 0
            total = spec.total_tasks
            progress = (completed / total * 100) if total > 0 else 0
            content.append(f" • Progress: {completed}/{total} ({progress:.0f}%)", style="dim")

        content.append("\n\n")

    def action_close(self) -> None:
        """Close the specs screen."""
        self.app.pop_screen()

    def action_refresh(self) -> None:
        """Refresh specs data."""
        # Update the content widget
        content_widget = self.query_one("#specs-content", Static)
        content_widget.update(self._build_specs_content())
        self.notify("Specs refreshed", severity="information")
