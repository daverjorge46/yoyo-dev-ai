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
        source_type: Type of source ("spec", "fix", "master", or "unknown")
        spec_name: Clean name of spec (without date prefix) if source is spec
        fix_name: Clean name of fix (without date prefix) if source is fix
    """
    file_path: Path
    parent_tasks: List[ParentTask] = field(default_factory=list)
    total_tasks: int = 0
    completed_tasks: int = 0
    total_subtasks: int = 0
    completed_subtasks: int = 0
    progress: int = 0
    source_type: Optional[str] = None
    spec_name: Optional[str] = None
    fix_name: Optional[str] = None

    def __post_init__(self):
        """Auto-populate metadata from file_path if not already set."""
        if self.source_type is None and self.file_path and self.file_path != Path():
            self._extract_metadata_from_path()

    def _extract_metadata_from_path(self):
        """
        Extract source metadata from file path.

        Populates source_type, spec_name, and fix_name based on file path structure.
        """
        try:
            path_parts = self.file_path.parts

            # Check if path contains .yoyo-dev
            if ".yoyo-dev" in path_parts:
                yoyo_idx = path_parts.index(".yoyo-dev")

                # Check for specs
                if yoyo_idx + 1 < len(path_parts) and path_parts[yoyo_idx + 1] == "specs":
                    if yoyo_idx + 2 < len(path_parts):
                        folder_name = path_parts[yoyo_idx + 2]
                        self.source_type = "spec"
                        self.spec_name = self._extract_clean_name(folder_name)
                        return

                # Check for fixes
                if yoyo_idx + 1 < len(path_parts) and path_parts[yoyo_idx + 1] == "fixes":
                    if yoyo_idx + 2 < len(path_parts):
                        folder_name = path_parts[yoyo_idx + 2]
                        self.source_type = "fix"
                        self.fix_name = self._extract_clean_name(folder_name)
                        return

            # Check if it's MASTER-TASKS.md
            if self.file_path.name == "MASTER-TASKS.md":
                self.source_type = "master"
                return

            # Unknown source
            self.source_type = "unknown"

        except Exception:
            self.source_type = "unknown"

    @staticmethod
    def _extract_clean_name(folder_name: str) -> str:
        """
        Extract clean name from folder name by removing date prefix.

        Converts "2025-10-15-feature-name" to "feature-name".

        Args:
            folder_name: Folder name with date prefix

        Returns:
            Clean name without date prefix
        """
        parts = folder_name.split('-')

        # If we have at least 4 parts (YYYY-MM-DD-name), remove date
        if len(parts) >= 4:
            # Check if first part looks like a year (4 digits)
            if len(parts[0]) == 4 and parts[0].isdigit():
                # Return everything after the date (parts[3:])
                return '-'.join(parts[3:])

        # Return original if no date pattern found
        return folder_name

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
    Specification metadata parsed from spec folder.

    Attributes:
        name: Clean spec name (without date prefix, e.g., "test-feature")
        folder_path: Path to spec folder
        created_date: Date in YYYY-MM-DD format
        title: Spec title from spec.md (first H1)
        status: Current status from state.json ("pending", "in_progress", "complete")
        progress: Completion percentage (0-100) from tasks
        total_tasks: Total number of parent tasks
        completed_tasks: Number of completed parent tasks
        has_technical_spec: Whether technical-spec.md exists
        has_database_schema: Whether database-schema.md exists
        has_api_spec: Whether api-spec.md exists
    """
    name: str
    folder_path: Path
    created_date: str
    title: str
    status: str = "pending"
    progress: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    has_technical_spec: bool = False
    has_database_schema: bool = False
    has_api_spec: bool = False

    @property
    def display_name(self) -> str:
        """Get shortened display name (already clean, without date)."""
        return self.name

    @property
    def icon(self) -> str:
        """Get emoji icon for spec."""
        return "📄"

    @property
    def folder_name(self) -> str:
        """Get folder name with date prefix."""
        return self.folder_path.name if self.folder_path else ""


@dataclass
class FixData:
    """
    Fix metadata parsed from fix folder.

    Attributes:
        name: Clean fix name (without date prefix, e.g., "test-fix")
        folder_path: Path to fix folder
        created_date: Date in YYYY-MM-DD format
        title: Fix title from analysis.md (first H1)
        problem_summary: Brief problem description from analysis.md
        status: Current status from state.json ("pending", "in_progress", "complete")
        progress: Completion percentage (0-100) from tasks
        total_tasks: Total number of parent tasks
        completed_tasks: Number of completed parent tasks
    """
    name: str
    folder_path: Path
    created_date: str
    title: str
    problem_summary: str
    status: str = "pending"
    progress: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0

    @property
    def display_name(self) -> str:
        """Get shortened display name (already clean, without date)."""
        return self.name

    @property
    def icon(self) -> str:
        """Get emoji icon for fix."""
        return "🔧"

    @property
    def folder_name(self) -> str:
        """Get folder name with date prefix."""
        return self.folder_path.name if self.folder_path else ""


@dataclass
class RecapData:
    """
    Recap metadata parsed from recap file.

    Attributes:
        name: Clean recap name (without date prefix, e.g., "test-recap")
        file_path: Path to recap file
        created_date: Date in YYYY-MM-DD format
        title: Recap title from file (first H1)
        summary: Brief summary from recap
        patterns_extracted: Number of patterns extracted
    """
    name: str
    file_path: Path
    created_date: str
    title: str
    summary: str
    patterns_extracted: int = 0

    @property
    def display_name(self) -> str:
        """Get shortened display name (already clean, without date)."""
        return self.name

    @property
    def icon(self) -> str:
        """Get emoji icon for recap."""
        return "📝"

    @property
    def file_name(self) -> str:
        """Get file name with date prefix."""
        return self.file_path.name if self.file_path else ""


@dataclass
class ExecutionProgress:
    """
    Execution progress tracking data.

    Attributes:
        is_running: Whether execution is currently running
        spec_or_fix_name: Name of spec or fix being executed
        current_phase: Current phase (e.g., "implementation", "testing")
        current_parent_task: Current parent task number
        current_subtask: Current subtask text
        total_parent_tasks: Total number of parent tasks
        total_subtasks: Total number of subtasks
        percentage: Overall completion percentage (0-100)
        current_action: Current action description
        started_at: ISO timestamp when execution started
        last_updated: ISO timestamp of last update
    """
    is_running: bool = False
    spec_or_fix_name: Optional[str] = None
    current_phase: Optional[str] = None
    current_parent_task: Optional[int] = None
    current_subtask: Optional[str] = None
    total_parent_tasks: int = 0
    total_subtasks: int = 0
    percentage: int = 0
    current_action: Optional[str] = None
    started_at: Optional[str] = None
    last_updated: Optional[str] = None

    @classmethod
    def empty(cls) -> 'ExecutionProgress':
        """Create an empty ExecutionProgress instance."""
        return cls(is_running=False)

    @property
    def display_status(self) -> str:
        """Get human-readable status text."""
        if not self.is_running:
            return "Idle"

        if self.current_action:
            return self.current_action

        if self.current_subtask:
            return f"Task {self.current_parent_task}: {self.current_subtask}"

        return f"Phase: {self.current_phase}"


@dataclass
class ProcessStatus:
    """
    Running process status information.

    Used by ProcessMonitor to track /execute-tasks and other long-running processes.

    Attributes:
        pid: Process ID
        command: Command being executed (e.g., "/execute-tasks")
        spec_name: Spec or fix name
        status: Current status (running, completed, failed)
        progress: Progress percentage (0-100)
        current_task: Current task description
        started_at: ISO timestamp when process started
        completed_at: ISO timestamp when process completed
    """
    pid: int
    command: str
    spec_name: str
    status: str = "running"  # running, completed, failed
    progress: int = 0
    current_task: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    @property
    def is_running(self) -> bool:
        """Check if process is still running."""
        return self.status == "running"

    @property
    def display_name(self) -> str:
        """Get human-readable process name."""
        return f"{self.command}: {self.spec_name}"


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
FixList = List[FixData]
RecapList = List[RecapData]


# ============================================================================
# Event System Models (for EventBus integration)
# ============================================================================

from enum import Enum
from datetime import datetime
from typing import Any, Dict


class EventType(Enum):
    """All event types in the TUI dashboard."""

    # File system events
    FILE_CHANGED = "file_changed"
    FILE_CREATED = "file_created"
    FILE_DELETED = "file_deleted"

    # State change events
    STATE_UPDATED = "state_updated"
    SPEC_CREATED = "spec_created"
    FIX_CREATED = "fix_created"
    TASK_COMPLETED = "task_completed"

    # Execution events
    EXECUTION_STARTED = "execution_started"

    # Process monitoring events
    PROCESS_STARTED = "process_started"
    PROCESS_PROGRESS = "process_progress"
    PROCESS_COMPLETED = "process_completed"
    EXECUTION_PROGRESS = "execution_progress"
    EXECUTION_COMPLETED = "execution_completed"

    # Cache events
    CACHE_INVALIDATED = "cache_invalidated"
    CACHE_CLEARED = "cache_cleared"


@dataclass
class Event:
    """
    Event data structure.

    Represents a single event in the system with metadata.
    """

    event_type: EventType
    data: Dict[str, Any]
    timestamp: datetime
    source: str  # Component that emitted the event


@dataclass
class ApplicationState:
    """
    Centralized application state.

    Contains all loaded data for the TUI dashboard:
    - Specs from .yoyo-dev/specs/
    - Fixes from .yoyo-dev/fixes/
    - Tasks from various sources
    - Recaps from .yoyo-dev/recaps/
    - Execution progress (if running)
    - Git status

    Attributes:
        specs: List of all specs
        fixes: List of all fixes
        tasks: List of all task data
        recaps: List of all recaps
        execution_progress: Current execution progress (if any)
        git_status: Current git status (if available)
        last_updated: Timestamp of last update
    """
    specs: List[SpecData] = field(default_factory=list)
    fixes: List[FixData] = field(default_factory=list)
    tasks: List[TaskData] = field(default_factory=list)
    recaps: List[RecapData] = field(default_factory=list)
    execution_progress: Optional[ExecutionProgress] = None
    git_status: Optional[GitStatus] = None
    last_updated: datetime = field(default_factory=datetime.now)
