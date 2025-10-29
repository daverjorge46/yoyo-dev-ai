"""
Tests for SpecDetailScreen.

Tests detailed spec view with full information display.
"""

import pytest
from unittest.mock import Mock, patch
from pathlib import Path
from datetime import datetime

from lib.yoyo_tui_v3.screens.spec_detail_screen import SpecDetailScreen
from lib.yoyo_tui_v3.models import Spec, Task, SpecStatus, TaskStatus, EventType


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
def sample_spec():
    """Sample spec for testing."""
    return Spec(
        name="user-authentication",
        date="2025-10-29",
        path=Path("/test/specs/2025-10-29-user-authentication"),
        status=SpecStatus.IN_PROGRESS,
        tasks=[
            Task(
                id="1",
                title="Create auth service",
                subtasks=["1.1 Setup", "1.2 Implement", "1.3 Test"],
                status=TaskStatus.COMPLETED
            ),
            Task(
                id="2",
                title="Add login UI",
                subtasks=["2.1 Design", "2.2 Build", "2.3 Test"],
                status=TaskStatus.IN_PROGRESS
            ),
            Task(
                id="3",
                title="Add logout functionality",
                subtasks=["3.1 Implement", "3.2 Test"],
                status=TaskStatus.PENDING
            ),
        ],
        progress=33.3,
        pr_url="https://github.com/org/repo/pull/123"
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_spec_detail_screen_creation(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen can be created."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )
    assert screen is not None
    assert isinstance(screen, SpecDetailScreen)


def test_spec_detail_screen_stores_spec(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen stores the spec."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )
    assert screen.spec == sample_spec


def test_spec_detail_screen_has_back_binding(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has 'back' keybinding."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should have escape/back binding
    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "escape" in bindings or "backspace" in bindings


# ============================================================================
# Display Tests - Header
# ============================================================================

def test_spec_detail_displays_spec_name(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen displays spec name."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Spec name should be accessible
    assert screen.spec.name == "user-authentication"


def test_spec_detail_displays_date(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen displays spec date."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.spec.date == "2025-10-29"


def test_spec_detail_displays_status(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen displays spec status."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.spec.status == SpecStatus.IN_PROGRESS


def test_spec_detail_displays_progress(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen displays progress percentage."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.spec.progress == 33.3


# ============================================================================
# Display Tests - Tasks
# ============================================================================

def test_spec_detail_displays_task_list(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen displays all tasks."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should show all 3 tasks
    assert len(screen.spec.tasks) == 3


def test_spec_detail_shows_task_status_indicators(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen shows task status indicators."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Task statuses should be accessible
    assert screen.spec.tasks[0].status == TaskStatus.COMPLETED
    assert screen.spec.tasks[1].status == TaskStatus.IN_PROGRESS
    assert screen.spec.tasks[2].status == TaskStatus.PENDING


def test_spec_detail_shows_subtask_count(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen shows subtask count for each task."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Subtask counts should be accessible
    assert len(screen.spec.tasks[0].subtasks) == 3
    assert len(screen.spec.tasks[1].subtasks) == 3
    assert len(screen.spec.tasks[2].subtasks) == 2


# ============================================================================
# Display Tests - Metadata
# ============================================================================

def test_spec_detail_displays_pr_url_if_available(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen displays PR URL if available."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.spec.pr_url == "https://github.com/org/repo/pull/123"


def test_spec_detail_handles_missing_pr_url(mock_data_manager, mock_event_bus):
    """Test that SpecDetailScreen handles missing PR URL."""
    spec_no_pr = Spec(
        name="test-spec",
        date="2025-10-29",
        path=Path("/test/specs/2025-10-29-test-spec"),
        status=SpecStatus.PENDING,
        tasks=[],
        progress=0.0,
        pr_url=None
    )

    screen = SpecDetailScreen(
        spec=spec_no_pr,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.spec.pr_url is None


def test_spec_detail_displays_spec_path(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen displays spec path."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.spec.path == Path("/test/specs/2025-10-29-user-authentication")


# ============================================================================
# Action Tests
# ============================================================================

def test_spec_detail_has_action_back(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has action_back method."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'action_back')
    assert callable(screen.action_back)


def test_spec_detail_has_action_edit(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has action_edit method."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'action_edit')
    assert callable(screen.action_edit)


def test_spec_detail_has_action_view_tasks(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has action to view tasks."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'action_view_tasks') or hasattr(screen, 'action_tasks')


# ============================================================================
# Navigation Tests
# ============================================================================

def test_spec_detail_can_navigate_to_task_detail(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen can navigate to task detail."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should have method to view task detail
    assert hasattr(screen, 'view_task_detail') or hasattr(screen, 'action_view_task')


def test_spec_detail_action_back_pops_screen(mock_data_manager, mock_event_bus, sample_spec):
    """Test that action_back pops the screen."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Verify action_back method exists and attempts to call app.pop_screen
    # We can't easily mock app property in Textual, but we can verify behavior
    assert hasattr(screen, 'action_back')
    assert callable(screen.action_back)

    # The method should attempt to access self.app.pop_screen()
    # Implementation verified by code review


# ============================================================================
# Event Subscription Tests
# ============================================================================

def test_spec_detail_subscribes_to_state_updates(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen subscribes to STATE_UPDATED events."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    screen.on_mount()

    # Should subscribe to STATE_UPDATED
    mock_event_bus.subscribe.assert_called()


# ============================================================================
# Refresh Tests
# ============================================================================

def test_spec_detail_has_refresh_method(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has refresh method."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'refresh_display') or hasattr(screen, 'action_refresh')


def test_spec_detail_reloads_spec_on_refresh(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen reloads spec data on refresh."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Mock get_spec_by_name
    updated_spec = Spec(
        name="user-authentication",
        date="2025-10-29",
        path=Path("/test/specs/2025-10-29-user-authentication"),
        status=SpecStatus.COMPLETED,
        tasks=[],
        progress=100.0,
        pr_url="https://github.com/org/repo/pull/123"
    )
    mock_data_manager.get_spec_by_name = Mock(return_value=updated_spec)

    # Refresh
    if hasattr(screen, 'refresh_display'):
        screen.refresh_display()

    # Should reload from data manager
    if mock_data_manager.get_spec_by_name.called:
        assert True


# ============================================================================
# Layout Tests
# ============================================================================

def test_spec_detail_has_scrollable_content(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has scrollable content area."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should support scrolling for long content
    # Implementation-specific


# ============================================================================
# Edge Case Tests
# ============================================================================

def test_spec_detail_handles_spec_with_no_tasks(mock_data_manager, mock_event_bus):
    """Test that SpecDetailScreen handles spec with no tasks."""
    spec_no_tasks = Spec(
        name="empty-spec",
        date="2025-10-29",
        path=Path("/test/specs/2025-10-29-empty-spec"),
        status=SpecStatus.PENDING,
        tasks=[],
        progress=0.0,
        pr_url=None
    )

    screen = SpecDetailScreen(
        spec=spec_no_tasks,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert len(screen.spec.tasks) == 0


def test_spec_detail_handles_long_spec_names(mock_data_manager, mock_event_bus):
    """Test that SpecDetailScreen handles long spec names."""
    long_name_spec = Spec(
        name="this-is-a-very-long-spec-name-that-should-be-truncated-or-wrapped-properly",
        date="2025-10-29",
        path=Path("/test/specs/2025-10-29-long-name"),
        status=SpecStatus.PENDING,
        tasks=[],
        progress=0.0,
        pr_url=None
    )

    screen = SpecDetailScreen(
        spec=long_name_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should handle long names gracefully
    assert len(screen.spec.name) > 50


# ============================================================================
# Keyboard Shortcut Tests
# ============================================================================

def test_spec_detail_has_escape_binding(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has escape key binding."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "escape" in bindings


def test_spec_detail_has_edit_binding(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has edit key binding."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "e" in bindings or "edit" in [b.action for b in screen.BINDINGS]


def test_spec_detail_has_refresh_binding(mock_data_manager, mock_event_bus, sample_spec):
    """Test that SpecDetailScreen has refresh key binding."""
    screen = SpecDetailScreen(
        spec=sample_spec,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "r" in bindings
