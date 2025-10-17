"""
ShortcutsPanel Widget - Display keyboard shortcuts dynamically.

Shows available keyboard shortcuts with descriptions.
Updates based on current screen/context.
"""

from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget
from textual.containers import Vertical


class ShortcutsPanel(Widget):
    """
    Shortcuts panel widget for displaying keyboard shortcuts.

    Shows dynamic keyboard shortcuts based on context.
    Can be updated to reflect current screen shortcuts.

    Attributes:
        shortcuts: List of (key, description) tuples
    """

    # Default shortcuts for main screen
    DEFAULT_SHORTCUTS = [
        ("Ctrl+P", "Command Palette"),
        ("?", "Help"),
        ("q", "Quit"),
        ("r", "Refresh"),
        ("g", "Git Menu"),
        ("t", "Tasks"),
        ("s", "Specs"),
    ]

    def __init__(self, shortcuts: list[tuple[str, str]] | None = None, *args, **kwargs):
        """
        Initialize ShortcutsPanel widget.

        Args:
            shortcuts: List of (key, description) tuples. Defaults to DEFAULT_SHORTCUTS.
        """
        super().__init__(*args, **kwargs)
        self.shortcuts = shortcuts if shortcuts is not None else self.DEFAULT_SHORTCUTS

    def compose(self) -> ComposeResult:
        """
        Compose the shortcuts panel layout.

        Yields:
            Static widget with shortcuts information
        """
        with Vertical(id="shortcuts-panel-container"):
            # Title
            yield Static("[bold cyan]Keyboard Shortcuts[/bold cyan]", id="shortcuts-panel-title")

            # Shortcuts list
            shortcuts_text = self._generate_shortcuts_text()
            yield Static(shortcuts_text, id="shortcuts-panel-content")

    def _generate_shortcuts_text(self) -> str:
        """
        Generate formatted shortcuts text.

        Returns:
            Formatted shortcuts string with rich markup
        """
        if not self.shortcuts:
            return "[dim]No shortcuts available[/dim]"

        lines = []
        for key, description in self.shortcuts:
            # Format: [cyan]Key[/cyan] Description
            # Align descriptions by padding keys to consistent width
            key_display = f"[cyan]{key}[/cyan]"
            # Add padding for alignment (approximate since rich markup doesn't count)
            padding = " " * max(0, 10 - len(key))
            lines.append(f"{key_display}{padding}{description}")

        return "\n".join(lines)

    def update_shortcuts(self, shortcuts: list[tuple[str, str]]) -> None:
        """
        Update displayed shortcuts.

        Args:
            shortcuts: New list of (key, description) tuples
        """
        self.shortcuts = shortcuts
        try:
            content = self.query_one("#shortcuts-panel-content", Static)
            shortcuts_text = self._generate_shortcuts_text()
            content.update(shortcuts_text)
        except Exception:
            # Widget not mounted yet
            pass

    def refresh(self, **kwargs) -> None:
        """
        Refresh shortcuts display.

        Accepts any kwargs for compatibility with parent Widget.refresh().
        """
        try:
            content = self.query_one("#shortcuts-panel-content", Static)
            shortcuts_text = self._generate_shortcuts_text()
            content.update(shortcuts_text)
        except Exception:
            # Widget not mounted yet
            pass
