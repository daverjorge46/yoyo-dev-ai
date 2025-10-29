"""
Unit tests for Yoyo Dev TUI v3.0 data models.
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path

from lib.yoyo_tui_v3.models import (
    # Enums
    ErrorType,
    ActionType,
    SpecStatus,
    TaskStatus,
    EventType,

    # Models
    Task,
    Spec,
    Fix,
    ActiveWork,
    CommandSuggestion,
    DetectedError,
    HistoryEntry,
    ExecutionState,
    MCPServerStatus,
    ProjectStats,
    GitStatus,
    Event,
    TUIConfig,

    # Helpers
    calculate_progress,
    calculate_eta,
    format_timestamp,
)


# ============================================================================
# Test Helper Functions
# ============================================================================

def test_calculate_progress_zero_subtasks():
    """Test progress calculation with zero subtasks."""
    assert calculate_progress(0, 0) == 0.0


def test_calculate_progress_partial():
    """Test progress calculation with partial completion."""
    assert calculate_progress(3, 7) == pytest.approx(42.857, rel=0.01)


def test_calculate_progress_complete():
    """Test progress calculation with all subtasks completed."""
    assert calculate_progress(7, 7) == 100.0


def test_calculate_eta_default():
    """Test ETA calculation with default 3 min per subtask."""
    assert calculate_eta(5) == 15  # 5 * 3


def test_calculate_eta_custom():
    """Test ETA calculation with custom minutes per subtask."""
    assert calculate_eta(10, minutes_per_subtask=5) == 50


def test_format_timestamp_just_now():
    """Test timestamp formatting for recent time."""
    now = datetime.now()
    assert format_timestamp(now) == "just now"


def test_format_timestamp_minutes_ago():
    """Test timestamp formatting for minutes ago."""
    past = datetime.now() - timedelta(minutes=15)
    assert format_timestamp(past) == "15 min ago"


def test_format_timestamp_hours_ago():
    """Test timestamp formatting for hours ago."""
    past = datetime.now() - timedelta(hours=3)
    assert format_timestamp(past) == "3 hr ago"


def test_format_timestamp_days_ago():
    """Test timestamp formatting for days ago."""
    past = datetime.now() - timedelta(days=2)
    assert format_timestamp(past) == "2 days ago"


# ============================================================================
# Test Data Models
# ============================================================================

def test_task_creation():
    """Test Task model creation with defaults."""
    task = Task(
        id="1",
        title="Test Task",
        subtasks=["Subtask 1", "Subtask 2"],
        status=TaskStatus.PENDING
    )
    assert task.id == "1"
    assert task.title == "Test Task"
    assert len(task.subtasks) == 2
    assert task.status == TaskStatus.PENDING
    assert task.dependencies == []
    assert task.parallel_safe is True


def test_spec_creation():
    """Test Spec model creation."""
    spec = Spec(
        name="test-spec",
        date="2025-10-29",
        path=Path("/test/path"),
        status=SpecStatus.IN_PROGRESS
    )
    assert spec.name == "test-spec"
    assert spec.date == "2025-10-29"
    assert spec.status == SpecStatus.IN_PROGRESS
    assert spec.progress == 0.0
    assert spec.pr_url is None


def test_command_suggestion_priority():
    """Test CommandSuggestion model with priority."""
    suggestion = CommandSuggestion(
        command="/execute-tasks",
        reason="Tasks are ready",
        priority=1,
        icon="🚀"
    )
    assert suggestion.command == "/execute-tasks"
    assert suggestion.priority == 1
    assert suggestion.icon == "🚀"


def test_detected_error_severity():
    """Test DetectedError model with different severities."""
    error = DetectedError(
        type=ErrorType.TEST,
        message="Test failed",
        file="test_example.py",
        timestamp=datetime.now(),
        suggested_fix="/create-fix",
        severity="high"
    )
    assert error.type == ErrorType.TEST
    assert error.severity == "high"
    assert error.suggested_fix == "/create-fix"


def test_execution_state_progress():
    """Test ExecutionState progress calculation."""
    state = ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1",
        subtask_current="Subtask 2",
        subtasks_completed=2,
        subtasks_total=7,
        progress=calculate_progress(2, 7),
        started_at=datetime.now(),
        eta_minutes=calculate_eta(5)
    )
    assert state.active is True
    assert state.subtasks_completed == 2
    assert state.subtasks_total == 7
    assert state.progress == pytest.approx(28.571, rel=0.01)
    assert state.eta_minutes == 15  # 5 remaining * 3 min


def test_mcp_server_status_connected():
    """Test MCPServerStatus for connected server."""
    status = MCPServerStatus(
        connected=True,
        server_name="claude-mcp-server",
        last_check=datetime.now()
    )
    assert status.connected is True
    assert status.server_name == "claude-mcp-server"
    assert status.error_message is None


def test_mcp_server_status_disconnected():
    """Test MCPServerStatus for disconnected server."""
    status = MCPServerStatus(
        connected=False,
        server_name=None,
        last_check=datetime.now(),
        error_message="Connection failed"
    )
    assert status.connected is False
    assert status.server_name is None
    assert status.error_message == "Connection failed"


def test_history_entry_success():
    """Test HistoryEntry for successful action."""
    entry = HistoryEntry(
        timestamp=datetime.now(),
        action_type=ActionType.TASK,
        description="Completed task 1.1",
        success=True
    )
    assert entry.action_type == ActionType.TASK
    assert entry.success is True
    assert entry.details is None


def test_active_work_spec():
    """Test ActiveWork for active spec."""
    work = ActiveWork(
        type="spec",
        name="test-spec",
        path=Path("/test/path"),
        tasks=[],
        progress=45.0,
        status="in_progress"
    )
    assert work.type == "spec"
    assert work.name == "test-spec"
    assert work.progress == 45.0
    assert work.status == "in_progress"


def test_active_work_none():
    """Test ActiveWork for no active work."""
    work = ActiveWork(
        type="none",
        name="",
        path=None,
        tasks=[],
        progress=0.0,
        status="pending"
    )
    assert work.type == "none"
    assert work.path is None


def test_project_stats():
    """Test ProjectStats model."""
    stats = ProjectStats(
        active_specs=2,
        active_fixes=1,
        pending_tasks=5,
        recent_errors=0
    )
    assert stats.active_specs == 2
    assert stats.active_fixes == 1
    assert stats.pending_tasks == 5
    assert stats.recent_errors == 0


def test_git_status_clean():
    """Test GitStatus for clean repository."""
    status = GitStatus(
        current_branch="main",
        has_uncommitted_changes=False,
        has_conflicts=False
    )
    assert status.current_branch == "main"
    assert status.has_uncommitted_changes is False
    assert status.has_conflicts is False


def test_git_status_conflicts():
    """Test GitStatus with conflicts."""
    status = GitStatus(
        current_branch="feature-branch",
        has_uncommitted_changes=True,
        has_conflicts=True,
        ahead_behind="ahead 2, behind 1"
    )
    assert status.has_conflicts is True
    assert status.ahead_behind == "ahead 2, behind 1"


def test_event_creation():
    """Test Event model creation."""
    event = Event(
        event_type=EventType.STATE_UPDATED,
        data={"source": "test"}
    )
    assert event.event_type == EventType.STATE_UPDATED
    assert event.data == {"source": "test"}
    assert isinstance(event.timestamp, datetime)


def test_tui_config_defaults():
    """Test TUIConfig default values."""
    config = TUIConfig()
    assert config.terminal_width == 120
    assert config.refresh_interval_seconds == 10
    assert config.cache_ttl_seconds == 10
    assert config.file_watching is False  # Disabled in Phase 1
    assert config.mcp_monitoring is True
    assert config.error_detection is True
    assert config.lazy_loading is True
    assert config.max_history_entries == 10


def test_tui_config_custom():
    """Test TUIConfig with custom values."""
    config = TUIConfig(
        terminal_width=80,
        refresh_interval_seconds=5,
        cache_ttl_seconds=30,
        mcp_monitoring=False
    )
    assert config.terminal_width == 80
    assert config.refresh_interval_seconds == 5
    assert config.cache_ttl_seconds == 30
    assert config.mcp_monitoring is False


# ============================================================================
# Test Enums
# ============================================================================

def test_error_type_enum():
    """Test ErrorType enum values."""
    assert ErrorType.TEST.value == "test"
    assert ErrorType.GIT.value == "git"
    assert ErrorType.DEPENDENCY.value == "dependency"


def test_action_type_enum():
    """Test ActionType enum values."""
    assert ActionType.SPEC.value == "spec"
    assert ActionType.TASK.value == "task"
    assert ActionType.GIT.value == "git"
    assert ActionType.FIX.value == "fix"
    assert ActionType.COMMAND.value == "command"


def test_spec_status_enum():
    """Test SpecStatus enum values."""
    assert SpecStatus.PENDING.value == "pending"
    assert SpecStatus.IN_PROGRESS.value == "in_progress"
    assert SpecStatus.COMPLETED.value == "completed"


def test_task_status_enum():
    """Test TaskStatus enum values."""
    assert TaskStatus.PENDING.value == "pending"
    assert TaskStatus.IN_PROGRESS.value == "in_progress"
    assert TaskStatus.COMPLETED.value == "completed"


def test_event_type_enum():
    """Test EventType enum values."""
    assert EventType.STATE_UPDATED.value == "state_updated"
    assert EventType.SPEC_CREATED.value == "spec_created"
    assert EventType.TASK_STARTED.value == "task_started"
    assert EventType.ERROR_DETECTED.value == "error_detected"
    assert EventType.MCP_STATUS_CHANGED.value == "mcp_status_changed"
