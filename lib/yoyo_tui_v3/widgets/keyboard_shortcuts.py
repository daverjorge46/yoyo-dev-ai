"""
KeyboardShortcuts Footer Widget

Displays available keyboard shortcuts at the bottom of the screen.
Shows primary navigation and action shortcuts for quick reference.
"""

from textual.widget import Widget
from textual.widgets import Static
from textual.events import Click
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

    # Map shortcut keys to action names
    KEY_TO_ACTION = {
        '?': 'help',
        '/': 'command_search',
        'r': 'refresh',
        'g': 'git_menu',
        't': 'focus_active_work',
        's': 'focus_specs',
        'h': 'focus_history',
        'q': 'quit',
        'esc': 'back',
        'e': 'edit',
    }

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

        # Position tracking for mouse clicks: list of (start, end, key)
        self._shortcut_positions: list[tuple[int, int, str]] = []

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

    def on_click(self, event: Click) -> None:
        """
        Handle mouse click events on shortcut buttons.

        Maps click position to the corresponding shortcut and triggers
        the associated app action.
        """
        # Calculate click position relative to content
        # The content is centered, so we need to account for centering offset
        content_widget = self.query_one("#shortcuts-content", Static)

        # Get total content width
        total_content_width = sum(
            len(s['key']) + 1 + len(s['description'])
            for s in self.shortcuts
        ) + (len(self.shortcuts) - 1) * 3  # separators " │ "

        # Calculate centering offset
        widget_width = self.size.width
        center_offset = max(0, (widget_width - total_content_width) // 2)

        # Adjust click x for centering
        click_x = event.x - center_offset

        # Find which shortcut was clicked
        for start, end, key in self._shortcut_positions:
            if start <= click_x < end:
                # Found the clicked shortcut, trigger action
                action_name = self.KEY_TO_ACTION.get(key)
                if action_name:
                    self.app.run_action(action_name)
                return

    def _build_content(self) -> Text:
        """
        Build the keyboard shortcuts content.

        Returns:
            Rich Text object with formatted shortcuts
        """
        if not self.shortcuts:
            self._shortcut_positions = []
            return Text("")

        text = Text()
        self._shortcut_positions = []
        current_pos = 0

        # Build shortcuts list and track positions
        for i, shortcut in enumerate(self.shortcuts):
            # Add separator between shortcuts
            if i > 0:
                separator = " │ "
                text.append(separator, style="dim")
                current_pos += len(separator)

            # Record start position for this shortcut
            start_pos = current_pos

            # Add key (highlighted)
            key_text = shortcut['key']
            text.append(key_text, style="bold cyan")
            current_pos += len(key_text)

            # Add space
            text.append(" ", style="")
            current_pos += 1

            # Add description (muted)
            desc_text = shortcut['description']
            text.append(desc_text, style="dim")
            current_pos += len(desc_text)

            # Record end position and store with key
            end_pos = current_pos
            self._shortcut_positions.append((start_pos, end_pos, shortcut['key']))

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
