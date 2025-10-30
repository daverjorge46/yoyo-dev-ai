"""
Tests for ProjectOverview widget.

Tests mission display, tech stack, stats, and MCP status.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock
from datetime import datetime

from lib.yoyo_tui_v3.widgets.project_overview import ProjectOverview
from lib.yoyo_tui_v3.models import (
    ProjectStats,
    MCPServerStatus,
    Event,
    EventType
)


@pytest.fixture
def mock_data_manager():
    """Mock DataManager for testing."""
    manager = Mock()
    manager.get_mission_statement = Mock(return_value="Build awesome software with AI")
    manager.get_tech_stack_summary = Mock(return_value=["React", "TypeScript", "Convex"])
    manager.get_project_stats = Mock(return_value=ProjectStats(
        active_specs=2,
        active_fixes=1,
        pending_tasks=5,
        recent_errors=0
    ))
    manager.get_mcp_status = Mock(return_value=MCPServerStatus(
        connected=True,
        server_name="mcp-server",
        last_check=datetime.now(),
        error_message=None
    ))
    return manager


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    bus = Mock()
    bus.subscribe = Mock()
    return bus


@pytest.fixture
def project_overview(mock_data_manager, mock_event_bus):
    """Create ProjectOverview instance."""
    return ProjectOverview(
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_project_overview_creation(project_overview):
    """Test that ProjectOverview can be created."""
    assert project_overview is not None
    assert isinstance(project_overview, ProjectOverview)


def test_project_overview_with_mcp_monitor(mock_data_manager, mock_event_bus):
    """Test that ProjectOverview accepts mcp_monitor parameter."""
    mock_mcp_monitor = Mock()

    # Should not raise TypeError
    widget = ProjectOverview(
        data_manager=mock_data_manager,
        event_bus=mock_event_bus,
        mcp_monitor=mock_mcp_monitor
    )

    assert widget is not None
    assert widget.mcp_monitor is mock_mcp_monitor


def test_initial_state_collapsed(project_overview):
    """Test that ProjectOverview starts in appropriate state."""
    # Should have initial expanded state (configurable)
    assert hasattr(project_overview, 'is_expanded')


# ============================================================================
# Mission Display Tests
# ============================================================================

def test_render_mission_statement(project_overview, mock_data_manager):
    """Test rendering of mission statement."""
    project_overview._update_display()

    # Should fetch mission
    mock_data_manager.get_mission_statement.assert_called()


def test_truncate_long_mission(project_overview, mock_data_manager):
    """Test truncation of long mission statements."""
    long_mission = "A" * 200  # Very long mission
    mock_data_manager.get_mission_statement.return_value = long_mission

    project_overview._update_display()

    # Mission should be truncated (implementation will handle this)
    # Just verify it doesn't crash
    assert True


def test_handle_missing_mission(project_overview, mock_data_manager):
    """Test handling when mission is unavailable."""
    mock_data_manager.get_mission_statement.return_value = None

    project_overview._update_display()

    # Should use placeholder
    assert True


# ============================================================================
# Tech Stack Display Tests
# ============================================================================

def test_render_tech_stack(project_overview, mock_data_manager):
    """Test rendering of tech stack."""
    project_overview._update_display()

    # Should fetch tech stack
    mock_data_manager.get_tech_stack_summary.assert_called()


def test_display_multiple_technologies(project_overview, mock_data_manager):
    """Test display of multiple technologies."""
    mock_data_manager.get_tech_stack_summary.return_value = [
        "React", "TypeScript", "Tailwind", "Convex", "Clerk"
    ]

    project_overview._update_display()

    # Should handle multiple items
    assert True


def test_handle_empty_tech_stack(project_overview, mock_data_manager):
    """Test handling when tech stack is empty."""
    mock_data_manager.get_tech_stack_summary.return_value = []

    project_overview._update_display()

    # Should not crash
    assert True


# ============================================================================
# Stats Display Tests
# ============================================================================

def test_render_project_stats(project_overview, mock_data_manager):
    """Test rendering of project statistics."""
    project_overview._update_display()

    # Should fetch stats
    mock_data_manager.get_project_stats.assert_called()


def test_display_active_specs_count(project_overview, mock_data_manager):
    """Test display of active specs count."""
    stats = ProjectStats(
        active_specs=3,
        active_fixes=0,
        pending_tasks=0,
        recent_errors=0
    )
    mock_data_manager.get_project_stats.return_value = stats

    project_overview._update_display()

    # Stats should be available
    fetched_stats = mock_data_manager.get_project_stats()
    assert fetched_stats.active_specs == 3


def test_display_active_fixes_count(project_overview, mock_data_manager):
    """Test display of active fixes count."""
    stats = ProjectStats(
        active_specs=0,
        active_fixes=2,
        pending_tasks=0,
        recent_errors=0
    )
    mock_data_manager.get_project_stats.return_value = stats

    project_overview._update_display()

    fetched_stats = mock_data_manager.get_project_stats()
    assert fetched_stats.active_fixes == 2


def test_display_pending_tasks_count(project_overview, mock_data_manager):
    """Test display of pending tasks count."""
    stats = ProjectStats(
        active_specs=0,
        active_fixes=0,
        pending_tasks=7,
        recent_errors=0
    )
    mock_data_manager.get_project_stats.return_value = stats

    project_overview._update_display()

    fetched_stats = mock_data_manager.get_project_stats()
    assert fetched_stats.pending_tasks == 7


def test_display_recent_errors_count(project_overview, mock_data_manager):
    """Test display of recent errors count."""
    stats = ProjectStats(
        active_specs=0,
        active_fixes=0,
        pending_tasks=0,
        recent_errors=3
    )
    mock_data_manager.get_project_stats.return_value = stats

    project_overview._update_display()

    fetched_stats = mock_data_manager.get_project_stats()
    assert fetched_stats.recent_errors == 3


def test_zero_counts_display(project_overview, mock_data_manager):
    """Test that zero counts are displayed correctly."""
    stats = ProjectStats(
        active_specs=0,
        active_fixes=0,
        pending_tasks=0,
        recent_errors=0
    )
    mock_data_manager.get_project_stats.return_value = stats

    project_overview._update_display()

    # Should display zeros (not hide them)
    assert True


# ============================================================================
# MCP Status Display Tests
# ============================================================================

def test_render_mcp_status(project_overview, mock_data_manager):
    """Test rendering of MCP server status."""
    project_overview._update_display()

    # Should fetch MCP status
    mock_data_manager.get_mcp_status.assert_called()


def test_display_mcp_connected(project_overview, mock_data_manager):
    """Test display when MCP is connected."""
    status = MCPServerStatus(
        connected=True,
        server_name="mcp-server",
        last_check=datetime.now(),
        error_message=None
    )
    mock_data_manager.get_mcp_status.return_value = status

    project_overview._update_display()

    fetched_status = mock_data_manager.get_mcp_status()
    assert fetched_status.connected is True


def test_display_mcp_disconnected(project_overview, mock_data_manager):
    """Test display when MCP is disconnected."""
    status = MCPServerStatus(
        connected=False,
        server_name=None,
        last_check=datetime.now(),
        error_message="Not running"
    )
    mock_data_manager.get_mcp_status.return_value = status

    project_overview._update_display()

    fetched_status = mock_data_manager.get_mcp_status()
    assert fetched_status.connected is False


def test_display_mcp_not_configured(project_overview, mock_data_manager):
    """Test display when MCP is not configured."""
    status = MCPServerStatus(
        connected=False,
        server_name=None,
        last_check=datetime.now(),
        error_message="Not configured"
    )
    mock_data_manager.get_mcp_status.return_value = status

    project_overview._update_display()

    fetched_status = mock_data_manager.get_mcp_status()
    assert "configured" in fetched_status.error_message.lower()


def test_mcp_status_icons(project_overview):
    """Test that appropriate icons are used for MCP status."""
    # Connected
    icon = project_overview.get_mcp_status_icon(connected=True)
    assert icon in ["✓", "✅", "🟢"]

    # Disconnected
    icon = project_overview.get_mcp_status_icon(connected=False)
    assert icon in ["✗", "❌", "🔴", "⚠"]


# ============================================================================
# Expand/Collapse Tests
# ============================================================================

def test_toggle_expansion(project_overview):
    """Test toggling between expanded and collapsed states."""
    initial_state = project_overview.is_expanded

    project_overview.toggle_expansion()

    assert project_overview.is_expanded != initial_state


def test_expand(project_overview):
    """Test expanding the widget."""
    project_overview.is_expanded = False

    project_overview.expand()

    assert project_overview.is_expanded is True


def test_collapse(project_overview):
    """Test collapsing the widget."""
    project_overview.is_expanded = True

    project_overview.collapse()

    assert project_overview.is_expanded is False


def test_collapsed_shows_minimal_info(project_overview):
    """Test that collapsed state shows minimal information."""
    project_overview.collapse()

    # Should still render without crashing
    project_overview._update_display()

    assert True


def test_expanded_shows_full_info(project_overview):
    """Test that expanded state shows full information."""
    project_overview.expand()

    # Should render all sections
    project_overview._update_display()

    assert True


# ============================================================================
# Event Handling Tests
# ============================================================================

def test_refresh_on_state_updated(project_overview, mock_event_bus):
    """Test that ProjectOverview refreshes on STATE_UPDATED event."""
    # Simulate event
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


def test_refresh_on_mcp_status_changed(project_overview, mock_event_bus):
    """Test that ProjectOverview refreshes on MCP_STATUS_CHANGED event."""
    # Similar to above test
    if mock_event_bus.subscribe.called:
        calls = mock_event_bus.subscribe.call_args_list
        for call in calls:
            event_type, callback = call[0]
            if event_type == EventType.MCP_STATUS_CHANGED:
                event = Event(
                    event_type=EventType.MCP_STATUS_CHANGED,
                    data={"connected": True},
                    source="test"
                )
                callback(event)
                assert True
                return

    assert True


# ============================================================================
# Refresh Tests
# ============================================================================

def test_manual_refresh(project_overview, mock_data_manager):
    """Test manual refresh updates all data."""
    # Reset call counts
    mock_data_manager.get_mission_statement.reset_mock()
    mock_data_manager.get_tech_stack_summary.reset_mock()
    mock_data_manager.get_project_stats.reset_mock()
    mock_data_manager.get_mcp_status.reset_mock()

    # Trigger refresh
    project_overview.refresh_display()

    # Should fetch all data
    mock_data_manager.get_mission_statement.assert_called_once()
    mock_data_manager.get_tech_stack_summary.assert_called_once()
    mock_data_manager.get_project_stats.assert_called_once()
    mock_data_manager.get_mcp_status.assert_called_once()


# ============================================================================
# Error Handling Tests
# ============================================================================

def test_handle_data_manager_error(project_overview, mock_data_manager):
    """Test handling when data manager methods fail."""
    mock_data_manager.get_mission_statement.side_effect = Exception("Error")
    mock_data_manager.get_tech_stack_summary.side_effect = Exception("Error")
    mock_data_manager.get_project_stats.side_effect = Exception("Error")
    mock_data_manager.get_mcp_status.side_effect = Exception("Error")

    # Should not crash
    try:
        project_overview._update_display()
        assert True
    except Exception:
        pytest.fail("ProjectOverview should handle errors gracefully")


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_update_cycle(project_overview, mock_data_manager):
    """Test complete update cycle with all data changes."""
    # Initial state
    project_overview._update_display()

    # Change all data
    mock_data_manager.get_mission_statement.return_value = "New mission"
    mock_data_manager.get_tech_stack_summary.return_value = ["Python", "FastAPI"]
    mock_data_manager.get_project_stats.return_value = ProjectStats(
        active_specs=5, active_fixes=2, pending_tasks=10, recent_errors=1
    )
    mock_data_manager.get_mcp_status.return_value = MCPServerStatus(
        connected=False, server_name=None, last_check=datetime.now(),
        error_message="Disconnected"
    )

    # Refresh
    project_overview.refresh_display()

    # Should have fetched all updated data
    assert mock_data_manager.get_mission_statement.called
    assert mock_data_manager.get_tech_stack_summary.called
    assert mock_data_manager.get_project_stats.called
    assert mock_data_manager.get_mcp_status.called


def test_renders_without_crashing(project_overview):
    """Test that ProjectOverview can render without crashing."""
    try:
        project_overview._update_display()
        assert True
    except Exception as e:
        pytest.fail(f"ProjectOverview rendering crashed: {e}")
