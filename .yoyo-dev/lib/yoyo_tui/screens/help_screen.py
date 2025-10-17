"""
HelpScreen - Display comprehensive help and keyboard shortcuts.

Shows markdown-formatted help documentation with navigation support.
"""

from pathlib import Path
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Markdown, Header, Footer
from textual.binding import Binding


class HelpScreen(Screen):
    """
    Help screen displaying keyboard shortcuts and documentation.

    Shows comprehensive help content loaded from help.md file.
    Supports scrolling and quick exit via Esc or q.
    """

    BINDINGS = [
        Binding("escape", "dismiss", "Close"),
        Binding("q", "dismiss", "Close"),
    ]

    def compose(self) -> ComposeResult:
        """
        Compose the help screen layout.

        Yields:
            Header, Markdown content, and Footer
        """
        yield Header()

        # Load help content from markdown file
        help_content = self._load_help_content()
        yield Markdown(help_content, id="help-content")

        yield Footer()

    def _load_help_content(self) -> str:
        """
        Load help content from help.md file.

        Returns:
            Help content as markdown string, or fallback message if file not found
        """
        # Find help.md in content directory
        help_file = Path(__file__).parent.parent / "content" / "help.md"

        if help_file.exists():
            try:
                return help_file.read_text()
            except Exception as e:
                return self._get_fallback_content(f"Error loading help: {e}")
        else:
            return self._get_fallback_content("Help file not found")

    def _get_fallback_content(self, error_msg: str) -> str:
        """
        Get fallback help content if file cannot be loaded.

        Args:
            error_msg: Error message to display

        Returns:
            Basic help content as markdown
        """
        return f"""# Yoyo Dev TUI - Help

{error_msg}

## Quick Keyboard Shortcuts

- **Ctrl+P** - Command palette
- **?** - Help (this screen)
- **q** - Quit
- **r** - Refresh
- **g** - Git menu
- **t** - Focus tasks
- **s** - Focus specs
- **Esc** - Close dialogs

Press **Esc** or **q** to close this screen.
"""

    def action_dismiss(self) -> None:
        """Close the help screen and return to main dashboard."""
        self.app.pop_screen()
