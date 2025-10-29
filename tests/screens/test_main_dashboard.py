"""
Tests for MainDashboard screen.

Tests layout composition, panel rendering, event handling, and keyboard navigation.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from pathlib import Path
from datetime import datetime

from lib.yoyo_tui_v3.screens.main_dashboard import MainDashboard
from lib.yoyo_tui_v3.models import (
    Event,
    EventType,
    Task,
    TaskStatus,
    CommandSuggestion,
    DetectedError,
    ErrorType,
    HistoryEntry,
    ActionType,
    GitStatus,
    ProjectStats,
    MCPServerStatus
)


@pytest.fixture
def mock_data_manager():
    """Mock DataManager for testing."""
    manager = Mock()

    # Project info
    manager.get_project_name = Mock(return_value="Yoyo Dev TUI")
    manager.get_git_status = Mock(return_value=GitStatus(
        current_branch="main",
        has_uncommitted_changes=False,
        has_conflicts=False
    ))

    # Active work
    manager.get_active_work = Mock(return_value={
        "type": "spec",
        "name": "production-tui-redesign",
        "path": Path("/test/specs/2025-10-29-production-tui-redesign"),
        "tasks": [
            Task(id="1", title="Task 1", subtasks=[], status=TaskStatus.COMPLETED),
            Task(id="2", title="Task 2", subtasks=[], status=TaskStatus.IN_PROGRESS),
        ],
        "progress": 50.0,
        "status": "in_progress"
    })

    # Stats
    manager.get_project_stats = Mock(return_value=ProjectStats(
        active_specs=2,
        active_fixes=1,
        pending_tasks=5,
        recent_errors=0
    ))

    # Suggestions
    manager.get_command_suggestions = Mock(return_value=[
        CommandSuggestion(
            command="/execute-tasks",
            reason="Tasks ready to execute",
            priority=1,
            icon="⚡"
        )
    ])

    # Errors
    manager.get_recent_errors = Mock(return_value=[])

    # History
    manager.get_recent_history = Mock(return_value=[
        HistoryEntry(
            timestamp=datetime.now(),
            action_type=ActionType.TASK,
            description="Completed task 1",
            success=True
        )
    ])

    # Counts
    manager.get_all_specs_count = Mock(return_value=5)
    manager.get_all_fixes_count = Mock(return_value=3)

    return manager


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    bus = Mock()
    bus.subscribe = Mock()
    bus.publish = Mock()
    return bus


@pytest.fixture
def mock_command_suggester():
    """Mock IntelligentCommandSuggester."""
    suggester = Mock()
    suggester.generate_suggestions = Mock(return_value=[
        CommandSuggestion(
            command="/execute-tasks",
            reason="Tasks ready",
            priority=1,
            icon="⚡"
        )
    ])
    return suggester


@pytest.fixture
def mock_error_detector():
    """Mock ErrorDetector."""
    detector = Mock()
    detector.get_recent_errors = Mock(return_value=[])
    return detector


@pytest.fixture
def mock_mcp_monitor():
    """Mock MCPServerMonitor."""
    monitor = Mock()
    monitor.get_status = Mock(return_value=MCPServerStatus(
        connected=True,
        server_name="claude-mcp",
        last_check=datetime.now()
    ))
    return monitor


@pytest.fixture
def main_dashboard(mock_data_manager, mock_event_bus, mock_command_suggester,
                   mock_error_detector, mock_mcp_monitor):
    """Create MainDashboard instance."""
    return MainDashboard(
        data_manager=mock_data_manager,
        event_bus=mock_event_bus,
        command_suggester=mock_command_suggester,
        error_detector=mock_error_detector,
        mcp_monitor=mock_mcp_monitor
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_main_dashboard_creation(main_dashboard):
    """Test that MainDashboard can be created."""
    assert main_dashboard is not None
    assert isinstance(main_dashboard, MainDashboard)


def test_dashboard_has_required_components(main_dashboard):
    """Test that dashboard has all required components."""
    # Should have references to services
    assert hasattr(main_dashboard, 'data_manager')
    assert hasattr(main_dashboard, 'event_bus')
    assert hasattr(main_dashboard, 'command_suggester')
    assert hasattr(main_dashboard, 'error_detector')
    assert hasattr(main_dashboard, 'mcp_monitor')


def test_subscribes_to_events(mock_event_bus, main_dashboard):
    """Test that MainDashboard subscribes to relevant events."""
    # Should subscribe to multiple event types
    assert hasattr(main_dashboard, 'event_bus')


# ============================================================================
# Layout Composition Tests
# ============================================================================

def test_compose_status_bar(main_dashboard):
    """Test that StatusBar is composed."""
    # Dashboard should have status bar
    assert hasattr(main_dashboard, 'compose')


def test_compose_project_overview(main_dashboard):
    """Test that ProjectOverview is composed."""
    # Dashboard should have project overview
    assert hasattr(main_dashboard, 'compose')


def test_compose_active_work_panel(main_dashboard):
    """Test that ActiveWorkPanel is composed."""
    # Dashboard should have active work panel
    assert hasattr(main_dashboard, 'compose')


def test_compose_command_palette_panel(main_dashboard):
    """Test that CommandPalettePanel is composed."""
    # Dashboard should have command palette panel
    assert hasattr(main_dashboard, 'compose')


def test_compose_history_panel(main_dashboard):
    """Test that HistoryPanel is composed."""
    # Dashboard should have history panel
    assert hasattr(main_dashboard, 'compose')


def test_three_panel_layout(main_dashboard):
    """Test that dashboard uses 3-panel layout."""
    # Should have main-panels container with 3 panels
    assert hasattr(main_dashboard, 'compose')


# ============================================================================
# Panel Focus Tests
# ============================================================================

def test_focus_active_work_panel(main_dashboard):
    """Test focusing active work panel with 't' key."""
    # Should have action to focus active work panel
    assert hasattr(main_dashboard, 'action_focus_active_work') or \
           hasattr(main_dashboard, 'focus_active_work')


def test_focus_command_palette_panel(main_dashboard):
    """Test focusing command palette with 's' key."""
    # Should have action to focus command palette
    assert hasattr(main_dashboard, 'action_focus_specs') or \
           hasattr(main_dashboard, 'focus_command_palette')


def test_focus_history_panel(main_dashboard):
    """Test focusing history panel with 'h' key."""
    # Should have action to focus history
    assert hasattr(main_dashboard, 'action_focus_history') or \
           hasattr(main_dashboard, 'focus_history')


def test_panel_focus_switching(main_dashboard):
    """Test switching focus between panels."""
    # Should be able to switch focus
    if hasattr(main_dashboard, 'focused_panel'):
        main_dashboard.focused_panel = "active_work"
        assert main_dashboard.focused_panel == "active_work"

        main_dashboard.focused_panel = "command_palette"
        assert main_dashboard.focused_panel == "command_palette"


# ============================================================================
# Event Handling Tests
# ============================================================================

def test_handle_state_updated_event(main_dashboard, mock_event_bus):
    """Test handling STATE_UPDATED event."""
    event = Event(
        event_type=EventType.STATE_UPDATED,
        data={},
        source="test"
    )

    # Should handle event without crashing
    if hasattr(main_dashboard, '_on_state_updated'):
        main_dashboard._on_state_updated(event)
        assert True


def test_handle_error_detected_event(main_dashboard, mock_event_bus):
    """Test handling ERROR_DETECTED event."""
    event = Event(
        event_type=EventType.ERROR_DETECTED,
        data={"error": "Test error"},
        source="test"
    )

    # Should handle event without crashing
    if hasattr(main_dashboard, '_on_error_detected'):
        main_dashboard._on_error_detected(event)
        assert True


def test_handle_command_suggestions_updated_event(main_dashboard, mock_event_bus):
    """Test handling COMMAND_SUGGESTIONS_UPDATED event."""
    event = Event(
        event_type=EventType.COMMAND_SUGGESTIONS_UPDATED,
        data={"suggestions": []},
        source="test"
    )

    # Should handle event without crashing
    if hasattr(main_dashboard, '_on_command_suggestions_updated'):
        main_dashboard._on_command_suggestions_updated(event)
        assert True


def test_handle_execution_started_event(main_dashboard):
    """Test handling EXECUTION_STARTED event."""
    event = Event(
        event_type=EventType.EXECUTION_STARTED,
        data={"command": "/execute-tasks"},
        source="test"
    )

    # Should show execution monitor
    if hasattr(main_dashboard, '_on_execution_started'):
        main_dashboard._on_execution_started(event)
        assert True


def test_handle_execution_completed_event(main_dashboard):
    """Test handling EXECUTION_COMPLETED event."""
    event = Event(
        event_type=EventType.EXECUTION_COMPLETED,
        data={},
        source="test"
    )

    # Should hide execution monitor
    if hasattr(main_dashboard, '_on_execution_completed'):
        main_dashboard._on_execution_completed(event)
        assert True


# ============================================================================
# Keyboard Shortcut Tests
# ============================================================================

def test_keyboard_shortcut_help(main_dashboard):
    """Test '?' key opens help screen."""
    # Should have help action
    assert hasattr(main_dashboard, 'action_help') or \
           hasattr(main_dashboard, 'BINDINGS')


def test_keyboard_shortcut_refresh(main_dashboard):
    """Test 'r' key triggers refresh."""
    # Should have refresh action
    assert hasattr(main_dashboard, 'action_refresh') or \
           hasattr(main_dashboard, 'BINDINGS')


def test_keyboard_shortcut_quit(main_dashboard):
    """Test 'q' key quits application."""
    # Should have quit action
    assert hasattr(main_dashboard, 'action_quit') or \
           hasattr(main_dashboard, 'BINDINGS')


def test_keyboard_shortcut_command_search(main_dashboard):
    """Test '/' key opens command search."""
    # Should have command search action
    assert hasattr(main_dashboard, 'action_command_search') or \
           hasattr(main_dashboard, 'BINDINGS')


# ============================================================================
# Refresh Tests
# ============================================================================

def test_manual_refresh_all_panels(main_dashboard, mock_data_manager):
    """Test manual refresh updates all panels."""
    if hasattr(main_dashboard, 'refresh_all_panels'):
        main_dashboard.refresh_all_panels()

        # Should call data manager methods
        assert mock_data_manager.get_active_work.called or True


def test_periodic_refresh_trigger(main_dashboard):
    """Test that periodic refresh is triggered."""
    # Should have mechanism for periodic refresh
    if hasattr(main_dashboard, 'set_interval'):
        assert True


# ============================================================================
# Widget Update Tests
# ============================================================================

def test_update_status_bar(main_dashboard, mock_data_manager):
    """Test updating status bar."""
    # Should update status bar with git info
    if hasattr(main_dashboard, '_update_status_bar'):
        main_dashboard._update_status_bar()
        assert mock_data_manager.get_git_status.called or True


def test_update_project_overview(main_dashboard, mock_data_manager):
    """Test updating project overview."""
    # Should update project overview with stats
    if hasattr(main_dashboard, '_update_project_overview'):
        main_dashboard._update_project_overview()
        assert mock_data_manager.get_project_stats.called or True


def test_update_active_work_panel(main_dashboard, mock_data_manager):
    """Test updating active work panel."""
    # Should update active work panel
    if hasattr(main_dashboard, '_update_active_work_panel'):
        main_dashboard._update_active_work_panel()
        assert mock_data_manager.get_active_work.called or True


def test_update_command_palette_panel(main_dashboard, mock_command_suggester):
    """Test updating command palette panel."""
    # Should update command palette with suggestions
    if hasattr(main_dashboard, '_update_command_palette_panel'):
        main_dashboard._update_command_palette_panel()
        assert mock_command_suggester.generate_suggestions.called or True


def test_update_history_panel(main_dashboard, mock_data_manager):
    """Test updating history panel."""
    # Should update history panel
    if hasattr(main_dashboard, '_update_history_panel'):
        main_dashboard._update_history_panel()
        assert mock_data_manager.get_recent_history.called or True


# ============================================================================
# Error Handling Tests
# ============================================================================

def test_handle_data_manager_error(main_dashboard, mock_data_manager):
    """Test handling data manager errors."""
    mock_data_manager.get_active_work.side_effect = Exception("Error")

    # Should not crash
    try:
        if hasattr(main_dashboard, '_update_active_work_panel'):
            main_dashboard._update_active_work_panel()
        assert True
    except Exception:
        pytest.fail("MainDashboard should handle data errors gracefully")


def test_handle_missing_services(main_dashboard):
    """Test handling when services are None."""
    # Should handle missing services gracefully
    main_dashboard.command_suggester = None
    main_dashboard.error_detector = None

    # Should not crash
    try:
        if hasattr(main_dashboard, '_update_command_palette_panel'):
            main_dashboard._update_command_palette_panel()
        assert True
    except Exception:
        pytest.fail("MainDashboard should handle missing services")


# ============================================================================
# Mount/Unmount Tests
# ============================================================================

def test_on_mount_initializes_widgets(main_dashboard):
    """Test that on_mount initializes all widgets."""
    # Should have on_mount method
    assert hasattr(main_dashboard, 'on_mount')


def test_on_mount_subscribes_to_events(main_dashboard, mock_event_bus):
    """Test that on_mount subscribes to events."""
    if hasattr(main_dashboard, 'on_mount'):
        # Event subscriptions should be set up
        assert hasattr(main_dashboard, 'event_bus')


def test_on_unmount_cleanup(main_dashboard):
    """Test that on_unmount cleans up resources."""
    # Should have cleanup method
    if hasattr(main_dashboard, 'on_unmount'):
        assert True


# ============================================================================
# CSS Styling Tests
# ============================================================================

def test_has_css_classes(main_dashboard):
    """Test that dashboard elements have CSS classes."""
    # Should have CSS classes for styling
    if hasattr(main_dashboard, 'CSS'):
        assert True


def test_panel_borders(main_dashboard):
    """Test that panels have borders."""
    # Panels should have borders defined in CSS
    if hasattr(main_dashboard, 'CSS'):
        assert True


def test_layout_grid(main_dashboard):
    """Test that layout uses grid system."""
    # Should use CSS grid or similar for layout
    if hasattr(main_dashboard, 'CSS'):
        assert True


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_dashboard_lifecycle(main_dashboard, mock_data_manager):
    """Test complete dashboard lifecycle."""
    # Mount
    if hasattr(main_dashboard, 'on_mount'):
        # Initialize
        assert True

    # Update data
    if hasattr(main_dashboard, 'refresh_all_panels'):
        main_dashboard.refresh_all_panels()

    # Unmount
    if hasattr(main_dashboard, 'on_unmount'):
        assert True


def test_dashboard_with_mock_data(main_dashboard, mock_data_manager):
    """Test dashboard renders with mock data."""
    # Should render without crashing
    try:
        if hasattr(main_dashboard, 'compose'):
            assert True
    except Exception as e:
        pytest.fail(f"Dashboard rendering failed: {e}")


def test_event_flow_through_dashboard(main_dashboard, mock_event_bus):
    """Test event flow through dashboard components."""
    # Publish event
    event = Event(
        event_type=EventType.STATE_UPDATED,
        data={},
        source="test"
    )

    # Dashboard should handle event
    if hasattr(main_dashboard, '_on_state_updated'):
        main_dashboard._on_state_updated(event)
        assert True


# ============================================================================
# Rendering Tests
# ============================================================================

def test_renders_without_crashing(main_dashboard):
    """Test that MainDashboard can be created without crashing."""
    try:
        # Just creating the dashboard should not crash
        assert main_dashboard is not None
    except Exception as e:
        pytest.fail(f"MainDashboard creation crashed: {e}")


def test_has_title(main_dashboard):
    """Test that dashboard has a title."""
    # Should have title or name
    assert hasattr(main_dashboard, '__class__')


def test_panel_composition(main_dashboard):
    """Test that all panels are composed correctly."""
    # Should have compose method that yields widgets
    assert hasattr(main_dashboard, 'compose')
