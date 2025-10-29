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


@dataclass
class Spec:
    """Represents a feature specification."""
    name: str
    date: str
    path: Path
    status: SpecStatus
    tasks: List[Task] = field(default_factory=list)
    progress: float = 0.0  # 0-100
    pr_url: Optional[str] = None


@dataclass
class Fix:
    """Represents a bug fix."""
    name: str
    date: str
    path: Path
    status: SpecStatus  # Reuse SpecStatus
    tasks: List[Task] = field(default_factory=list)
    progress: float = 0.0  # 0-100
    pr_url: Optional[str] = None


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
