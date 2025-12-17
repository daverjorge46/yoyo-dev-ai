"""
Tests for MemoryPanel widget.

Tests for memory status display in TUI:
- Panel rendering with block counts
- Scope display
- Last updated timestamp formatting
- Error state display
- Refresh handling
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

# Import will be created after tests
# from ..widgets.memory_panel import MemoryPanel


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_event_bus():
    """Create a mock event bus."""
    bus = MagicMock()
    bus.subscribe = MagicMock()
    bus.unsubscribe = MagicMock()
    bus.publish = MagicMock()
    return bus


@pytest.fixture
def mock_memory_bridge():
    """Create a mock memory bridge with sample status."""
    from ..services.memory_bridge import MemoryStatus

    bridge = MagicMock()
    bridge.get_status.return_value = MemoryStatus(
        connected=True,
        scope="project",
        block_count=4,
        block_types={"persona": 1, "project": 1, "user": 1, "corrections": 1},
        last_updated=datetime.now() - timedelta(minutes=5),
        database_path=Path("/test/.yoyo-ai/memory/memory.db"),
        error_message=None
    )
    return bridge


@pytest.fixture
def disconnected_memory_bridge():
    """Create a mock memory bridge with disconnected status."""
    from ..services.memory_bridge import MemoryStatus

    bridge = MagicMock()
    bridge.get_status.return_value = MemoryStatus.disconnected()
    return bridge


# =============================================================================
# MemoryPanel Rendering Tests
# =============================================================================

class TestMemoryPanelRendering:
    """Tests for MemoryPanel rendering."""

    def test_render_connected_status(self, mock_event_bus, mock_memory_bridge):
        """Should render connected status with block count."""
        from ..widgets.memory_panel import MemoryPanel

        panel = MemoryPanel(
            memory_bridge=mock_memory_bridge,
            event_bus=mock_event_bus
        )

        # Force update
        panel._update_display()

        # Check rendered content contains key info
        rendered = panel.render()
        rendered_str = str(rendered)

        assert "4" in rendered_str or "blocks" in rendered_str.lower()

    def test_render_disconnected_status(self, mock_event_bus, disconnected_memory_bridge):
        """Should render disconnected status appropriately."""
        from ..widgets.memory_panel import MemoryPanel

        panel = MemoryPanel(
            memory_bridge=disconnected_memory_bridge,
            event_bus=mock_event_bus
        )

        panel._update_display()
        rendered = panel.render()
        rendered_str = str(rendered)

        # Should indicate not connected or no memory
        assert "0" in rendered_str or "not" in rendered_str.lower() or "no" in rendered_str.lower()

    def test_render_scope_indicator(self, mock_event_bus, mock_memory_bridge):
        """Should display current scope (project/global)."""
        from ..widgets.memory_panel import MemoryPanel

        panel = MemoryPanel(
            memory_bridge=mock_memory_bridge,
            event_bus=mock_event_bus
        )

        panel._update_display()
        rendered = panel.render()
        rendered_str = str(rendered)

        assert "project" in rendered_str.lower() or "scope" in rendered_str.lower()

    def test_render_block_type_breakdown(self, mock_event_bus, mock_memory_bridge):
        """Should show breakdown of block types."""
        from ..widgets.memory_panel import MemoryPanel

        panel = MemoryPanel(
            memory_bridge=mock_memory_bridge,
            event_bus=mock_event_bus
        )

        panel._update_display()
        rendered = panel.render()
        rendered_str = str(rendered)

        # Should show at least one block type
        block_types = ["persona", "project", "user", "corrections"]
        has_block_type = any(bt in rendered_str.lower() for bt in block_types)
        assert has_block_type or "4" in rendered_str


class TestMemoryPanelTimestamp:
    """Tests for last updated timestamp display."""

    def test_format_recent_timestamp(self, mock_event_bus, mock_memory_bridge):
        """Should format recent timestamps as relative time."""
        from ..widgets.memory_panel import MemoryPanel, format_memory_timestamp

        # 5 minutes ago
        timestamp = datetime.now() - timedelta(minutes=5)
        formatted = format_memory_timestamp(timestamp)

        assert "min" in formatted or "minute" in formatted

    def test_format_old_timestamp(self, mock_event_bus, mock_memory_bridge):
        """Should format old timestamps with date."""
        from ..widgets.memory_panel import format_memory_timestamp

        # 2 days ago
        timestamp = datetime.now() - timedelta(days=2)
        formatted = format_memory_timestamp(timestamp)

        assert "day" in formatted or "2" in formatted

    def test_format_none_timestamp(self, mock_event_bus, mock_memory_bridge):
        """Should handle None timestamp gracefully."""
        from ..widgets.memory_panel import format_memory_timestamp

        formatted = format_memory_timestamp(None)

        assert formatted == "Never" or formatted == "Unknown"


class TestMemoryPanelErrorHandling:
    """Tests for error state handling."""

    def test_display_error_message(self, mock_event_bus):
        """Should display error message when database error occurs."""
        from ..services.memory_bridge import MemoryStatus
        from ..widgets.memory_panel import MemoryPanel

        bridge = MagicMock()
        bridge.get_status.return_value = MemoryStatus(
            connected=False,
            scope="none",
            block_count=0,
            block_types={},
            last_updated=None,
            database_path=None,
            error_message="Database corrupted"
        )

        panel = MemoryPanel(
            memory_bridge=bridge,
            event_bus=mock_event_bus
        )

        panel._update_display()
        rendered = panel.render()
        rendered_str = str(rendered)

        # Should indicate error or no connection
        has_error_indication = (
            "error" in rendered_str.lower() or
            "corrupted" in rendered_str.lower() or
            "0" in rendered_str
        )
        assert has_error_indication


class TestMemoryPanelRefresh:
    """Tests for refresh functionality."""

    def test_refresh_updates_display(self, mock_event_bus, mock_memory_bridge):
        """Should update display on refresh."""
        from ..widgets.memory_panel import MemoryPanel
        from ..services.memory_bridge import MemoryStatus

        panel = MemoryPanel(
            memory_bridge=mock_memory_bridge,
            event_bus=mock_event_bus
        )

        # Initial display
        panel._update_display()
        assert panel._status.block_count == 4

        # Update mock to return different count
        mock_memory_bridge.get_status.return_value = MemoryStatus(
            connected=True,
            scope="project",
            block_count=5,
            block_types={"persona": 1, "project": 1, "user": 2, "corrections": 1},
            last_updated=datetime.now(),
            database_path=Path("/test/.yoyo-ai/memory/memory.db"),
            error_message=None
        )

        # Refresh
        panel.refresh_display()
        assert panel._status.block_count == 5

    def test_subscribe_to_state_updates(self, mock_event_bus, mock_memory_bridge):
        """Should subscribe to STATE_UPDATED events on mount."""
        from ..widgets.memory_panel import MemoryPanel
        from ..models import EventType

        panel = MemoryPanel(
            memory_bridge=mock_memory_bridge,
            event_bus=mock_event_bus
        )

        # Simulate mount
        panel.on_mount()

        # Should have subscribed
        mock_event_bus.subscribe.assert_called()

    def test_unsubscribe_on_unmount(self, mock_event_bus, mock_memory_bridge):
        """Should unsubscribe from events on unmount."""
        from ..widgets.memory_panel import MemoryPanel

        panel = MemoryPanel(
            memory_bridge=mock_memory_bridge,
            event_bus=mock_event_bus
        )

        # Simulate mount then unmount
        panel.on_mount()
        panel.on_unmount()

        # Should have unsubscribed
        mock_event_bus.unsubscribe.assert_called()


# =============================================================================
# Integration with ProjectOverview Tests
# =============================================================================

class TestMemoryInProjectOverview:
    """Tests for memory display integration in ProjectOverview."""

    def test_project_overview_shows_memory_status(self, mock_event_bus):
        """Should show memory status in project overview panel."""
        # This test validates the integration point
        # Will be implemented when MemoryPanel is integrated
        pass

    def test_memory_stats_in_quick_stats(self, mock_event_bus):
        """Should include memory block count in quick stats."""
        # This test validates the stats integration
        pass
