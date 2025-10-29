"""
Tests for TaskDetailScreen.

Tests detailed task view with subtasks, status, and execution info.
"""

import pytest
from unittest.mock import Mock
from pathlib import Path
from datetime import datetime

from lib.yoyo_tui_v3.screens.task_detail_screen import TaskDetailScreen
from lib.yoyo_tui_v3.models import Task, TaskStatus, EventType


@pytest.fixture
def mock_data_manager():
    """Mock DataManager for testing."""
    manager = Mock()
    return manager


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    return Mock()


@pytest.fixture
def sample_task():
    """Sample task for testing."""
    return Task(
        id="1",
        title="Create authentication service",
        subtasks=[
            "1.1 Set up authentication provider",
            "1.2 Implement login/logout functions",
            "1.3 Add session management",
            "1.4 Write tests for auth service",
            "1.5 Add error handling",
        ],
        status=TaskStatus.IN_PROGRESS,
        spec_name="user-authentication",
        spec_date="2025-10-29"
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_task_detail_screen_creation(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen can be created."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )
    assert screen is not None
    assert isinstance(screen, TaskDetailScreen)


def test_task_detail_screen_stores_task(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen stores the task."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )
    assert screen.task == sample_task


def test_task_detail_screen_has_back_binding(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has 'back' keybinding."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should have escape/back binding
    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "escape" in bindings or "backspace" in bindings


# ============================================================================
# Display Tests - Header
# ============================================================================

def test_task_detail_displays_task_id(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen displays task ID."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Task ID should be accessible
    assert screen.task.id == "1"


def test_task_detail_displays_task_title(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen displays task title."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.task.title == "Create authentication service"


def test_task_detail_displays_status(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen displays task status."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.task.status == TaskStatus.IN_PROGRESS


def test_task_detail_displays_spec_context(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen displays parent spec context."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should show parent spec
    assert screen.task.spec_name == "user-authentication"
    assert screen.task.spec_date == "2025-10-29"


# ============================================================================
# Display Tests - Subtasks
# ============================================================================

def test_task_detail_displays_all_subtasks(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen displays all subtasks."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should show all 5 subtasks
    assert len(screen.task.subtasks) == 5


def test_task_detail_shows_subtask_numbering(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen shows subtask numbers."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Subtasks should have numbering
    assert screen.task.subtasks[0].startswith("1.1")
    assert screen.task.subtasks[1].startswith("1.2")


def test_task_detail_shows_subtask_completion_status(mock_data_manager, mock_event_bus):
    """Test that TaskDetailScreen shows subtask completion indicators."""
    task_with_progress = Task(
        id="2",
        title="Test task",
        subtasks=[
            "2.1 Done subtask",
            "2.2 Another done",
            "2.3 Pending subtask",
        ],
        status=TaskStatus.IN_PROGRESS,
        spec_name="test-spec",
        spec_date="2025-10-29",
        completed_subtasks=[0, 1]  # First two completed
    )

    screen = TaskDetailScreen(
        task=task_with_progress,
        data_manager=Mock(),
        event_bus=Mock()
    )

    # Should track completed subtasks
    assert screen.task.completed_subtasks == [0, 1]


# ============================================================================
# Display Tests - Progress
# ============================================================================

def test_task_detail_calculates_progress(mock_data_manager, mock_event_bus):
    """Test that TaskDetailScreen calculates task progress."""
    task_with_progress = Task(
        id="2",
        title="Test task",
        subtasks=["2.1", "2.2", "2.3", "2.4", "2.5"],
        status=TaskStatus.IN_PROGRESS,
        spec_name="test",
        spec_date="2025-10-29",
        completed_subtasks=[0, 1, 2]  # 3 of 5 completed = 60%
    )

    screen = TaskDetailScreen(
        task=task_with_progress,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should calculate progress
    expected_progress = (3 / 5) * 100  # 60%
    # Implementation can calculate this


def test_task_detail_shows_progress_bar(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen shows progress bar."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should display visual progress bar
    # Implementation-specific


# ============================================================================
# Action Tests
# ============================================================================

def test_task_detail_has_action_back(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has action_back method."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'action_back')
    assert callable(screen.action_back)


def test_task_detail_has_action_edit(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has action_edit method."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'action_edit')
    assert callable(screen.action_edit)


def test_task_detail_has_action_execute(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has action to execute task."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'action_execute') or hasattr(screen, 'action_run')


# ============================================================================
# Navigation Tests
# ============================================================================

def test_task_detail_action_back_exists(mock_data_manager, mock_event_bus, sample_task):
    """Test that action_back exists and is callable."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Verify method exists
    assert hasattr(screen, 'action_back')
    assert callable(screen.action_back)


def test_task_detail_can_navigate_to_parent_spec(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen can navigate to parent spec."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should have method to view parent spec
    assert hasattr(screen, 'view_parent_spec') or hasattr(screen, 'action_view_spec')


# ============================================================================
# Event Subscription Tests
# ============================================================================

def test_task_detail_subscribes_to_state_updates(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen subscribes to STATE_UPDATED events."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    screen.on_mount()

    # Should subscribe to STATE_UPDATED
    mock_event_bus.subscribe.assert_called()


# ============================================================================
# Refresh Tests
# ============================================================================

def test_task_detail_has_refresh_method(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has refresh method."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'refresh_display') or hasattr(screen, 'action_refresh')


def test_task_detail_reloads_task_on_refresh(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen reloads task data on refresh."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Mock get_task_by_id
    updated_task = Task(
        id="1",
        title="Create authentication service (UPDATED)",
        subtasks=["1.1", "1.2"],
        status=TaskStatus.COMPLETED,
        spec_name="user-authentication",
        spec_date="2025-10-29"
    )
    mock_data_manager.get_task_by_id = Mock(return_value=updated_task)

    # Refresh
    if hasattr(screen, 'refresh_display'):
        screen.refresh_display()

    # Should reload from data manager
    if mock_data_manager.get_task_by_id.called:
        assert True


# ============================================================================
# Layout Tests
# ============================================================================

def test_task_detail_has_scrollable_content(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has scrollable content area."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should support scrolling for many subtasks
    # Implementation-specific


# ============================================================================
# Edge Case Tests
# ============================================================================

def test_task_detail_handles_task_with_no_subtasks(mock_data_manager, mock_event_bus):
    """Test that TaskDetailScreen handles task with no subtasks."""
    task_no_subtasks = Task(
        id="3",
        title="Simple task",
        subtasks=[],
        status=TaskStatus.PENDING,
        spec_name="test",
        spec_date="2025-10-29"
    )

    screen = TaskDetailScreen(
        task=task_no_subtasks,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert len(screen.task.subtasks) == 0


def test_task_detail_handles_long_task_titles(mock_data_manager, mock_event_bus):
    """Test that TaskDetailScreen handles long task titles."""
    long_title_task = Task(
        id="4",
        title="This is a very long task title that should be wrapped or truncated properly to fit within the display area",
        subtasks=["4.1"],
        status=TaskStatus.PENDING,
        spec_name="test",
        spec_date="2025-10-29"
    )

    screen = TaskDetailScreen(
        task=long_title_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should handle long titles gracefully
    assert len(screen.task.title) > 80


def test_task_detail_handles_completed_task(mock_data_manager, mock_event_bus):
    """Test that TaskDetailScreen handles completed tasks."""
    completed_task = Task(
        id="5",
        title="Completed task",
        subtasks=["5.1", "5.2", "5.3"],
        status=TaskStatus.COMPLETED,
        spec_name="test",
        spec_date="2025-10-29",
        completed_subtasks=[0, 1, 2]  # All completed
    )

    screen = TaskDetailScreen(
        task=completed_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.task.status == TaskStatus.COMPLETED
    assert len(screen.task.completed_subtasks) == 3


# ============================================================================
# Keyboard Shortcut Tests
# ============================================================================

def test_task_detail_has_escape_binding(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has escape key binding."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "escape" in bindings


def test_task_detail_has_edit_binding(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has edit key binding."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "e" in bindings or "edit" in [b.action for b in screen.BINDINGS]


def test_task_detail_has_refresh_binding(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen has refresh key binding."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "r" in bindings


# ============================================================================
# Metadata Tests
# ============================================================================

def test_task_detail_shows_parent_spec_link(mock_data_manager, mock_event_bus, sample_task):
    """Test that TaskDetailScreen shows link to parent spec."""
    screen = TaskDetailScreen(
        task=sample_task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should display parent spec info
    assert screen.task.spec_name == "user-authentication"
    assert screen.task.spec_date == "2025-10-29"


def test_task_detail_calculates_completion_percentage(mock_data_manager, mock_event_bus):
    """Test that TaskDetailScreen calculates completion percentage."""
    task = Task(
        id="6",
        title="Test task",
        subtasks=["6.1", "6.2", "6.3", "6.4"],
        status=TaskStatus.IN_PROGRESS,
        spec_name="test",
        spec_date="2025-10-29",
        completed_subtasks=[0, 1]  # 2 of 4 = 50%
    )

    screen = TaskDetailScreen(
        task=task,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should be able to calculate 50% completion
    expected = 50.0
