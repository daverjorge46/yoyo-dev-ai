"""
Yoyo Dev TUI Widgets Module

This module contains all custom widgets for the Textual TUI:
- TaskTree: Hierarchical task display with expand/collapse
- ProgressPanel: Progress bars and task summaries
- SpecList: Specifications and fixes data table
- GitStatus: Git repository status with live updates
- ProjectOverview: Project mission and tech stack overview
- ShortcutsPanel: Quick reference keyboard shortcuts
- NextTasksPanel: Next uncompleted task with subtask preview
- SuggestedCommandsPanel: Context-aware command suggestions
- HistoryPanel: Unified project history from all sources
"""

from .task_tree import TaskTree
from .progress_panel import ProgressPanel
from .spec_list import SpecList
from .git_status import GitStatus
from .project_overview import ProjectOverview
from .shortcuts_panel import ShortcutsPanel
from .next_tasks_panel import NextTasksPanel
from .suggested_commands_panel import SuggestedCommandsPanel
from .history_panel import HistoryPanel

__all__ = [
    "TaskTree",
    "ProgressPanel",
    "SpecList",
    "GitStatus",
    "ProjectOverview",
    "ShortcutsPanel",
    "NextTasksPanel",
    "SuggestedCommandsPanel",
    "HistoryPanel",
]
