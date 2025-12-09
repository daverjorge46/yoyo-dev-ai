"""
Data models for Yoyo Dev TUI v3.0

All data models used across the TUI application for type safety and consistency.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import List, Optional, Literal


# ============================================================================
# Enums
# ============================================================================

class ErrorType(Enum):
    """Type of detected error."""
    TEST = "test"
    GIT = "git"
    DEPENDENCY = "dependency"


class ActionType(Enum):
    """Type of user action in history."""
    SPEC = "spec"
    TASK = "task"
    GIT = "git"
    FIX = "fix"
    COMMAND = "command"


class SpecStatus(Enum):
    """Status of a spec."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskStatus(Enum):
    """Status of a task."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# ============================================================================
# Core Data Models
# ============================================================================

@dataclass
class Task:
    """Represents a task from tasks.md."""
    id: str
    title: str
    subtasks: List[str]
    status: TaskStatus
    dependencies: List[str] = field(default_factory=list)
    files_to_create: List[str] = field(default_factory=list)
    files_to_modify: List[str] = field(default_factory=list)
    parallel_safe: bool = True
    # Parent spec context (for detail views)
    spec_name: Optional[str] = None
    spec_date: Optional[str] = None
    # Subtask completion tracking
    completed_subtasks: List[int] = field(default_factory=list)  # Indices of completed subtasks


@dataclass
class Subtask:
    """Represents a subtask within a parent task."""
    text: str
    completed: bool


@dataclass
class ParentTask:
    """Represents a parent task with subtasks."""
    number: int
    name: str
    completed: bool
    subtasks: List[Subtask] = field(default_factory=list)


@dataclass
class Spec:
    """Represents a feature specification."""
    name: str
    created_date: str
    folder_path: Path
    title: str
    status: SpecStatus
    progress: float = 0.0  # 0-100
    total_tasks: int = 0
    completed_tasks: int = 0
    has_technical_spec: bool = False
    has_database_schema: bool = False
    has_api_spec: bool = False
    tasks: List[Task] = field(default_factory=list)
    pr_url: Optional[str] = None

    # Aliases for backward compatibility
    @property
    def date(self) -> str:
        """Alias for created_date."""
        return self.created_date

    @property
    def path(self) -> Path:
        """Alias for folder_path."""
        return self.folder_path


@dataclass
class Fix:
    """Represents a bug fix."""
    name: str
    created_date: str
    folder_path: Path
    title: str
    problem_summary: str
    status: SpecStatus  # Reuse SpecStatus
    progress: float = 0.0  # 0-100
    total_tasks: int = 0
    completed_tasks: int = 0
    tasks: List[Task] = field(default_factory=list)
    pr_url: Optional[str] = None

    # Aliases for backward compatibility
    @property
    def date(self) -> str:
        """Alias for created_date."""
        return self.created_date

    @property
    def path(self) -> Path:
        """Alias for folder_path."""
        return self.folder_path


@dataclass
class ActiveWork:
    """Current active spec or fix."""
    type: Literal["spec", "fix", "none"]
    name: str
    path: Optional[Path]
    tasks: List[Task]
    progress: float  # 0-100
    status: Literal["pending", "in_progress", "completed"]


@dataclass
class CommandSuggestion:
    """Intelligent command suggestion."""
    command: str  # e.g., "/execute-tasks"
    reason: str   # e.g., "Tasks are ready to execute"
    priority: int  # 1-5 (1=highest)
    icon: str      # Emoji icon


@dataclass
class DetectedError:
    """Detected error from ErrorDetector."""
    type: ErrorType
    message: str
    file: Optional[str]
    timestamp: datetime
    suggested_fix: str
    severity: Literal["low", "medium", "high", "critical"]


@dataclass
class HistoryEntry:
    """Entry in action history."""
    timestamp: datetime
    action_type: ActionType
    description: str
    success: bool
    details: Optional[str] = None


@dataclass
class ExecutionState:
    """State of current task execution."""
    active: bool
    command: str  # e.g., "/execute-tasks"
    task_name: str
    subtask_current: str
    subtasks_completed: int
    subtasks_total: int
    progress: float  # 0-100
    started_at: datetime
    eta_minutes: int


@dataclass
class MCPServerStatus:
    """MCP server connection status."""
    connected: bool
    server_name: Optional[str]
    last_check: datetime
    error_message: Optional[str] = None
    enabled_servers: Optional[List[str]] = None  # List of enabled server names


@dataclass
class ProjectStats:
    """Quick stats for project overview."""
    active_specs: int
    active_fixes: int
    pending_tasks: int
    recent_errors: int


@dataclass
class GitStatus:
    """Git repository status."""
    current_branch: str
    has_uncommitted_changes: bool
    has_conflicts: bool
    ahead_behind: Optional[str] = None  # e.g., "ahead 2, behind 1"


# ============================================================================
# Event Models (for EventBus)
# ============================================================================

class EventType(Enum):
    """Event types for EventBus."""
    # State events
    STATE_UPDATED = "state_updated"

    # Spec/Fix events
    SPEC_CREATED = "spec_created"
    SPEC_UPDATED = "spec_updated"
    FIX_CREATED = "fix_created"
    FIX_UPDATED = "fix_updated"

    # Task events
    TASK_STARTED = "task_started"
    TASK_COMPLETED = "task_completed"

    # File events
    FILE_CHANGED = "file_changed"
    FILE_CREATED = "file_created"
    FILE_DELETED = "file_deleted"

    # Error events
    ERROR_DETECTED = "error_detected"

    # Command events
    COMMAND_SUGGESTIONS_UPDATED = "command_suggestions_updated"

    # MCP events
    MCP_STATUS_CHANGED = "mcp_status_changed"

    # Execution events
    EXECUTION_STARTED = "execution_started"
    EXECUTION_PROGRESS = "execution_progress"
    EXECUTION_COMPLETED = "execution_completed"


@dataclass
class Event:
    """Generic event for EventBus."""
    event_type: EventType
    data: dict
    timestamp: datetime = field(default_factory=datetime.now)
    source: str = "unknown"


@dataclass
class TaskFileData:
    """
    Represents parsed data from a tasks.md file.

    This is different from individual Task objects - it contains
    metadata about the entire tasks file including all parent tasks,
    progress statistics, and source information.
    """
    file_path: Path
    parent_tasks: List[ParentTask] = field(default_factory=list)
    total_tasks: int = 0
    completed_tasks: int = 0
    total_subtasks: int = 0
    completed_subtasks: int = 0
    progress: int = 0  # 0-100
    source_type: Optional[str] = None  # "spec", "fix", "master", "unknown"
    spec_name: Optional[str] = None
    fix_name: Optional[str] = None

    @staticmethod
    def empty() -> 'TaskFileData':
        """Return empty TaskFileData for error cases."""
        from pathlib import Path
        return TaskFileData(file_path=Path("/dev/null"))


# ============================================================================
# Type Aliases (for DataManager compatibility)
# ============================================================================

# Type aliases used by DataManager service layer
SpecData = Spec
FixData = Fix
TaskData = TaskFileData  # TaskData refers to parsed tasks.md file data
RecapData = dict  # Recap entries are stored as dictionaries
ExecutionProgress = ExecutionState  # Execution progress tracking


# ============================================================================
# Application State Model
# ============================================================================

@dataclass
class ApplicationState:
    """Application-wide state container."""
    specs: List['Spec'] = field(default_factory=list)
    fixes: List['Fix'] = field(default_factory=list)
    recaps: List[dict] = field(default_factory=list)
    tasks: List['Task'] = field(default_factory=list)  # Added tasks list
    execution_progress: Optional[dict] = None
    last_updated: datetime = field(default_factory=datetime.now)


# ============================================================================
# Configuration Models
# ============================================================================

@dataclass
class TUIConfig:
    """TUI configuration."""
    # Display settings
    terminal_width: int = 120
    color_scheme: str = "default"
    show_timestamps: bool = True

    # Refresh settings
    refresh_interval_seconds: int = 10
    cache_ttl_seconds: int = 10

    # Feature flags
    file_watching: bool = False  # Disabled in Phase 1
    mcp_monitoring: bool = True
    error_detection: bool = True

    # Paths
    yoyo_dev_path: Path = Path.cwd() / ".yoyo-dev"

    # Performance settings
    lazy_loading: bool = True
    max_history_entries: int = 10


# ============================================================================
# Helper Functions
# ============================================================================

def calculate_progress(completed_subtasks: int, total_subtasks: int) -> float:
    """Calculate progress percentage."""
    if total_subtasks == 0:
        return 0.0
    return (completed_subtasks / total_subtasks) * 100.0


def calculate_eta(remaining_subtasks: int, minutes_per_subtask: int = 3) -> int:
    """Calculate ETA in minutes (simple heuristic)."""
    return remaining_subtasks * minutes_per_subtask


def format_timestamp(dt: datetime) -> str:
    """Format timestamp for display (e.g., '2 min ago')."""
    now = datetime.now()
    diff = now - dt

    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} min ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hr ago"
    else:
        days = seconds // 86400
        return f"{days} day{'s' if days > 1 else ''} ago"
