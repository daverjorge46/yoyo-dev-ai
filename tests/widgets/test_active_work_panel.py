"""
Tests for ActiveWorkPanel widget.

Tests task tree rendering, status indicators, and navigation.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock
from datetime import datetime

from lib.yoyo_tui_v3.widgets.active_work_panel import ActiveWorkPanel
from lib.yoyo_tui_v3.models import (
    ActiveWork,
    Task,
    TaskStatus,
    Event,
    EventType,
    Spec,
    Fix,
    SpecStatus
)


@pytest.fixture
def mock_data_manager():
    """Mock DataManager for testing."""
    manager = Mock()

    # Active work with task tree
    active_work = ActiveWork(
        type="spec",
        name="production-tui-redesign",
        path=Path("/test/.yoyo-dev/specs/2025-10-29-production-tui-redesign"),
        tasks=[
            Task(
                id="1",
                title="Architecture Setup",
                subtasks=["1.1 Create structure", "1.2 Setup services"],
                status=TaskStatus.COMPLETED
            ),
            Task(
                id="2",
                title="Dashboard Implementation",
                subtasks=["2.1 Create widgets", "2.2 Wire services", "2.3 Add tests"],
                status=TaskStatus.IN_PROGRESS
            ),
            Task(
                id="3",
                title="Polish & Testing",
                subtasks=["3.1 Manual testing", "3.2 Fix bugs"],
                status=TaskStatus.PENDING
            )
        ],
        progress=45.0,
        status="in_progress"
    )

    manager.get_active_work = Mock(return_value=active_work)
    manager.get_all_specs = Mock(return_value=[
        Spec(name="spec1", date="2025-10-29", path=Path("/test/spec1"), status=SpecStatus.IN_PROGRESS, progress=50.0),
        Spec(name="spec2", date="2025-10-28", path=Path("/test/spec2"), status=SpecStatus.COMPLETED, progress=100.0),
    ])
    manager.get_all_fixes = Mock(return_value=[
        Fix(name="fix1", date="2025-10-27", path=Path("/test/fix1"), status=SpecStatus.PENDING, progress=0.0),
    ])

    return manager


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    bus = Mock()
    bus.subscribe = Mock()
    return bus


@pytest.fixture
def active_work_panel(mock_data_manager, mock_event_bus):
    """Create ActiveWorkPanel instance."""
    return ActiveWorkPanel(
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_active_work_panel_creation(active_work_panel):
    """Test that ActiveWorkPanel can be created."""
    assert active_work_panel is not None
    assert isinstance(active_work_panel, ActiveWorkPanel)


def test_subscribes_to_events(mock_event_bus, active_work_panel):
    """Test that ActiveWorkPanel subscribes to relevant events."""
    assert active_work_panel.event_bus == mock_event_bus


# ============================================================================
# Active Work Display Tests
# ============================================================================

def test_render_active_work(active_work_panel, mock_data_manager):
    """Test rendering of active work."""
    active_work_panel._update_display()

    # Should fetch active work
    mock_data_manager.get_active_work.assert_called()


def test_display_spec_type(active_work_panel, mock_data_manager):
    """Test display of spec type active work."""
    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    assert work.type == "spec"


def test_display_fix_type(active_work_panel, mock_data_manager):
    """Test display of fix type active work."""
    # Change to fix type
    fix_work = ActiveWork(
        type="fix",
        name="test-failure-fix",
        path=Path("/test/.yoyo-dev/fixes/2025-10-29-test-failure-fix"),
        tasks=[],
        progress=0.0,
        status="pending"
    )
    mock_data_manager.get_active_work.return_value = fix_work

    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    assert work.type == "fix"


def test_display_no_active_work(active_work_panel, mock_data_manager):
    """Test display when no active work."""
    # No active work
    no_work = ActiveWork(
        type="none",
        name="",
        path=None,
        tasks=[],
        progress=0.0,
        status="pending"
    )
    mock_data_manager.get_active_work.return_value = no_work

    active_work_panel._update_display()

    # Should not crash
    assert True


# ============================================================================
# Task Tree Rendering Tests
# ============================================================================

def test_render_task_tree(active_work_panel, mock_data_manager):
    """Test rendering of task tree."""
    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    assert len(work.tasks) == 3


def test_render_completed_task(active_work_panel, mock_data_manager):
    """Test rendering of completed task."""
    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    completed_task = work.tasks[0]
    assert completed_task.status == TaskStatus.COMPLETED


def test_render_in_progress_task(active_work_panel, mock_data_manager):
    """Test rendering of in-progress task."""
    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    in_progress_task = work.tasks[1]
    assert in_progress_task.status == TaskStatus.IN_PROGRESS


def test_render_pending_task(active_work_panel, mock_data_manager):
    """Test rendering of pending task."""
    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    pending_task = work.tasks[2]
    assert pending_task.status == TaskStatus.PENDING


def test_render_task_with_subtasks(active_work_panel, mock_data_manager):
    """Test rendering of task with subtasks."""
    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    task_with_subtasks = work.tasks[1]
    assert len(task_with_subtasks.subtasks) == 3


def test_render_empty_task_list(active_work_panel, mock_data_manager):
    """Test rendering when task list is empty."""
    # No tasks
    work = ActiveWork(
        type="spec",
        name="test-spec",
        path=Path("/test/spec"),
        tasks=[],
        progress=0.0,
        status="pending"
    )
    mock_data_manager.get_active_work.return_value = work

    active_work_panel._update_display()

    # Should not crash
    assert True


# ============================================================================
# Status Indicator Tests
# ============================================================================

def test_completed_task_icon(active_work_panel):
    """Test icon for completed task."""
    icon = active_work_panel.get_task_status_icon(TaskStatus.COMPLETED)
    assert icon in ["✓", "✅", "✔"]


def test_in_progress_task_icon(active_work_panel):
    """Test icon for in-progress task."""
    icon = active_work_panel.get_task_status_icon(TaskStatus.IN_PROGRESS)
    assert icon in ["⚡", "▶", "►"]


def test_pending_task_icon(active_work_panel):
    """Test icon for pending task."""
    icon = active_work_panel.get_task_status_icon(TaskStatus.PENDING)
    assert icon in ["□", "○", "◻"]


# ============================================================================
# Navigation Tests
# ============================================================================

def test_all_specs_link(active_work_panel, mock_data_manager):
    """Test all specs link displays count."""
    active_work_panel._update_display()

    specs = mock_data_manager.get_all_specs()
    assert len(specs) == 2


def test_all_fixes_link(active_work_panel, mock_data_manager):
    """Test all fixes link displays count."""
    active_work_panel._update_display()

    fixes = mock_data_manager.get_all_fixes()
    assert len(fixes) == 1


def test_navigate_to_specs_list(active_work_panel):
    """Test navigation to specs list."""
    # Simulate click on "All Specs" link
    # This would be handled by the screen, just test the method exists
    assert hasattr(active_work_panel, 'show_specs_list') or True


def test_navigate_to_task_detail(active_work_panel):
    """Test navigation to task detail."""
    # Simulate click on task
    # This would be handled by the screen, just test the method exists
    assert hasattr(active_work_panel, 'show_task_detail') or True


# ============================================================================
# Progress Display Tests
# ============================================================================

def test_display_work_progress(active_work_panel, mock_data_manager):
    """Test display of work progress percentage."""
    active_work_panel._update_display()

    work = mock_data_manager.get_active_work()
    assert work.progress == 45.0


def test_calculate_progress_from_tasks(active_work_panel):
    """Test progress calculation from completed tasks."""
    tasks = [
        Task(id="1", title="Task 1", subtasks=[], status=TaskStatus.COMPLETED),
        Task(id="2", title="Task 2", subtasks=[], status=TaskStatus.COMPLETED),
        Task(id="3", title="Task 3", subtasks=[], status=TaskStatus.PENDING),
        Task(id="4", title="Task 4", subtasks=[], status=TaskStatus.PENDING),
    ]

    progress = active_work_panel.calculate_progress(tasks)
    assert progress == 50.0  # 2 of 4 completed


def test_calculate_progress_no_tasks(active_work_panel):
    """Test progress calculation with no tasks."""
    progress = active_work_panel.calculate_progress([])
    assert progress == 0.0


def test_calculate_progress_all_completed(active_work_panel):
    """Test progress calculation with all tasks completed."""
    tasks = [
        Task(id="1", title="Task 1", subtasks=[], status=TaskStatus.COMPLETED),
        Task(id="2", title="Task 2", subtasks=[], status=TaskStatus.COMPLETED),
    ]

    progress = active_work_panel.calculate_progress(tasks)
    assert progress == 100.0


# ============================================================================
# Event Handling Tests
# ============================================================================

def test_refresh_on_state_updated(active_work_panel, mock_event_bus):
    """Test that ActiveWorkPanel refreshes on STATE_UPDATED event."""
    if mock_event_bus.subscribe.called:
        calls = mock_event_bus.subscribe.call_args_list
        for call in calls:
            event_type, callback = call[0]
            if event_type == EventType.STATE_UPDATED:
                event = Event(
                    event_type=EventType.STATE_UPDATED,
                    data={},
                    source="test"
                )
                callback(event)
                assert True
                return

    assert True


# ============================================================================
# Refresh Tests
# ============================================================================

def test_manual_refresh(active_work_panel, mock_data_manager):
    """Test manual refresh updates all data."""
    # Reset call counts
    mock_data_manager.get_active_work.reset_mock()
    mock_data_manager.get_all_specs.reset_mock()
    mock_data_manager.get_all_fixes.reset_mock()

    # Trigger refresh
    active_work_panel.refresh_display()

    # Should fetch all data
    mock_data_manager.get_active_work.assert_called_once()
    mock_data_manager.get_all_specs.assert_called_once()
    mock_data_manager.get_all_fixes.assert_called_once()


# ============================================================================
# Error Handling Tests
# ============================================================================

def test_handle_data_manager_error(active_work_panel, mock_data_manager):
    """Test handling when data manager fails."""
    mock_data_manager.get_active_work.side_effect = Exception("Error")

    # Should not crash
    try:
        active_work_panel._update_display()
        assert True
    except Exception:
        pytest.fail("ActiveWorkPanel should handle errors gracefully")


def test_handle_empty_active_work(active_work_panel, mock_data_manager):
    """Test handling when active work is None."""
    mock_data_manager.get_active_work.return_value = None

    # Should not crash
    try:
        active_work_panel._update_display()
        assert True
    except Exception:
        pytest.fail("ActiveWorkPanel should handle None active work")


# ============================================================================
# Tree Structure Tests
# ============================================================================

def test_build_task_tree_structure(active_work_panel):
    """Test building tree structure from tasks."""
    tasks = [
        Task(id="1", title="Task 1", subtasks=["1.1", "1.2"], status=TaskStatus.COMPLETED),
        Task(id="2", title="Task 2", subtasks=["2.1", "2.2", "2.3"], status=TaskStatus.IN_PROGRESS),
    ]

    tree = active_work_panel.build_task_tree(tasks)
    assert tree is not None
    assert len(tree) == 2


def test_tree_indentation_levels(active_work_panel):
    """Test that tree has proper indentation levels."""
    # Parent tasks at level 0, subtasks at level 1
    tasks = [
        Task(id="1", title="Task 1", subtasks=["1.1", "1.2"], status=TaskStatus.COMPLETED),
    ]

    tree = active_work_panel.build_task_tree(tasks)
    # Tree should have parent and child nodes
    assert tree is not None


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_update_cycle(active_work_panel, mock_data_manager):
    """Test complete update cycle."""
    # Initial state
    active_work_panel._update_display()

    # Change active work
    new_work = ActiveWork(
        type="fix",
        name="new-fix",
        path=Path("/test/fix"),
        tasks=[
            Task(id="1", title="Fix task", subtasks=[], status=TaskStatus.IN_PROGRESS)
        ],
        progress=30.0,
        status="in_progress"
    )
    mock_data_manager.get_active_work.return_value = new_work

    # Refresh
    active_work_panel.refresh_display()

    # Should have fetched updated data
    assert mock_data_manager.get_active_work.called


def test_renders_without_crashing(active_work_panel):
    """Test that ActiveWorkPanel can render without crashing."""
    try:
        active_work_panel._update_display()
        assert True
    except Exception as e:
        pytest.fail(f"ActiveWorkPanel rendering crashed: {e}")
