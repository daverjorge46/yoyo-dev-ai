"""
Help Screen for Yoyo Dev TUI.

Displays keyboard shortcuts, commands, and usage instructions.
"""

from textual.screen import Screen
from textual.widgets import Static
from textual.containers import Container, Vertical
from textual.binding import Binding
from rich.text import Text
from rich.table import Table


class HelpScreen(Screen):
    """
    Help screen showing keyboard shortcuts and usage instructions.

    Press ESC or q to close.
    """

    BINDINGS = [
        Binding("escape", "close", "Close"),
        Binding("q", "close", "Close"),
    ]

    CSS = """
    HelpScreen {
        align: center middle;
    }

    #help-container {
        width: 90;
        height: auto;
        max-height: 90%;
        background: $panel;
        border: heavy $primary;
        padding: 2;
    }

    #help-content {
        height: auto;
    }
    """

    def compose(self):
        """Compose the help screen layout."""
        with Container(id="help-container"):
            yield Static(self._build_help_content(), id="help-content")

    def _build_help_content(self) -> Text:
        """
        Build the help content.

        Returns:
            Rich Text object with help content
        """
        content = Text()

        # Header
        content.append("╔═══════════════════════════════════════════════════════════════════╗\n", style="bold cyan")
        content.append("║                      ", style="bold cyan")
        content.append("YOYO DEV TUI - HELP", style="bold white")
        content.append("                        ║\n", style="bold cyan")
        content.append("╚═══════════════════════════════════════════════════════════════════╝\n\n", style="bold cyan")

        # Keyboard Shortcuts Section
        content.append("KEYBOARD SHORTCUTS\n", style="bold yellow")
        content.append("─" * 70 + "\n\n", style="dim")

        shortcuts = [
            ("?", "Show this help screen"),
            ("/", "Open command search / command palette"),
            ("r", "Refresh dashboard (reload all data)"),
            ("g", "Git menu (view status, branches, recent commits)"),
            ("t", "Focus Tasks panel (active work)"),
            ("s", "Focus Specs panel (available specs and fixes)"),
            ("h", "Focus History panel (recent actions)"),
            ("q", "Quit application"),
            ("ESC", "Close modal / Go back"),
        ]

        for key, description in shortcuts:
            content.append(f"  {key:8}", style="bold cyan")
            content.append(f" │ {description}\n", style="dim")

        content.append("\n")

        # Commands Section
        content.append("AVAILABLE COMMANDS\n", style="bold yellow")
        content.append("─" * 70 + "\n\n", style="dim")

        content.append("Press ", style="dim")
        content.append("/", style="bold cyan")
        content.append(" to open the command palette and search for:\n\n", style="dim")

        commands = [
            ("plan-product", "Set up mission & roadmap for a new product"),
            ("create-new", "Create new feature with spec + tasks"),
            ("create-fix", "Analyze and fix bugs/issues"),
            ("execute-tasks", "Execute tasks and build features"),
            ("review", "Critical code review"),
        ]

        for cmd, description in commands:
            content.append(f"  /{cmd:18}", style="bold green")
            content.append(f" │ {description}\n", style="dim")

        content.append("\n")

        # Navigation Section
        content.append("NAVIGATION\n", style="bold yellow")
        content.append("─" * 70 + "\n\n", style="dim")

        content.append("  The dashboard has 3 main panels:\n\n", style="dim")
        content.append("    • ", style="bold blue")
        content.append("Active Work (Left)", style="bold blue")
        content.append(" - Current specs/fixes and tasks\n", style="dim")
        content.append("    • ", style="bold magenta")
        content.append("Command Palette (Center)", style="bold magenta")
        content.append(" - Suggested actions and errors\n", style="dim")
        content.append("    • ", style="bold yellow")
        content.append("History (Right)", style="bold yellow")
        content.append(" - Recent commands and actions\n\n", style="dim")

        content.append("  Use keyboard shortcuts to focus panels and navigate.\n\n", style="dim")

        # Footer
        content.append("─" * 70 + "\n", style="dim")
        content.append("Press ", style="dim")
        content.append("ESC", style="bold cyan")
        content.append(" or ", style="dim")
        content.append("q", style="bold cyan")
        content.append(" to close this help screen\n", style="dim")

        return content

    def action_close(self) -> None:
        """Close the help screen."""
        self.app.pop_screen()
