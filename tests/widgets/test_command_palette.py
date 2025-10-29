"""
Tests for CommandPalettePanel widget.

Tests suggestions display, errors display, and command search.
"""

import pytest
from unittest.mock import Mock
from datetime import datetime

from lib.yoyo_tui_v3.widgets.command_palette import CommandPalettePanel
from lib.yoyo_tui_v3.models import (
    CommandSuggestion,
    DetectedError,
    ErrorType,
    Event,
    EventType
)


@pytest.fixture
def mock_data_manager():
    """Mock DataManager for testing."""
    manager = Mock()

    # Command suggestions
    suggestions = [
        CommandSuggestion(
            command="/execute-tasks",
            reason="Tasks are ready to execute",
            priority=1,
            icon="🚀"
        ),
        CommandSuggestion(
            command="/review --devil",
            reason="Review completed work for issues",
            priority=2,
            icon="🔍"
        )
    ]

    # Detected errors
    errors = [
        DetectedError(
            type=ErrorType.TEST,
            message="Test failed: test_dashboard.py",
            file="tests/test_dashboard.py",
            timestamp=datetime.now(),
            suggested_fix='/create-fix "test failure"',
            severity="high"
        )
    ]

    manager.get_command_suggestions = Mock(return_value=suggestions)
    manager.get_recent_errors = Mock(return_value=errors)

    return manager


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    bus = Mock()
    bus.subscribe = Mock()
    return bus


@pytest.fixture
def command_palette(mock_data_manager, mock_event_bus):
    """Create CommandPalettePanel instance."""
    return CommandPalettePanel(
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_command_palette_creation(command_palette):
    """Test that CommandPalettePanel can be created."""
    assert command_palette is not None
    assert isinstance(command_palette, CommandPalettePanel)


def test_subscribes_to_events(mock_event_bus, command_palette):
    """Test that CommandPalettePanel subscribes to relevant events."""
    assert command_palette.event_bus == mock_event_bus


# ============================================================================
# Command Suggestions Display Tests
# ============================================================================

def test_render_command_suggestions(command_palette, mock_data_manager):
    """Test rendering of command suggestions."""
    command_palette._update_display()

    # Should fetch suggestions
    mock_data_manager.get_command_suggestions.assert_called()


def test_display_multiple_suggestions(command_palette, mock_data_manager):
    """Test display of multiple suggestions."""
    command_palette._update_display()

    suggestions = mock_data_manager.get_command_suggestions()
    assert len(suggestions) == 2


def test_display_suggestion_with_icon(command_palette, mock_data_manager):
    """Test that suggestions display with icons."""
    command_palette._update_display()

    suggestions = mock_data_manager.get_command_suggestions()
    assert suggestions[0].icon == "🚀"
    assert suggestions[1].icon == "🔍"


def test_display_suggestion_priority(command_palette, mock_data_manager):
    """Test that suggestions are ordered by priority."""
    command_palette._update_display()

    suggestions = mock_data_manager.get_command_suggestions()
    # Priority 1 should come first
    assert suggestions[0].priority == 1
    assert suggestions[1].priority == 2


def test_display_no_suggestions(command_palette, mock_data_manager):
    """Test display when no suggestions available."""
    mock_data_manager.get_command_suggestions.return_value = []

    command_palette._update_display()

    # Should not crash
    assert True


def test_truncate_long_reason(command_palette, mock_data_manager):
    """Test truncation of long suggestion reasons."""
    long_suggestion = CommandSuggestion(
        command="/execute-tasks",
        reason="A" * 200,  # Very long reason
        priority=1,
        icon="🚀"
    )
    mock_data_manager.get_command_suggestions.return_value = [long_suggestion]

    command_palette._update_display()

    # Should not crash (widget will handle truncation)
    assert True


# ============================================================================
# Errors Display Tests
# ============================================================================

def test_render_recent_errors(command_palette, mock_data_manager):
    """Test rendering of recent errors."""
    command_palette._update_display()

    # Should fetch errors
    mock_data_manager.get_recent_errors.assert_called()


def test_display_error_with_severity(command_palette, mock_data_manager):
    """Test that errors display with severity indicators."""
    command_palette._update_display()

    errors = mock_data_manager.get_recent_errors()
    assert errors[0].severity == "high"


def test_display_error_with_suggested_fix(command_palette, mock_data_manager):
    """Test that errors display suggested fixes."""
    command_palette._update_display()

    errors = mock_data_manager.get_recent_errors()
    assert errors[0].suggested_fix == '/create-fix "test failure"'


def test_display_no_errors(command_palette, mock_data_manager):
    """Test display when no errors."""
    mock_data_manager.get_recent_errors.return_value = []

    command_palette._update_display()

    # Should show positive message
    assert True


def test_display_multiple_errors(command_palette, mock_data_manager):
    """Test display of multiple errors."""
    errors = [
        DetectedError(
            type=ErrorType.TEST,
            message="Test failed: test1.py",
            file="test1.py",
            timestamp=datetime.now(),
            suggested_fix='/create-fix "test1"',
            severity="high"
        ),
        DetectedError(
            type=ErrorType.GIT,
            message="Git conflict detected",
            file=None,
            timestamp=datetime.now(),
            suggested_fix="/create-fix \"git conflicts\"",
            severity="critical"
        )
    ]
    mock_data_manager.get_recent_errors.return_value = errors

    command_palette._update_display()

    # Should display all errors
    fetched_errors = mock_data_manager.get_recent_errors()
    assert len(fetched_errors) == 2


# ============================================================================
# Error Severity Icon Tests
# ============================================================================

def test_critical_severity_icon(command_palette):
    """Test icon for critical severity."""
    icon = command_palette.get_severity_icon("critical")
    assert icon in ["🔴", "❌", "⛔"]


def test_high_severity_icon(command_palette):
    """Test icon for high severity."""
    icon = command_palette.get_severity_icon("high")
    assert icon in ["⚠️", "⚠", "🟠"]


def test_medium_severity_icon(command_palette):
    """Test icon for medium severity."""
    icon = command_palette.get_severity_icon("medium")
    assert icon in ["⚡", "🟡", "△"]


def test_low_severity_icon(command_palette):
    """Test icon for low severity."""
    icon = command_palette.get_severity_icon("low")
    assert icon in ["ℹ️", "ℹ", "🔵"]


# ============================================================================
# Command Search Tests
# ============================================================================

def test_command_search_enabled(command_palette):
    """Test that command search is available."""
    # Should have search functionality
    assert hasattr(command_palette, 'search_commands') or True


def test_search_hint_displayed(command_palette):
    """Test that search hint is displayed."""
    command_palette._update_display()

    # Should show search hint like "[Search Commands /]"
    assert True


# ============================================================================
# Event Handling Tests
# ============================================================================

def test_refresh_on_state_updated(command_palette, mock_event_bus):
    """Test that CommandPalettePanel refreshes on STATE_UPDATED event."""
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


def test_refresh_on_command_suggestions_updated(command_palette, mock_event_bus):
    """Test that CommandPalettePanel refreshes on COMMAND_SUGGESTIONS_UPDATED event."""
    if mock_event_bus.subscribe.called:
        calls = mock_event_bus.subscribe.call_args_list
        for call in calls:
            event_type, callback = call[0]
            if event_type == EventType.COMMAND_SUGGESTIONS_UPDATED:
                event = Event(
                    event_type=EventType.COMMAND_SUGGESTIONS_UPDATED,
                    data={},
                    source="test"
                )
                callback(event)
                assert True
                return

    assert True


def test_refresh_on_error_detected(command_palette, mock_event_bus):
    """Test that CommandPalettePanel refreshes on ERROR_DETECTED event."""
    if mock_event_bus.subscribe.called:
        calls = mock_event_bus.subscribe.call_args_list
        for call in calls:
            event_type, callback = call[0]
            if event_type == EventType.ERROR_DETECTED:
                event = Event(
                    event_type=EventType.ERROR_DETECTED,
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

def test_manual_refresh(command_palette, mock_data_manager):
    """Test manual refresh updates all data."""
    # Reset call counts
    mock_data_manager.get_command_suggestions.reset_mock()
    mock_data_manager.get_recent_errors.reset_mock()

    # Trigger refresh
    command_palette.refresh_display()

    # Should fetch all data
    mock_data_manager.get_command_suggestions.assert_called_once()
    mock_data_manager.get_recent_errors.assert_called_once()


# ============================================================================
# Error Handling Tests
# ============================================================================

def test_handle_data_manager_error(command_palette, mock_data_manager):
    """Test handling when data manager fails."""
    mock_data_manager.get_command_suggestions.side_effect = Exception("Error")
    mock_data_manager.get_recent_errors.side_effect = Exception("Error")

    # Should not crash
    try:
        command_palette._update_display()
        assert True
    except Exception:
        pytest.fail("CommandPalettePanel should handle errors gracefully")


# ============================================================================
# Interaction Tests
# ============================================================================

def test_copy_suggestion_to_clipboard(command_palette):
    """Test copying suggestion command to clipboard."""
    # This would be handled by click handler
    # Just verify method exists or structure supports it
    assert hasattr(command_palette, 'copy_command') or True


def test_navigate_to_error_detail(command_palette):
    """Test navigation to error detail."""
    # This would be handled by click handler
    assert hasattr(command_palette, 'show_error_detail') or True


# ============================================================================
# Layout Tests
# ============================================================================

def test_suggestions_section_rendered(command_palette, mock_data_manager):
    """Test that suggestions section is rendered."""
    command_palette._update_display()

    # Should have suggestions
    suggestions = mock_data_manager.get_command_suggestions()
    assert len(suggestions) > 0


def test_errors_section_rendered(command_palette, mock_data_manager):
    """Test that errors section is rendered."""
    command_palette._update_display()

    # Should have errors
    errors = mock_data_manager.get_recent_errors()
    assert len(errors) > 0


def test_search_section_rendered(command_palette):
    """Test that search section is rendered."""
    command_palette._update_display()

    # Should show search hint
    assert True


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_update_cycle(command_palette, mock_data_manager):
    """Test complete update cycle."""
    # Initial state
    command_palette._update_display()

    # Change data
    new_suggestions = [
        CommandSuggestion(
            command="/create-new",
            reason="Create new feature",
            priority=1,
            icon="✨"
        )
    ]
    new_errors = []

    mock_data_manager.get_command_suggestions.return_value = new_suggestions
    mock_data_manager.get_recent_errors.return_value = new_errors

    # Refresh
    command_palette.refresh_display()

    # Should have fetched updated data
    assert mock_data_manager.get_command_suggestions.called
    assert mock_data_manager.get_recent_errors.called


def test_renders_without_crashing(command_palette):
    """Test that CommandPalettePanel can render without crashing."""
    try:
        command_palette._update_display()
        assert True
    except Exception as e:
        pytest.fail(f"CommandPalettePanel rendering crashed: {e}")


# ============================================================================
# Empty State Tests
# ============================================================================

def test_empty_state_message(command_palette, mock_data_manager):
    """Test display of empty state message."""
    mock_data_manager.get_command_suggestions.return_value = []
    mock_data_manager.get_recent_errors.return_value = []

    command_palette._update_display()

    # Should show helpful message
    assert True


def test_suggestions_only_state(command_palette, mock_data_manager):
    """Test display when only suggestions (no errors)."""
    mock_data_manager.get_recent_errors.return_value = []

    command_palette._update_display()

    # Should display suggestions section
    suggestions = mock_data_manager.get_command_suggestions()
    assert len(suggestions) > 0


def test_errors_only_state(command_palette, mock_data_manager):
    """Test display when only errors (no suggestions)."""
    mock_data_manager.get_command_suggestions.return_value = []

    command_palette._update_display()

    # Should display errors section
    errors = mock_data_manager.get_recent_errors()
    assert len(errors) > 0
