"""
CommandPaletteScreen - Quick command search and execution.

Provides fuzzy search over all Yoyo Dev commands with keyboard navigation.
"""

from pathlib import Path
from typing import List, Tuple
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Input, ListView, ListItem, Static, Label
from textual.containers import Vertical, Container
from textual.binding import Binding


class CommandPaletteScreen(Screen):
    """
    Command palette for fuzzy searching and executing Yoyo Dev commands.

    Features:
    - Loads all commands from .claude/commands/
    - Fuzzy search filtering
    - Keyboard navigation (up/down, enter to execute)
    - Shows command descriptions
    """

    BINDINGS = [
        Binding("escape", "dismiss", "Close"),
        Binding("ctrl+c", "dismiss", "Close"),
    ]

    CSS = """
    CommandPaletteScreen {
        align: center middle;
    }

    #palette-container {
        width: 80;
        height: auto;
        max-height: 30;
        background: $surface;
        border: thick $primary;
        padding: 1 2;
    }

    #palette-input {
        margin-bottom: 1;
    }

    #palette-list {
        height: auto;
        max-height: 20;
        border: solid $accent;
    }

    #no-results {
        color: $warning;
        text-align: center;
        padding: 1;
    }
    """

    def __init__(self, *args, **kwargs):
        """Initialize command palette."""
        super().__init__(*args, **kwargs)
        self.commands: List[Tuple[str, str]] = []  # [(name, description), ...]
        self.filtered_commands: List[Tuple[str, str]] = []

    def compose(self) -> ComposeResult:
        """Compose the command palette layout."""
        with Container(id="palette-container"):
            yield Static("🔍 Command Palette", id="palette-title")
            yield Input(
                placeholder="Type to search commands...",
                id="palette-input"
            )
            yield ListView(id="palette-list")
            yield Static("", id="no-results")

    def on_mount(self) -> None:
        """Load commands and focus input when screen mounts."""
        self.commands = self._load_commands()
        self.filtered_commands = self.commands
        self._update_list()

        # Focus the input field
        input_widget = self.query_one("#palette-input", Input)
        input_widget.focus()

    def _load_commands(self) -> List[Tuple[str, str]]:
        """
        Load all Yoyo Dev commands from .claude/commands/ directory.

        Returns:
            List of (command_name, description) tuples
        """
        commands = []
        commands_dir = Path(".claude/commands")

        if not commands_dir.exists():
            return self._get_fallback_commands()

        try:
            for cmd_file in sorted(commands_dir.glob("*.md")):
                # Extract command name from filename (remove .md extension)
                cmd_name = "/" + cmd_file.stem

                # Try to extract description from file
                description = self._extract_description(cmd_file)

                commands.append((cmd_name, description))
        except Exception:
            return self._get_fallback_commands()

        return commands if commands else self._get_fallback_commands()

    def _extract_description(self, cmd_file: Path) -> str:
        """
        Extract description from command file.

        Looks for first paragraph or line after frontmatter.

        Args:
            cmd_file: Path to command markdown file

        Returns:
            Description string or generic description
        """
        try:
            content = cmd_file.read_text()
            lines = content.split("\n")

            # Skip frontmatter if present
            in_frontmatter = False
            start_idx = 0

            for i, line in enumerate(lines):
                if line.strip() == "---":
                    if not in_frontmatter:
                        in_frontmatter = True
                    else:
                        start_idx = i + 1
                        break

            # Find first non-empty, non-heading line
            for line in lines[start_idx:]:
                line = line.strip()
                if line and not line.startswith("#"):
                    # Truncate to reasonable length
                    if len(line) > 80:
                        return line[:77] + "..."
                    return line

            return "Execute Yoyo Dev command"
        except Exception:
            return "Execute Yoyo Dev command"

    def _get_fallback_commands(self) -> List[Tuple[str, str]]:
        """
        Get fallback command list if .claude/commands/ not found.

        Returns:
            List of common Yoyo Dev commands with descriptions
        """
        return [
            ("/plan-product", "Set mission & roadmap for a new product"),
            ("/analyze-product", "Analyze existing product and create roadmap"),
            ("/create-new", "Create new feature with full spec workflow"),
            ("/create-spec", "Create detailed specification for a feature"),
            ("/create-tasks", "Generate task breakdown from specification"),
            ("/execute-tasks", "Build and ship code for a feature"),
            ("/create-fix", "Analyze and fix bugs systematically"),
            ("/review", "Critical code review with specialized modes"),
            ("/design-init", "Initialize design system"),
            ("/design-audit", "Audit design consistency"),
            ("/design-fix", "Fix design violations"),
            ("/design-component", "Create UI component with design system"),
        ]

    def on_input_changed(self, event: Input.Changed) -> None:
        """
        Filter commands as user types.

        Args:
            event: Input changed event with new value
        """
        query = event.value.lower()

        if not query:
            # Show all commands if query is empty
            self.filtered_commands = self.commands
        else:
            # Simple fuzzy matching: command contains query substring
            self.filtered_commands = [
                (name, desc) for name, desc in self.commands
                if query in name.lower() or query in desc.lower()
            ]

        self._update_list()

    def _update_list(self) -> None:
        """Update the command list view with filtered commands."""
        list_view = self.query_one("#palette-list", ListView)
        no_results = self.query_one("#no-results", Static)

        # Clear existing items
        list_view.clear()

        if not self.filtered_commands:
            # Show "no results" message
            no_results.update("No matching commands found")
            list_view.display = False
            no_results.display = True
        else:
            # Hide "no results" and show list
            no_results.display = False
            list_view.display = True

            # Add filtered commands to list
            for cmd_name, cmd_desc in self.filtered_commands:
                label = f"[bold cyan]{cmd_name}[/bold cyan]\n[dim]{cmd_desc}[/dim]"
                list_view.append(ListItem(Label(label)))

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        """
        Execute selected command.

        Args:
            event: ListView selected event
        """
        # Get the index of selected item
        selected_idx = event.list_view.index

        if selected_idx is not None and selected_idx < len(self.filtered_commands):
            cmd_name, _ = self.filtered_commands[selected_idx]
            self._execute_command(cmd_name)

    def _execute_command(self, command: str) -> None:
        """
        Execute the selected Yoyo Dev command.

        Args:
            command: Command name (e.g., "/execute-tasks")
        """
        # Close the palette
        self.app.pop_screen()

        # Show notification that command would be executed
        # In a full implementation, this would integrate with Claude Code
        self.app.notify(
            f"Command: {command} - Integration with Claude Code pending",
            severity="information",
            timeout=3
        )

        # Note: Full integration with Claude Code command execution pending
        # Currently shows notification that command was selected

    def action_dismiss(self) -> None:
        """Close the command palette and return to main dashboard."""
        self.app.pop_screen()
