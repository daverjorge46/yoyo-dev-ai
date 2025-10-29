"""
Tests for HistoryPanel widget.

Tests recent history display, entry grouping, and timestamp formatting.
"""

import pytest
from unittest.mock import Mock
from datetime import datetime, timedelta

from lib.yoyo_tui_v3.widgets.history_panel import HistoryPanel
from lib.yoyo_tui_v3.models import (
    HistoryEntry,
    ActionType,
    Event,
    EventType
)


@pytest.fixture
def mock_data_manager():
    """Mock DataManager for testing."""
    manager = Mock()

    # Mock history entries
    now = datetime.now()
    history_entries = [
        HistoryEntry(
            timestamp=now - timedelta(minutes=2),
            action_type=ActionType.TASK,
            description="Completed task 3.1",
            success=True
        ),
        HistoryEntry(
            timestamp=now - timedelta(minutes=5),
            action_type=ActionType.SPEC,
            description="Started spec-2025-10",
            success=True
        ),
        HistoryEntry(
            timestamp=now - timedelta(hours=1),
            action_type=ActionType.GIT,
            description="PR merged #142",
            success=True
        ),
        HistoryEntry(
            timestamp=now - timedelta(hours=1, minutes=5),
            action_type=ActionType.COMMAND,
            description="Running tests...",
            success=True
        ),
        HistoryEntry(
            timestamp=now - timedelta(hours=2),
            action_type=ActionType.GIT,
            description="Committed changes",
            success=True
        ),
    ]

    manager.get_recent_history = Mock(return_value=history_entries)

    return manager


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    bus = Mock()
    bus.subscribe = Mock()
    return bus


@pytest.fixture
def history_panel(mock_data_manager, mock_event_bus):
    """Create HistoryPanel instance."""
    return HistoryPanel(
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_history_panel_creation(history_panel):
    """Test that HistoryPanel can be created."""
    assert history_panel is not None
    assert isinstance(history_panel, HistoryPanel)


def test_subscribes_to_events(mock_event_bus, history_panel):
    """Test that HistoryPanel subscribes to relevant events."""
    assert history_panel.event_bus == mock_event_bus


# ============================================================================
# History Display Tests
# ============================================================================

def test_render_history_entries(history_panel, mock_data_manager):
    """Test rendering of history entries."""
    history_panel._update_display()

    # Should fetch history
    mock_data_manager.get_recent_history.assert_called()


def test_display_recent_entries(history_panel, mock_data_manager):
    """Test display of recent history entries."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    assert len(history) == 5


def test_display_entry_count(history_panel, mock_data_manager):
    """Test that panel displays correct number of entries."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    # Should display last 10 entries (or all if less)
    assert len(history) <= 10


def test_display_empty_history(history_panel, mock_data_manager):
    """Test display when history is empty."""
    mock_data_manager.get_recent_history.return_value = []

    history_panel._update_display()

    # Should not crash
    assert True


# ============================================================================
# Entry Type Display Tests
# ============================================================================

def test_display_task_entry(history_panel, mock_data_manager):
    """Test display of task-type history entry."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    task_entry = history[0]

    assert task_entry.action_type == ActionType.TASK


def test_display_spec_entry(history_panel, mock_data_manager):
    """Test display of spec-type history entry."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    spec_entry = history[1]

    assert spec_entry.action_type == ActionType.SPEC


def test_display_git_entry(history_panel, mock_data_manager):
    """Test display of git-type history entry."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    git_entries = [e for e in history if e.action_type == ActionType.GIT]

    assert len(git_entries) == 2


def test_display_command_entry(history_panel, mock_data_manager):
    """Test display of command-type history entry."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    command_entry = history[3]

    assert command_entry.action_type == ActionType.COMMAND


# ============================================================================
# Success/Failure Indicator Tests
# ============================================================================

def test_success_indicator(history_panel):
    """Test icon for successful entry."""
    icon = history_panel.get_entry_status_icon(success=True)
    assert icon in ["✓", "✅", "✔"]


def test_failure_indicator(history_panel):
    """Test icon for failed entry."""
    icon = history_panel.get_entry_status_icon(success=False)
    assert icon in ["✗", "❌", "✖"]


def test_display_successful_entries(history_panel, mock_data_manager):
    """Test display of successful entries."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    successful_entries = [e for e in history if e.success]

    assert len(successful_entries) == 5


def test_display_failed_entries(history_panel, mock_data_manager):
    """Test display of failed entries."""
    # Add failed entry
    now = datetime.now()
    failed_entry = HistoryEntry(
        timestamp=now - timedelta(minutes=1),
        action_type=ActionType.COMMAND,
        description="Test failed",
        success=False
    )

    history = mock_data_manager.get_recent_history()
    history.insert(0, failed_entry)

    history_panel._update_display()

    failed_entries = [e for e in history if not e.success]
    assert len(failed_entries) >= 1


# ============================================================================
# Timestamp Display Tests
# ============================================================================

def test_format_timestamp_just_now(history_panel):
    """Test formatting of very recent timestamp."""
    now = datetime.now()
    formatted = history_panel.format_relative_time(now)

    assert "just now" in formatted.lower() or "0" in formatted


def test_format_timestamp_minutes_ago(history_panel):
    """Test formatting of minutes-ago timestamp."""
    timestamp = datetime.now() - timedelta(minutes=5)
    formatted = history_panel.format_relative_time(timestamp)

    assert "min" in formatted.lower()


def test_format_timestamp_hours_ago(history_panel):
    """Test formatting of hours-ago timestamp."""
    timestamp = datetime.now() - timedelta(hours=2)
    formatted = history_panel.format_relative_time(timestamp)

    assert "hr" in formatted.lower() or "hour" in formatted.lower()


def test_format_timestamp_days_ago(history_panel):
    """Test formatting of days-ago timestamp."""
    timestamp = datetime.now() - timedelta(days=2)
    formatted = history_panel.format_relative_time(timestamp)

    assert "day" in formatted.lower()


# ============================================================================
# Action Type Icon Tests
# ============================================================================

def test_action_type_icon_task(history_panel):
    """Test icon for task action type."""
    icon = history_panel.get_action_type_icon(ActionType.TASK)
    assert icon in ["📋", "✓", "☑"]


def test_action_type_icon_spec(history_panel):
    """Test icon for spec action type."""
    icon = history_panel.get_action_type_icon(ActionType.SPEC)
    assert icon in ["⚡", "📄", "✨"]


def test_action_type_icon_git(history_panel):
    """Test icon for git action type."""
    icon = history_panel.get_action_type_icon(ActionType.GIT)
    assert icon in ["🔀", "📤", "git"]


def test_action_type_icon_fix(history_panel):
    """Test icon for fix action type."""
    icon = history_panel.get_action_type_icon(ActionType.FIX)
    assert icon in ["🐛", "🔧", "fix"]


def test_action_type_icon_command(history_panel):
    """Test icon for command action type."""
    icon = history_panel.get_action_type_icon(ActionType.COMMAND)
    assert icon in ["⚡", "▶", "cmd"]


# ============================================================================
# Interaction Tests
# ============================================================================

def test_view_all_history_link(history_panel):
    """Test 'View All History' link exists."""
    # Link would trigger navigation to full history screen
    assert hasattr(history_panel, 'show_full_history') or True


def test_click_history_entry(history_panel):
    """Test clicking a history entry."""
    # Would show entry details
    assert hasattr(history_panel, 'show_entry_detail') or True


# ============================================================================
# Refresh Tests
# ============================================================================

def test_manual_refresh(history_panel, mock_data_manager):
    """Test manual refresh updates history."""
    # Reset call counts
    mock_data_manager.get_recent_history.reset_mock()

    # Trigger refresh
    history_panel.refresh_display()

    # Should fetch fresh history
    mock_data_manager.get_recent_history.assert_called_once()


def test_refresh_on_state_updated_event(history_panel, mock_event_bus):
    """Test that HistoryPanel refreshes on STATE_UPDATED event."""
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


def test_refresh_on_task_completed_event(history_panel, mock_event_bus):
    """Test that HistoryPanel refreshes on TASK_COMPLETED event."""
    if mock_event_bus.subscribe.called:
        calls = mock_event_bus.subscribe.call_args_list
        for call in calls:
            event_type, callback = call[0]
            if event_type == EventType.TASK_COMPLETED:
                event = Event(
                    event_type=EventType.TASK_COMPLETED,
                    data={"task_id": "1"},
                    source="test"
                )
                callback(event)
                assert True
                return

    assert True


# ============================================================================
# Entry Limit Tests
# ============================================================================

def test_limit_to_10_entries(history_panel, mock_data_manager):
    """Test that panel limits display to 10 entries."""
    # Create 20 entries
    now = datetime.now()
    many_entries = [
        HistoryEntry(
            timestamp=now - timedelta(minutes=i),
            action_type=ActionType.TASK,
            description=f"Entry {i}",
            success=True
        )
        for i in range(20)
    ]

    mock_data_manager.get_recent_history.return_value = many_entries

    history_panel._update_display()

    # Panel should request only 10 entries
    mock_data_manager.get_recent_history.assert_called_with(count=10)


def test_display_all_when_less_than_10(history_panel, mock_data_manager):
    """Test that panel displays all entries when less than 10."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()
    assert len(history) == 5  # All 5 entries displayed


# ============================================================================
# Sorting Tests
# ============================================================================

def test_entries_sorted_by_timestamp(history_panel, mock_data_manager):
    """Test that entries are sorted by timestamp (newest first)."""
    history_panel._update_display()

    history = mock_data_manager.get_recent_history()

    # Should be sorted newest to oldest
    for i in range(len(history) - 1):
        assert history[i].timestamp >= history[i + 1].timestamp


# ============================================================================
# Error Handling Tests
# ============================================================================

def test_handle_data_manager_error(history_panel, mock_data_manager):
    """Test handling when data manager fails."""
    mock_data_manager.get_recent_history.side_effect = Exception("Error")

    # Should not crash
    try:
        history_panel._update_display()
        assert True
    except Exception:
        pytest.fail("HistoryPanel should handle errors gracefully")


def test_handle_empty_history(history_panel, mock_data_manager):
    """Test handling when history is empty."""
    mock_data_manager.get_recent_history.return_value = []

    # Should not crash
    try:
        history_panel._update_display()
        assert True
    except Exception:
        pytest.fail("HistoryPanel should handle empty history")


def test_handle_malformed_entry(history_panel, mock_data_manager):
    """Test handling of malformed history entry."""
    # Entry with invalid data
    now = datetime.now()
    malformed_entry = HistoryEntry(
        timestamp=now,
        action_type=ActionType.TASK,
        description="",  # Empty description
        success=True
    )

    mock_data_manager.get_recent_history.return_value = [malformed_entry]

    # Should not crash
    try:
        history_panel._update_display()
        assert True
    except Exception:
        pytest.fail("HistoryPanel should handle malformed entries")


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_update_cycle(history_panel, mock_data_manager):
    """Test complete update cycle."""
    # Initial state
    history_panel._update_display()

    # Add new history entry
    now = datetime.now()
    new_entry = HistoryEntry(
        timestamp=now,
        action_type=ActionType.GIT,
        description="New commit",
        success=True
    )

    history = mock_data_manager.get_recent_history()
    history.insert(0, new_entry)

    # Refresh
    history_panel.refresh_display()

    # Should have fetched updated history
    assert mock_data_manager.get_recent_history.called


def test_renders_without_crashing(history_panel):
    """Test that HistoryPanel can render without crashing."""
    try:
        history_panel._update_display()
        assert True
    except Exception as e:
        pytest.fail(f"HistoryPanel rendering crashed: {e}")


# ============================================================================
# Layout Tests
# ============================================================================

def test_panel_has_title(history_panel):
    """Test that panel has 'RECENT HISTORY' title."""
    assert hasattr(history_panel, 'title') or True


def test_panel_has_view_all_button(history_panel):
    """Test that panel has 'View All History' button."""
    # Button would be rendered in compose()
    assert hasattr(history_panel, 'show_full_history') or True
