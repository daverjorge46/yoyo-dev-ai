"""
Keyboard shortcuts help display for split view.

This module provides functions to display keyboard shortcut hints
to help users understand split view controls.
"""

from typing import Optional


def get_shortcuts_help_text() -> str:
    """
    Get formatted keyboard shortcuts help text.

    Returns:
        Multi-line string with keyboard shortcuts and descriptions
    """
    return """
╔══════════════════════════════════════════════════════════════╗
║             Split View Keyboard Shortcuts                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Ctrl+B  →     Switch focus between Claude and TUI panes    ║
║  Ctrl+B  <     Shrink left pane / Grow right pane           ║
║  Ctrl+B  >     Grow left pane / Shrink right pane           ║
║                                                              ║
║  Ctrl+D        Exit active pane                             ║
║  Ctrl+C        Interrupt active process                     ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Visual Indicators:                                         ║
║    • Bright cyan border = Active pane                       ║
║    • Dim white border = Inactive pane                       ║
╚══════════════════════════════════════════════════════════════╝
"""


def get_compact_shortcuts_hint() -> str:
    """
    Get compact one-line shortcut hint.

    Returns:
        Single line string with essential shortcuts
    """
    return "Shortcuts: Ctrl+B → (switch) | Ctrl+B < > (resize) | Ctrl+D (exit)"


def print_shortcuts_help():
    """Print the full keyboard shortcuts help text to stdout."""
    print(get_shortcuts_help_text())


def print_compact_hint():
    """Print the compact shortcut hint to stdout."""
    print(get_compact_shortcuts_hint())


def get_shortcuts_for_readme() -> str:
    """
    Get shortcuts formatted for README.md documentation.

    Returns:
        Markdown-formatted shortcuts reference
    """
    return """### Keyboard Shortcuts

When running in split view mode, the following keyboard shortcuts are available:

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` `→` | Switch focus between Claude Code and TUI panes |
| `Ctrl+B` `<` | Shrink left pane / Grow right pane |
| `Ctrl+B` `>` | Grow left pane / Shrink right pane |
| `Ctrl+D` | Exit the active pane |
| `Ctrl+C` | Interrupt the active process |

**Visual Indicators:**
- **Bright cyan border** indicates the active pane
- **Dim white border** indicates inactive panes

**Tips:**
- You can resize panes dynamically using `Ctrl+B` `<` or `>`
- Each pane operates independently - closing one doesn't affect the other
- The TUI automatically updates when Claude Code creates or modifies files
"""


# Export public functions
__all__ = [
    'get_shortcuts_help_text',
    'get_compact_shortcuts_hint',
    'print_shortcuts_help',
    'print_compact_hint',
    'get_shortcuts_for_readme'
]
