"""
Commands Screen for Yoyo Dev TUI.

Displays available commands with descriptions and usage examples.
"""

from textual.screen import Screen
from textual.widgets import Static
from textual.containers import Container, ScrollableContainer
from textual.binding import Binding
from rich.text import Text


class CommandsScreen(Screen):
    """
    Commands screen showing all available Yoyo Dev commands.

    Press ESC or q to close.
    """

    BINDINGS = [
        Binding("escape", "close", "Close"),
        Binding("q", "close", "Close"),
    ]

    CSS = """
    CommandsScreen {
        align: center middle;
    }

    #commands-container {
        width: 100;
        height: 90%;
        background: $panel;
        border: heavy $primary;
        padding: 2;
    }

    #commands-content {
        height: auto;
    }
    """

    def compose(self):
        """Compose the commands screen layout."""
        with Container(id="commands-container"):
            with ScrollableContainer(id="commands-scroll"):
                yield Static(self._build_commands_content(), id="commands-content")

    def _build_commands_content(self) -> Text:
        """
        Build the commands content.

        Returns:
            Rich Text object with commands content
        """
        content = Text()

        # Header
        content.append("╔════════════════════════════════════════════════════════════════════════════════╗\n", style="bold cyan")
        content.append("║                        ", style="bold cyan")
        content.append("YOYO DEV COMMANDS", style="bold white")
        content.append("                                 ║\n", style="bold cyan")
        content.append("╚════════════════════════════════════════════════════════════════════════════════╝\n\n", style="bold cyan")

        # Product Planning Commands
        content.append("📋 PRODUCT PLANNING\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        self._add_command(content, "plan-product", "Set up mission & roadmap for a new product",
                         "Guides you through creating product documentation (mission, tech stack, roadmap)")

        self._add_command(content, "analyze-product", "Analyze and install Yoyo Dev for existing projects",
                         "For existing codebases - analyzes structure and creates product docs")

        content.append("\n")

        # Feature Development Commands
        content.append("⚡ FEATURE DEVELOPMENT\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        self._add_command(content, "create-new", "Create new feature (spec + tasks)",
                         "Streamlined workflow: spec creation → task generation → ready for execution")

        self._add_command(content, "create-spec", "Create detailed specification only",
                         "For when you want detailed spec creation without automatic task generation")

        self._add_command(content, "create-tasks", "Create tasks from existing spec",
                         "Generates task breakdown from approved specification")

        self._add_command(content, "execute-tasks", "Execute tasks and build features",
                         "Three-phase execution: setup → implementation → post-execution (tests, PR, recap)")

        content.append("\n")

        # Bug Fixes & Issues Commands
        content.append("🔧 BUG FIXES & ISSUES\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        self._add_command(content, "create-fix", "Analyze and fix bugs/design issues",
                         "Systematic problem analysis → solution approach → task generation")

        content.append("\n")

        # Advanced Commands
        content.append("🚀 ADVANCED WORKFLOWS\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        self._add_command(content, "orchestrate-tasks", "Advanced multi-agent orchestration",
                         "Manually assign agents and standards to task groups (for complex scenarios)")

        self._add_command(content, "improve-skills", "Optimize Claude Code Skills",
                         "Improve skill descriptions and discoverability")

        content.append("\n")

        # Code Review Commands
        content.append("🔍 CODE REVIEW (Optional)\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        self._add_command(content, "review", "Critical code review",
                         "Modes: --devil, --security, --performance, --production (use strategically)")

        content.append("\n")

        # Design System Commands
        content.append("🎨 DESIGN SYSTEM\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        self._add_command(content, "design-init", "Initialize design system",
                         "Create comprehensive design tokens and component patterns")

        self._add_command(content, "design-audit", "Audit design consistency",
                         "Check compliance with design tokens and accessibility")

        self._add_command(content, "design-fix", "Fix design violations",
                         "Systematically fix violations found in audit")

        self._add_command(content, "design-component", "Create consistent components",
                         "Build UI components with enforced design compliance")

        content.append("\n")

        # Footer
        content.append("─" * 80 + "\n", style="dim")
        content.append("💡 TIP: ", style="bold yellow")
        content.append("Use ", style="dim")
        content.append("/command-name", style="bold cyan")
        content.append(" in Claude Code to invoke commands\n", style="dim")
        content.append("Press ", style="dim")
        content.append("ESC", style="bold cyan")
        content.append(" or ", style="dim")
        content.append("q", style="bold cyan")
        content.append(" to close this screen\n", style="dim")

        return content

    def _add_command(self, content: Text, name: str, short_desc: str, long_desc: str) -> None:
        """
        Add a command entry to the content.

        Args:
            content: Text object to append to
            name: Command name
            short_desc: Short description (one line)
            long_desc: Longer description with details
        """
        content.append(f"  /", style="bold green")
        content.append(f"{name}\n", style="bold green")
        content.append(f"    {short_desc}\n", style="bold white")
        content.append(f"    {long_desc}\n\n", style="dim")

    def action_close(self) -> None:
        """Close the commands screen."""
        self.app.pop_screen()
