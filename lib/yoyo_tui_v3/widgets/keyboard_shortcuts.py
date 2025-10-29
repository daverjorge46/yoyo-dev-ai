"""
KeyboardShortcuts Footer Widget

Displays available keyboard shortcuts at the bottom of the screen.
Shows primary navigation and action shortcuts for quick reference.
"""

from textual.widget import Widget
from textual.widgets import Static
from rich.text import Text


class KeyboardShortcuts(Widget):
    """
    Keyboard shortcuts footer widget.

    Displays a single-line footer with available keyboard shortcuts:
    - Primary navigation shortcuts (?, /, r, g, t, s, h, q)
    - Context-aware highlighting (optional)
    - Compact formatting for full-width display

    Design:
    - Docked at bottom of screen
    - Single line height
    - Shortcuts separated with " | "
    - Keys highlighted in bold/color
    - Descriptions in muted color
    """

    DEFAULT_CSS = """
    KeyboardShortcuts {
        dock: bottom;
        height: 1;
        background: $panel-darken-1;
        color: $text-muted;
        content-align: center middle;
    }

    KeyboardShortcuts .shortcut-key {
        text-style: bold;
        color: $accent;
    }

    KeyboardShortcuts .shortcut-desc {
        color: $text-muted;
    }
    """

    def __init__(self, **kwargs):
        """Initialize KeyboardShortcuts footer."""
        super().__init__(**kwargs)

        # Default shortcuts (ordered by priority)
        self.shortcuts = [
            {'key': '?', 'description': 'Help'},
            {'key': '/', 'description': 'Commands'},
            {'key': 'r', 'description': 'Refresh'},
            {'key': 'g', 'description': 'Git'},
            {'key': 't', 'description': 'Tasks'},
            {'key': 's', 'description': 'Specs'},
            {'key': 'h', 'description': 'History'},
            {'key': 'q', 'description': 'Quit'},
        ]

    def compose(self):
        """Compose the keyboard shortcuts layout."""
        yield Static("", id="shortcuts-content")

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        self._update_display()

    # ========================================================================
    # Display Methods
    # ========================================================================

    def _update_display(self) -> None:
        """Update the keyboard shortcuts display."""
        content = self._build_content()

        # Update content widget
        content_widget = self.query_one("#shortcuts-content", Static)
        content_widget.update(content)

    def _build_content(self) -> Text:
        """
        Build the keyboard shortcuts content.

        Returns:
            Rich Text object with formatted shortcuts
        """
        if not self.shortcuts:
            return Text("")

        text = Text()

        # Build shortcuts list
        for i, shortcut in enumerate(self.shortcuts):
            # Add separator between shortcuts
            if i > 0:
                text.append(" │ ", style="dim")

            # Add key (highlighted)
            text.append(shortcut['key'], style="bold cyan")
            text.append(" ", style="")

            # Add description (muted)
            text.append(shortcut['description'], style="dim")

        return text

    def refresh_display(self) -> None:
        """Refresh the keyboard shortcuts display (public API)."""
        self._update_display()

    def update_shortcuts(self, shortcuts: list) -> None:
        """
        Update the shortcuts list dynamically.

        Args:
            shortcuts: List of shortcut dicts with 'key' and 'description'
        """
        self.shortcuts = shortcuts
        self._update_display()

    def set_shortcuts(self, shortcuts: list) -> None:
        """
        Set shortcuts list (alias for update_shortcuts).

        Args:
            shortcuts: List of shortcut dicts with 'key' and 'description'
        """
        self.update_shortcuts(shortcuts)

    def load_from_app(self, app) -> None:
        """
        Load shortcuts from app BINDINGS.

        Args:
            app: Textual App instance with BINDINGS attribute
        """
        if not hasattr(app, 'BINDINGS'):
            return

        # Extract shortcuts from app bindings
        shortcuts = []
        for binding in app.BINDINGS:
            shortcuts.append({
                'key': binding.key,
                'description': binding.description
            })

        self.shortcuts = shortcuts
        self._update_display()

    # ========================================================================
    # Context-Aware Methods
    # ========================================================================

    def highlight_shortcut(self, key: str) -> None:
        """
        Highlight a specific shortcut (for active context).

        Args:
            key: Shortcut key to highlight
        """
        # Find and update shortcut style
        # Implementation can add visual distinction for active shortcuts
        self._update_display()

    def set_context_shortcuts(self, context: str) -> None:
        """
        Set shortcuts based on context (e.g., screen type).

        Args:
            context: Context name (e.g., "main", "spec_detail", "task_detail")
        """
        # Context-specific shortcuts
        context_shortcuts = {
            "main": [
                {'key': '?', 'description': 'Help'},
                {'key': '/', 'description': 'Commands'},
                {'key': 'r', 'description': 'Refresh'},
                {'key': 'g', 'description': 'Git'},
                {'key': 't', 'description': 'Tasks'},
                {'key': 's', 'description': 'Specs'},
                {'key': 'h', 'description': 'History'},
                {'key': 'q', 'description': 'Quit'},
            ],
            "spec_detail": [
                {'key': 'esc', 'description': 'Back'},
                {'key': 'e', 'description': 'Edit'},
                {'key': 't', 'description': 'Tasks'},
                {'key': 'r', 'description': 'Refresh'},
                {'key': 'q', 'description': 'Quit'},
            ],
            "task_detail": [
                {'key': 'esc', 'description': 'Back'},
                {'key': 'e', 'description': 'Edit'},
                {'key': 'r', 'description': 'Refresh'},
                {'key': 'q', 'description': 'Quit'},
            ],
        }

        if context in context_shortcuts:
            self.shortcuts = context_shortcuts[context]
            self._update_display()

    # ========================================================================
    # Adaptive Rendering
    # ========================================================================

    def _get_visible_shortcuts(self, max_width: int) -> list:
        """
        Get shortcuts that fit within max width.

        Args:
            max_width: Maximum width available

        Returns:
            List of shortcuts that fit
        """
        # Estimate width per shortcut: "key desc | " ~= 15 chars average
        estimated_width_per_shortcut = 15
        max_shortcuts = max_width // estimated_width_per_shortcut

        # Return priority shortcuts that fit
        return self.shortcuts[:max_shortcuts]

    def _truncate_descriptions(self, max_length: int = 15) -> None:
        """
        Truncate long descriptions to fit narrow terminals.

        Args:
            max_length: Maximum description length
        """
        for shortcut in self.shortcuts:
            if len(shortcut['description']) > max_length:
                shortcut['description'] = shortcut['description'][:max_length - 3] + "..."
