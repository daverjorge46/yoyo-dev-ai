"""
Yoyo Dev TUI Screens Module

This module contains all screen definitions for the Textual TUI:
- MainScreen: Primary dashboard screen with task display
- CommandPaletteScreen: Command search and execution (Task 10)
- TaskDetailScreen: Detailed task view (Task 5)
- SpecDetailScreen: Detailed spec/fix view (Task 5)
- GitMenuScreen: Git quick actions (Task 12)
- HelpScreen: Keyboard shortcuts and help (Task 13)
"""

from .main import MainScreen
from .task_detail_screen import TaskDetailScreen
from .spec_detail_screen import SpecDetailScreen

__all__ = [
    "MainScreen",
    "TaskDetailScreen",
    "SpecDetailScreen",
]
