"""
Data Models for Yoyo Dev Textual TUI

This module defines all data structures used throughout the TUI application.
All models use dataclasses for type safety and immutability.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional


@dataclass
class Subtask:
    """
    Individual subtask within a parent task.

    Attributes:
        text: The subtask description
        completed: Whether the subtask is complete (checked)
    """
    text: str
    completed: bool = False

    def __str__(self) -> str:
        """String representation for display."""
        checkbox = '[x]' if self.completed else '[ ]'
        return f"{checkbox} {self.text}"


@dataclass
class ParentTask:
    """
    Parent task containing multiple subtasks.

    Attributes:
        number: Task number (e.g., 1, 2, 3)
        name: Task name/title
        completed: Whether the entire parent task is complete (✅)
        subtasks: List of subtasks under this parent task
    """
    number: int
    name: str
    completed: bool = False
    subtasks: List[Subtask] = field(default_factory=list)

    @property
    def progress(self) -> int:
        """Calculate completion percentage (0-100) based on subtasks."""
        if not self.subtasks:
            return 100 if self.completed else 0

        completed_count = sum(1 for st in self.subtasks if st.completed)
        return int((completed_count / len(self.subtasks)) * 100)

    def __str__(self) -> str:
        """String representation for display."""
        marker = '✓' if self.completed else '○'
        return f"{marker} Task {self.number}: {self.name}"


@dataclass
class TaskData:
    """
    Complete task file data parsed from tasks.md or MASTER-TASKS.md.

    Attributes:
        file_path: Path to the task file
        parent_tasks: List of all parent tasks
        total_tasks: Total number of parent tasks
        completed_tasks: Number of completed parent tasks
        total_subtasks: Total number of subtasks
        completed_subtasks: Number of completed subtasks
        progress: Overall completion percentage (0-100)
    """
    file_path: Path
    parent_tasks: List[ParentTask] = field(default_factory=list)
    total_tasks: int = 0
    completed_tasks: int = 0
    total_subtasks: int = 0
    completed_subtasks: int = 0
    progress: int = 0

    @classmethod
    def empty(cls) -> 'TaskData':
        """Create an empty TaskData instance."""
        return cls(
            file_path=Path(),
            parent_tasks=[],
            total_tasks=0,
            completed_tasks=0,
            total_subtasks=0,
            completed_subtasks=0,
            progress=0
        )

    @property
    def task_name(self) -> str:
        """Get task name from file path (directory name)."""
        return self.file_path.parent.name if self.file_path.parent else ""

    @property
    def is_complete(self) -> bool:
        """Check if all tasks are complete."""
        return self.total_subtasks > 0 and self.completed_subtasks == self.total_subtasks


@dataclass
class SpecData:
    """
    Specification or fix metadata.

    Attributes:
        name: Spec/fix folder name (e.g., "2025-10-11-feature-name")
        type: Either "spec" or "fix"
        created_date: Date in YYYY-MM-DD format
        completion: Completion percentage (0-100)
        status: Current status ("pending", "in_progress", "complete")
    """
    name: str
    type: str  # "spec" or "fix"
    created_date: str
    completion: int = 0
    status: str = "pending"  # "pending", "in_progress", "complete"

    @property
    def display_name(self) -> str:
        """Get shortened display name (remove date prefix)."""
        # Remove YYYY-MM-DD- prefix if present
        parts = self.name.split('-', 3)
        if len(parts) == 4:  # Has date prefix
            return parts[3]
        return self.name

    @property
    def icon(self) -> str:
        """Get emoji icon based on type."""
        return "📄" if self.type == "spec" else "🔧"


@dataclass
class GitStatus:
    """
    Git repository status information.

    Attributes:
        branch: Current branch name
        uncommitted: Number of uncommitted changes
        untracked: Number of untracked files
        ahead: Number of commits ahead of remote
        behind: Number of commits behind remote
        is_clean: Whether working tree is clean
    """
    branch: str
    uncommitted: int = 0
    untracked: int = 0
    ahead: int = 0
    behind: int = 0

    @property
    def is_clean(self) -> bool:
        """Check if working tree is clean."""
        return self.uncommitted == 0 and self.untracked == 0

    @property
    def status_text(self) -> str:
        """Get human-readable status text."""
        if self.is_clean:
            return "Clean"

        parts = []
        if self.uncommitted > 0:
            parts.append(f"{self.uncommitted} uncommitted")
        if self.untracked > 0:
            parts.append(f"{self.untracked} untracked")

        return ", ".join(parts)

    @property
    def sync_status(self) -> str:
        """Get sync status text."""
        if self.ahead > 0 and self.behind > 0:
            return f"↕ {self.ahead} ahead, {self.behind} behind"
        elif self.ahead > 0:
            return f"↑ {self.ahead} ahead"
        elif self.behind > 0:
            return f"↓ {self.behind} behind"
        return "✓ Up to date"


@dataclass(frozen=True)
class CommandEntry:
    """
    Command palette entry.

    Attributes:
        id: Unique command identifier
        name: Display name
        description: Short description
        shortcut: Optional keyboard shortcut
        category: Command category (for grouping)
    """
    id: str
    name: str
    description: str
    shortcut: Optional[str] = None
    category: str = "General"

    def matches(self, query: str) -> bool:
        """Check if command matches search query (case-insensitive)."""
        query_lower = query.lower()
        return (
            query_lower in self.name.lower() or
            query_lower in self.description.lower() or
            query_lower in self.id.lower()
        )


# Type aliases for clarity
FilePath = Path
TaskList = List[ParentTask]
SpecList = List[SpecData]
