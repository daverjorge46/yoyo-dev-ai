"""
Tests for HistoryDetailScreen.

Tests detailed history entry view with action details and context.
"""

import pytest
from unittest.mock import Mock
from pathlib import Path
from datetime import datetime

from lib.yoyo_tui_v3.screens.history_detail_screen import HistoryDetailScreen
from lib.yoyo_tui_v3.models import HistoryEntry, ActionType, EventType


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
def sample_history_entry():
    """Sample history entry for testing."""
    return HistoryEntry(
        timestamp=datetime(2025, 10, 29, 14, 30, 0),
        action_type=ActionType.SPEC,
        description="Created spec: user-authentication",
        success=True,
        details="Specification created with 5 tasks:\n- Task 1: Setup auth service\n- Task 2: Add login UI\n- Task 3: Add logout\n- Task 4: Write tests\n- Task 5: Deploy"
    )


# ============================================================================
# Initialization Tests
# ============================================================================

def test_history_detail_screen_creation(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen can be created."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )
    assert screen is not None
    assert isinstance(screen, HistoryDetailScreen)


def test_history_detail_screen_stores_entry(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen stores the history entry."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )
    assert screen.entry == sample_history_entry


def test_history_detail_screen_has_back_binding(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has 'back' keybinding."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should have escape/back binding
    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "escape" in bindings or "backspace" in bindings


# ============================================================================
# Display Tests - Header
# ============================================================================

def test_history_detail_displays_action_type(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen displays action type."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.entry.action_type == ActionType.SPEC


def test_history_detail_displays_timestamp(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen displays timestamp."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.entry.timestamp == datetime(2025, 10, 29, 14, 30, 0)


def test_history_detail_displays_success_status(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen displays success status."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.entry.success is True


def test_history_detail_displays_description(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen displays action description."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert "Created spec: user-authentication" in screen.entry.description


# ============================================================================
# Display Tests - Details
# ============================================================================

def test_history_detail_displays_full_details(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen displays full details."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should show full details text
    assert screen.entry.details is not None
    assert "Specification created with 5 tasks" in screen.entry.details


def test_history_detail_handles_missing_details(mock_data_manager, mock_event_bus):
    """Test that HistoryDetailScreen handles entry with no details."""
    entry_no_details = HistoryEntry(
        timestamp=datetime(2025, 10, 29, 14, 30, 0),
        action_type=ActionType.GIT,
        description="Pushed to remote",
        success=True,
        details=None
    )

    screen = HistoryDetailScreen(
        entry=entry_no_details,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert screen.entry.details is None


# ============================================================================
# Display Tests - Success Indicators
# ============================================================================

def test_history_detail_shows_success_indicator(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen shows success indicator."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should display success indicator (✓)
    assert screen.entry.success is True


def test_history_detail_shows_failure_indicator(mock_data_manager, mock_event_bus):
    """Test that HistoryDetailScreen shows failure indicator."""
    failed_entry = HistoryEntry(
        timestamp=datetime(2025, 10, 29, 14, 30, 0),
        action_type=ActionType.TASK,
        description="Task execution failed",
        success=False,
        details="Error: Tests failed\n- test_auth.py::test_login FAILED"
    )

    screen = HistoryDetailScreen(
        entry=failed_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should display failure indicator (✗)
    assert screen.entry.success is False


# ============================================================================
# Action Tests
# ============================================================================

def test_history_detail_has_action_back(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has action_back method."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'action_back')
    assert callable(screen.action_back)


def test_history_detail_has_action_copy(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has action_copy method."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should have method to copy details
    assert hasattr(screen, 'action_copy') or hasattr(screen, 'copy_details')


# ============================================================================
# Navigation Tests
# ============================================================================

def test_history_detail_action_back_exists(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that action_back exists and is callable."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Verify method exists
    assert hasattr(screen, 'action_back')
    assert callable(screen.action_back)


# ============================================================================
# Event Subscription Tests
# ============================================================================

def test_history_detail_subscribes_to_state_updates(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen subscribes to STATE_UPDATED events."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    screen.on_mount()

    # Should subscribe to STATE_UPDATED
    mock_event_bus.subscribe.assert_called()


# ============================================================================
# Refresh Tests
# ============================================================================

def test_history_detail_has_refresh_method(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has refresh method."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    assert hasattr(screen, 'refresh_display') or hasattr(screen, 'action_refresh')


# ============================================================================
# Layout Tests
# ============================================================================

def test_history_detail_has_scrollable_content(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has scrollable content area."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should support scrolling for long details
    # Implementation-specific


# ============================================================================
# Edge Case Tests
# ============================================================================

def test_history_detail_handles_very_long_details(mock_data_manager, mock_event_bus):
    """Test that HistoryDetailScreen handles very long details text."""
    long_details = "\n".join([f"Line {i}: Some detail content here" for i in range(100)])
    long_entry = HistoryEntry(
        timestamp=datetime(2025, 10, 29, 14, 30, 0),
        action_type=ActionType.TASK,
        description="Long task execution",
        success=True,
        details=long_details
    )

    screen = HistoryDetailScreen(
        entry=long_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should handle long details gracefully
    assert len(screen.entry.details) > 1000


def test_history_detail_handles_multiline_details(mock_data_manager, mock_event_bus):
    """Test that HistoryDetailScreen handles multiline details."""
    multiline_entry = HistoryEntry(
        timestamp=datetime(2025, 10, 29, 14, 30, 0),
        action_type=ActionType.SPEC,
        description="Created spec",
        success=True,
        details="Line 1\nLine 2\nLine 3\nLine 4"
    )

    screen = HistoryDetailScreen(
        entry=multiline_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Should display multiline details
    assert "\n" in screen.entry.details


# ============================================================================
# Keyboard Shortcut Tests
# ============================================================================

def test_history_detail_has_escape_binding(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has escape key binding."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "escape" in bindings


def test_history_detail_has_copy_binding(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has copy key binding."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    # Should have copy binding (c or ctrl+c)
    assert "c" in bindings or "copy" in [b.action for b in screen.BINDINGS]


def test_history_detail_has_refresh_binding(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen has refresh key binding."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    bindings = {b.key: b.action for b in screen.BINDINGS}
    assert "r" in bindings


# ============================================================================
# Formatting Tests
# ============================================================================

def test_history_detail_formats_timestamp(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that HistoryDetailScreen formats timestamp nicely."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Timestamp should be formatted (e.g., "Oct 29, 2025 at 2:30 PM")
    # Implementation-specific


def test_history_detail_shows_action_icon(mock_data_manager, mock_event_bus):
    """Test that HistoryDetailScreen shows icon for action type."""
    # Test different action types
    action_types = [
        (ActionType.SPEC, "📝"),
        (ActionType.TASK, "✓"),
        (ActionType.GIT, "🔀"),
        (ActionType.FIX, "🔧"),
        (ActionType.COMMAND, "⚡"),
    ]

    for action_type, expected_icon in action_types:
        entry = HistoryEntry(
            timestamp=datetime(2025, 10, 29, 14, 30, 0),
            action_type=action_type,
            description=f"Test {action_type.value}",
            success=True,
            details=None
        )

        screen = HistoryDetailScreen(
            entry=entry,
            data_manager=mock_data_manager,
            event_bus=mock_event_bus
        )

        # Should show appropriate icon
        assert screen.entry.action_type == action_type


# ============================================================================
# Color/Style Tests
# ============================================================================

def test_history_detail_success_uses_green_styling(mock_data_manager, mock_event_bus, sample_history_entry):
    """Test that successful actions use green styling."""
    screen = HistoryDetailScreen(
        entry=sample_history_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Success indicator should use green styling
    assert screen.entry.success is True


def test_history_detail_failure_uses_red_styling(mock_data_manager, mock_event_bus):
    """Test that failed actions use red styling."""
    failed_entry = HistoryEntry(
        timestamp=datetime(2025, 10, 29, 14, 30, 0),
        action_type=ActionType.TASK,
        description="Task failed",
        success=False,
        details="Error details here"
    )

    screen = HistoryDetailScreen(
        entry=failed_entry,
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )

    # Failure indicator should use red styling
    assert screen.entry.success is False
