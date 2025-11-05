"""
Split view module for integrated Claude Code + TUI display.

This module provides terminal-based split screen functionality without
external dependencies (no tmux/screen required).
"""

from .terminal_control import TerminalController
from .pane import Pane, PaneBounds
from .layout import LayoutManager
from .focus import FocusManager
from .manager import (
    SplitViewManager,
    SplitViewConfig,
    BorderStyle,
    KeyboardShortcuts,
    ClaudeConfig
)
from .shortcuts_help import (
    get_shortcuts_help_text,
    get_compact_shortcuts_hint,
    get_shortcuts_for_readme,
    print_shortcuts_help,
    print_compact_hint
)

__all__ = [
    "TerminalController",
    "PaneBounds",
    "Pane",
    "LayoutManager",
    "FocusManager",
    "SplitViewManager",
    "SplitViewConfig",
    "BorderStyle",
    "KeyboardShortcuts",
    "ClaudeConfig",
    "get_shortcuts_help_text",
    "get_compact_shortcuts_hint",
    "get_shortcuts_for_readme",
    "print_shortcuts_help",
    "print_compact_hint"
]
