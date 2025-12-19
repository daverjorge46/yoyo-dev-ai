"""
Tests for SkillsPanel widget.

Tests for the skills status display widget:
- Rendering connected and disconnected states
- Displaying skill counts and statistics
- Success rate styling
- Summary line generation
"""

import pytest
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_event_bus():
    """Create a mock event bus."""
    mock = MagicMock()
    mock.subscribe = MagicMock()
    mock.unsubscribe = MagicMock()
    return mock


@pytest.fixture
def connected_status():
    """Create a connected skills status."""
    from ..services.skills_bridge import SkillsStatus, SkillStats

    now = datetime.now()
    return SkillsStatus(
        connected=True,
        scope="project",
        total_skills=5,
        total_usage=25,
        average_success_rate=0.85,
        top_skills=[
            SkillStats(
                skill_id="react-patterns",
                name="React Patterns",
                total_usage=10,
                success_count=9,
                failure_count=1,
                success_rate=0.9,
                last_used=now
            ),
            SkillStats(
                skill_id="typescript-best",
                name="TypeScript Best Practices",
                total_usage=8,
                success_count=7,
                failure_count=1,
                success_rate=0.875,
                last_used=now
            ),
        ],
        recent_skills=[
            SkillStats(
                skill_id="react-patterns",
                name="React Patterns",
                total_usage=10,
                success_count=9,
                failure_count=1,
                success_rate=0.9,
                last_used=now
            ),
        ],
        database_path=Path("/test/skills.db"),
        error_message=None
    )


@pytest.fixture
def disconnected_status():
    """Create a disconnected skills status."""
    from ..services.skills_bridge import SkillsStatus

    return SkillsStatus.disconnected("No skills database found")


@pytest.fixture
def mock_skills_bridge(connected_status):
    """Create a mock skills bridge returning connected status."""
    mock = MagicMock()
    mock.get_status.return_value = connected_status
    return mock


@pytest.fixture
def mock_disconnected_bridge(disconnected_status):
    """Create a mock skills bridge returning disconnected status."""
    mock = MagicMock()
    mock.get_status.return_value = disconnected_status
    return mock


# =============================================================================
# Helper Function Tests
# =============================================================================

class TestFormatFunctions:
    """Tests for formatting helper functions."""

    def test_format_skill_timestamp_just_now(self):
        """Should format recent timestamps as 'just now'."""
        from ..widgets.skills_panel import format_skill_timestamp

        now = datetime.now()
        assert format_skill_timestamp(now) == "just now"

    def test_format_skill_timestamp_none(self):
        """Should handle None timestamps."""
        from ..widgets.skills_panel import format_skill_timestamp

        assert format_skill_timestamp(None) == "Never"

    def test_format_success_rate(self):
        """Should format success rate as percentage."""
        from ..widgets.skills_panel import format_success_rate

        assert format_success_rate(0.85) == "85%"
        assert format_success_rate(1.0) == "100%"
        assert format_success_rate(0.0) == "0%"

    def test_get_success_style_high(self):
        """Should return green style for high success rate."""
        from ..widgets.skills_panel import get_success_style

        assert "green" in get_success_style(0.9)
        assert "green" in get_success_style(0.85)

    def test_get_success_style_medium(self):
        """Should return yellow style for medium success rate."""
        from ..widgets.skills_panel import get_success_style

        assert "yellow" in get_success_style(0.7)
        assert "yellow" in get_success_style(0.65)

    def test_get_success_style_low(self):
        """Should return red style for low success rate."""
        from ..widgets.skills_panel import get_success_style

        assert "red" in get_success_style(0.3)


# =============================================================================
# SkillsPanel Render Tests
# =============================================================================

class TestSkillsPanelRender:
    """Tests for SkillsPanel rendering."""

    def test_render_connected_state(self, mock_skills_bridge, mock_event_bus):
        """Should render connected state with skill info."""
        from ..widgets.skills_panel import SkillsPanel

        panel = SkillsPanel(
            skills_bridge=mock_skills_bridge,
            event_bus=mock_event_bus
        )
        panel._status = mock_skills_bridge.get_status()

        content = panel.render()
        text = content.plain

        assert "Skills" in text
        assert "5" in text  # total_skills
        assert "project" in text  # scope

    def test_render_disconnected_state(self, mock_disconnected_bridge, mock_event_bus):
        """Should render disconnected state."""
        from ..widgets.skills_panel import SkillsPanel

        panel = SkillsPanel(
            skills_bridge=mock_disconnected_bridge,
            event_bus=mock_event_bus
        )
        panel._status = mock_disconnected_bridge.get_status()

        content = panel.render()
        text = content.plain

        assert "Skills" in text
        assert "Not initialized" in text

    def test_render_includes_usage_count(self, mock_skills_bridge, mock_event_bus, connected_status):
        """Should include usage count in render."""
        from ..widgets.skills_panel import SkillsPanel

        panel = SkillsPanel(
            skills_bridge=mock_skills_bridge,
            event_bus=mock_event_bus
        )
        panel._status = connected_status

        content = panel.render()
        text = content.plain

        assert "25" in text  # total_usage

    def test_render_includes_success_rate(self, mock_skills_bridge, mock_event_bus, connected_status):
        """Should include average success rate in render."""
        from ..widgets.skills_panel import SkillsPanel

        panel = SkillsPanel(
            skills_bridge=mock_skills_bridge,
            event_bus=mock_event_bus
        )
        panel._status = connected_status

        content = panel.render()
        text = content.plain

        assert "85%" in text  # average_success_rate


class TestSkillsPanelSummaryLine:
    """Tests for SkillsPanel summary line generation."""

    def test_summary_line_connected(self, mock_skills_bridge, mock_event_bus, connected_status):
        """Should generate summary line for connected state."""
        from ..widgets.skills_panel import SkillsPanel

        panel = SkillsPanel(
            skills_bridge=mock_skills_bridge,
            event_bus=mock_event_bus
        )
        panel._status = connected_status

        summary = panel.get_summary_line()
        text = summary.plain

        assert "Skills" in text
        assert "5" in text

    def test_summary_line_disconnected(self, mock_disconnected_bridge, mock_event_bus, disconnected_status):
        """Should generate summary line for disconnected state."""
        from ..widgets.skills_panel import SkillsPanel

        panel = SkillsPanel(
            skills_bridge=mock_disconnected_bridge,
            event_bus=mock_event_bus
        )
        panel._status = disconnected_status

        summary = panel.get_summary_line()
        text = summary.plain

        assert "Skills" in text
        assert "Not initialized" in text


# =============================================================================
# SkillsStatusLine Tests
# =============================================================================

class TestSkillsStatusLine:
    """Tests for SkillsStatusLine widget."""

    def test_render_connected(self, mock_skills_bridge, mock_event_bus, connected_status):
        """Should render compact connected state."""
        from ..widgets.skills_panel import SkillsStatusLine

        widget = SkillsStatusLine(
            skills_bridge=mock_skills_bridge,
            event_bus=mock_event_bus
        )
        widget._status = connected_status

        content = widget.render()
        text = content.plain

        assert "Skills" in text
        assert "5" in text
        assert "project" in text

    def test_render_disconnected(self, mock_disconnected_bridge, mock_event_bus, disconnected_status):
        """Should render compact disconnected state."""
        from ..widgets.skills_panel import SkillsStatusLine

        widget = SkillsStatusLine(
            skills_bridge=mock_disconnected_bridge,
            event_bus=mock_event_bus
        )
        widget._status = disconnected_status

        content = widget.render()
        text = content.plain

        assert "Skills" in text
        assert "Not initialized" in text

    def test_render_includes_success_rate(self, mock_skills_bridge, mock_event_bus, connected_status):
        """Should include success rate in compact render."""
        from ..widgets.skills_panel import SkillsStatusLine

        widget = SkillsStatusLine(
            skills_bridge=mock_skills_bridge,
            event_bus=mock_event_bus
        )
        widget._status = connected_status

        content = widget.render()
        text = content.plain

        assert "85%" in text


# =============================================================================
# Edge Cases
# =============================================================================

class TestSkillsPanelEdgeCases:
    """Tests for edge cases."""

    def test_handle_empty_skills(self, mock_event_bus):
        """Should handle empty skills list."""
        from ..widgets.skills_panel import SkillsPanel
        from ..services.skills_bridge import SkillsStatus

        status = SkillsStatus(
            connected=True,
            scope="project",
            total_skills=0,
            total_usage=0,
            average_success_rate=0.0,
            top_skills=[],
            recent_skills=[],
            database_path=Path("/test/skills.db"),
            error_message=None
        )

        mock_bridge = MagicMock()
        mock_bridge.get_status.return_value = status

        panel = SkillsPanel(
            skills_bridge=mock_bridge,
            event_bus=mock_event_bus
        )
        panel._status = status

        content = panel.render()
        text = content.plain

        assert "Skills" in text
        assert "0" in text

    def test_handle_error_message(self, mock_event_bus):
        """Should display error message when present."""
        from ..widgets.skills_panel import SkillsPanel
        from ..services.skills_bridge import SkillsStatus

        status = SkillsStatus.disconnected("Database corrupted")

        mock_bridge = MagicMock()
        mock_bridge.get_status.return_value = status

        panel = SkillsPanel(
            skills_bridge=mock_bridge,
            event_bus=mock_event_bus
        )
        panel._status = status

        content = panel.render()
        text = content.plain

        assert "Database corrupted" in text
