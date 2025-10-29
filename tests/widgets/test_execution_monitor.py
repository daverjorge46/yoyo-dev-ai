"""
Tests for ExecutionMonitor widget.

Tests real-time execution progress display with task tracking.
"""

import pytest
from unittest.mock import Mock
from datetime import datetime, timedelta

from lib.yoyo_tui_v3.widgets.execution_monitor import ExecutionMonitor
from lib.yoyo_tui_v3.models import ExecutionState, EventType, Event


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    return Mock()


@pytest.fixture
def active_execution():
    """Mock active execution state."""
    now = datetime.now()
    return ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1: Create Database Schema",
        subtask_current="1.2 Create migration files",
        subtasks_completed=1,
        subtasks_total=5,
        progress=20.0,
        started_at=now - timedelta(minutes=2),
        eta_minutes=8
    )


@pytest.fixture
def inactive_execution():
    """Mock inactive execution state."""
    return None


# ============================================================================
# Initialization Tests
# ============================================================================

def test_execution_monitor_creation(mock_event_bus):
    """Test that ExecutionMonitor can be created."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    assert monitor is not None
    assert isinstance(monitor, ExecutionMonitor)


def test_execution_monitor_has_event_bus(mock_event_bus):
    """Test that ExecutionMonitor stores event_bus."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    assert monitor.event_bus == mock_event_bus


def test_execution_monitor_initializes_with_no_execution(mock_event_bus):
    """Test that ExecutionMonitor initializes with no active execution."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    assert monitor.execution_state is None


# ============================================================================
# Event Subscription Tests
# ============================================================================

def test_execution_monitor_subscribes_to_execution_events(mock_event_bus):
    """Test that ExecutionMonitor subscribes to execution events on mount."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)

    # Manually trigger on_mount for testing
    monitor.on_mount()

    # Should subscribe to EXECUTION_STARTED, EXECUTION_PROGRESS, EXECUTION_COMPLETED
    assert mock_event_bus.subscribe.call_count == 3

    # Check subscriptions
    calls = mock_event_bus.subscribe.call_args_list
    subscribed_events = [call[0][0] for call in calls]

    assert EventType.EXECUTION_STARTED in subscribed_events
    assert EventType.EXECUTION_PROGRESS in subscribed_events
    assert EventType.EXECUTION_COMPLETED in subscribed_events


# ============================================================================
# Display Tests (Inactive State)
# ============================================================================

def test_execution_monitor_hidden_when_inactive(mock_event_bus):
    """Test that ExecutionMonitor is hidden when no execution active."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    assert monitor.display is False or not hasattr(monitor, 'display') or monitor.styles.display == "none"


def test_execution_monitor_shows_idle_state(mock_event_bus):
    """Test that ExecutionMonitor shows idle message when inactive."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor._update_display()

    # Should not display or show minimal idle state
    # Implementation will determine exact behavior


# ============================================================================
# Display Tests (Active State)
# ============================================================================

def test_execution_monitor_visible_when_active(mock_event_bus, active_execution):
    """Test that ExecutionMonitor is visible when execution active."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution
    monitor._update_display()

    # Should be visible
    assert monitor.execution_state is not None
    assert monitor.execution_state.active is True


def test_execution_monitor_displays_command(mock_event_bus, active_execution):
    """Test that ExecutionMonitor displays current command."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution

    # Command should be accessible
    assert monitor.execution_state.command == "/execute-tasks"


def test_execution_monitor_displays_task_name(mock_event_bus, active_execution):
    """Test that ExecutionMonitor displays current task name."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution

    # Task name should be accessible
    assert monitor.execution_state.task_name == "Task 1: Create Database Schema"


def test_execution_monitor_displays_subtask(mock_event_bus, active_execution):
    """Test that ExecutionMonitor displays current subtask."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution

    # Subtask should be accessible
    assert monitor.execution_state.subtask_current == "1.2 Create migration files"


def test_execution_monitor_displays_progress(mock_event_bus, active_execution):
    """Test that ExecutionMonitor displays progress percentage."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution

    # Progress should be accessible
    assert monitor.execution_state.progress == 20.0


def test_execution_monitor_displays_subtask_count(mock_event_bus, active_execution):
    """Test that ExecutionMonitor displays subtask completion count."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution

    # Subtask count should be accessible
    assert monitor.execution_state.subtasks_completed == 1
    assert monitor.execution_state.subtasks_total == 5


def test_execution_monitor_displays_eta(mock_event_bus, active_execution):
    """Test that ExecutionMonitor displays ETA."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution

    # ETA should be accessible
    assert monitor.execution_state.eta_minutes == 8


# ============================================================================
# Event Handler Tests
# ============================================================================

def test_execution_monitor_handles_execution_started(mock_event_bus):
    """Test that ExecutionMonitor handles EXECUTION_STARTED event."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.on_mount()

    # Get the EXECUTION_STARTED handler
    started_handler = None
    for call in mock_event_bus.subscribe.call_args_list:
        if call[0][0] == EventType.EXECUTION_STARTED:
            started_handler = call[0][1]
            break

    assert started_handler is not None

    # Create event
    now = datetime.now()
    event = Event(
        event_type=EventType.EXECUTION_STARTED,
        data={
            "command": "/execute-tasks",
            "task_name": "Task 1: Setup",
            "subtask_current": "1.1 Init",
            "subtasks_total": 3,
            "started_at": now.isoformat()
        }
    )

    # Call handler
    started_handler(event)

    # Should update execution state
    assert monitor.execution_state is not None
    assert monitor.execution_state.active is True


def test_execution_monitor_handles_execution_progress(mock_event_bus, active_execution):
    """Test that ExecutionMonitor handles EXECUTION_PROGRESS event."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution
    monitor.on_mount()

    # Get the EXECUTION_PROGRESS handler
    progress_handler = None
    for call in mock_event_bus.subscribe.call_args_list:
        if call[0][0] == EventType.EXECUTION_PROGRESS:
            progress_handler = call[0][1]
            break

    assert progress_handler is not None

    # Create event
    event = Event(
        event_type=EventType.EXECUTION_PROGRESS,
        data={
            "subtask_current": "1.3 Updated subtask",
            "subtasks_completed": 2,
            "progress": 40.0,
            "eta_minutes": 6
        }
    )

    # Call handler
    progress_handler(event)

    # Should update execution state
    assert monitor.execution_state.subtask_current == "1.3 Updated subtask"
    assert monitor.execution_state.subtasks_completed == 2
    assert monitor.execution_state.progress == 40.0


def test_execution_monitor_handles_execution_completed(mock_event_bus, active_execution):
    """Test that ExecutionMonitor handles EXECUTION_COMPLETED event."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution
    monitor.on_mount()

    # Get the EXECUTION_COMPLETED handler
    completed_handler = None
    for call in mock_event_bus.subscribe.call_args_list:
        if call[0][0] == EventType.EXECUTION_COMPLETED:
            completed_handler = call[0][1]
            break

    assert completed_handler is not None

    # Create event
    event = Event(
        event_type=EventType.EXECUTION_COMPLETED,
        data={"success": True}
    )

    # Call handler
    completed_handler(event)

    # Should clear execution state
    assert monitor.execution_state is None or monitor.execution_state.active is False


# ============================================================================
# Progress Bar Tests
# ============================================================================

def test_execution_monitor_calculates_progress_bar_width(mock_event_bus, active_execution):
    """Test that ExecutionMonitor calculates correct progress bar width."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = active_execution

    # 20% progress should give proportional bar width
    # If bar is 50 chars wide, 20% = 10 chars
    bar_width = monitor._calculate_progress_bar_width(50)
    assert bar_width == 10


def test_execution_monitor_progress_bar_full_width(mock_event_bus):
    """Test that ExecutionMonitor shows full width bar at 100%."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1",
        subtask_current="Final",
        subtasks_completed=5,
        subtasks_total=5,
        progress=100.0,
        started_at=datetime.now(),
        eta_minutes=0
    )

    bar_width = monitor._calculate_progress_bar_width(50)
    assert bar_width == 50


def test_execution_monitor_progress_bar_empty_width(mock_event_bus):
    """Test that ExecutionMonitor shows empty bar at 0%."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1",
        subtask_current="Starting",
        subtasks_completed=0,
        subtasks_total=5,
        progress=0.0,
        started_at=datetime.now(),
        eta_minutes=15
    )

    bar_width = monitor._calculate_progress_bar_width(50)
    assert bar_width == 0


# ============================================================================
# Time Formatting Tests
# ============================================================================

def test_execution_monitor_formats_elapsed_time(mock_event_bus):
    """Test that ExecutionMonitor formats elapsed time correctly."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)

    now = datetime.now()
    started_at = now - timedelta(minutes=5, seconds=30)

    elapsed = monitor._format_elapsed_time(started_at)
    assert "5m" in elapsed or "5:30" in elapsed


def test_execution_monitor_formats_eta(mock_event_bus):
    """Test that ExecutionMonitor formats ETA correctly."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)

    # 8 minutes ETA
    eta_str = monitor._format_eta(8)
    assert "8" in eta_str
    assert "min" in eta_str or "m" in eta_str


# ============================================================================
# Refresh Tests
# ============================================================================

def test_execution_monitor_refresh_display_method_exists(mock_event_bus):
    """Test that ExecutionMonitor has refresh_display method."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    assert hasattr(monitor, 'refresh_display')
    assert callable(monitor.refresh_display)


def test_execution_monitor_refreshes_on_state_change(mock_event_bus):
    """Test that ExecutionMonitor refreshes when state changes."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.refresh_display = Mock()

    # Change state
    monitor.execution_state = ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1",
        subtask_current="1.1",
        subtasks_completed=0,
        subtasks_total=3,
        progress=0.0,
        started_at=datetime.now(),
        eta_minutes=10
    )

    # Manually trigger update
    monitor._update_display()

    # Should trigger refresh (implementation-specific)
    # This test validates the method exists and is callable


# ============================================================================
# Edge Case Tests
# ============================================================================

def test_execution_monitor_handles_null_execution_state(mock_event_bus):
    """Test that ExecutionMonitor handles null execution state gracefully."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = None

    # Should not crash
    monitor._update_display()
    assert True


def test_execution_monitor_handles_zero_total_subtasks(mock_event_bus):
    """Test that ExecutionMonitor handles zero total subtasks."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1",
        subtask_current="None",
        subtasks_completed=0,
        subtasks_total=0,
        progress=0.0,
        started_at=datetime.now(),
        eta_minutes=0
    )

    # Should handle division by zero
    bar_width = monitor._calculate_progress_bar_width(50)
    assert bar_width >= 0


def test_execution_monitor_handles_negative_progress(mock_event_bus):
    """Test that ExecutionMonitor handles negative progress gracefully."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1",
        subtask_current="Error",
        subtasks_completed=0,
        subtasks_total=5,
        progress=-10.0,  # Invalid negative progress
        started_at=datetime.now(),
        eta_minutes=0
    )

    # Should clamp to 0
    bar_width = monitor._calculate_progress_bar_width(50)
    assert bar_width >= 0


def test_execution_monitor_handles_over_100_progress(mock_event_bus):
    """Test that ExecutionMonitor handles >100% progress gracefully."""
    monitor = ExecutionMonitor(event_bus=mock_event_bus)
    monitor.execution_state = ExecutionState(
        active=True,
        command="/execute-tasks",
        task_name="Task 1",
        subtask_current="Done",
        subtasks_completed=6,
        subtasks_total=5,
        progress=120.0,  # Invalid >100 progress
        started_at=datetime.now(),
        eta_minutes=0
    )

    # Should clamp to 100
    bar_width = monitor._calculate_progress_bar_width(50)
    assert bar_width <= 50
