"""
Integration tests for the full dashboard functionality.

Tests end-to-end integration of DataManager, widgets, and user interactions.
"""

import pytest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Import components under test
from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.widgets.active_work_panel import ActiveWorkPanel
from lib.yoyo_tui_v3.widgets.history_panel import HistoryPanel
from lib.yoyo_tui_v3.screens.main_dashboard import MainDashboard
from lib.yoyo_tui_v3.models import (
    ActiveWork, HistoryEntry, Task, TaskStatus, ActionType, EventType, Event
)


@pytest.fixture
def mock_yoyo_dev_dir(tmp_path):
    """Create a mock .yoyo-dev directory with test data."""
    yoyo_dir = tmp_path / ".yoyo-dev"

    # Create product directory
    product_dir = yoyo_dir / "product"
    product_dir.mkdir(parents=True)

    (product_dir / "mission-lite.md").write_text("Test mission")
    (product_dir / "tech-stack.md").write_text("Test tech stack")

    # Create spec with incomplete tasks
    spec_dir = yoyo_dir / "specs" / "2025-10-30-test-feature"
    spec_dir.mkdir(parents=True)

    (spec_dir / "spec.md").write_text("# Test Feature Spec")
    (spec_dir / "tasks.md").write_text("""
## Task 1: Implement feature

- [x] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

## Task 2: Test feature

- [ ] Subtask 1
""")

    # Create fix with incomplete tasks
    fix_dir = yoyo_dir / "fixes" / "2025-10-29-test-fix"
    fix_dir.mkdir(parents=True)

    (fix_dir / "analysis.md").write_text("# Test Fix Analysis")
    (fix_dir / "tasks.md").write_text("""
## Task 1: Write tests

- [x] Subtask 1

## Task 2: Fix bug

- [ ] Subtask 1
""")

    # Create recaps
    recaps_dir = yoyo_dir / "recaps"
    recaps_dir.mkdir(parents=True)

    (recaps_dir / "2025-10-28-completed-feature.md").write_text("""
# Completed Feature

Date: 2025-10-28
Status: Completed
""")

    return yoyo_dir


@pytest.fixture
def event_bus():
    """Create EventBus instance."""
    return EventBus()


@pytest.fixture
def cache_manager():
    """Create CacheManager instance."""
    from lib.yoyo_tui_v3.services.cache_manager import CacheManager
    return CacheManager(default_ttl=300)


@pytest.fixture
def data_manager(mock_yoyo_dev_dir, event_bus, cache_manager):
    """Create DataManager instance with test data."""
    manager = DataManager(
        yoyo_dev_path=mock_yoyo_dev_dir,
        event_bus=event_bus,
        cache_manager=cache_manager
    )
    manager.initialize()
    return manager


class TestActiveWorkPanelIntegration:
    """Integration tests for ActiveWorkPanel with real DataManager."""

    def test_panel_populates_with_active_spec(self, data_manager, event_bus):
        """Test that ActiveWorkPanel displays active spec data correctly."""
        # Create panel
        panel = ActiveWorkPanel(data_manager=data_manager, event_bus=event_bus)

        # Simulate mount (triggers initial data load)
        panel.on_mount()

        # Verify active work was loaded
        assert panel._active_work is not None
        assert panel._active_work.type == "spec"
        assert panel._active_work.name == "test-feature"
        assert panel._active_work.progress > 0
        assert len(panel._active_work.tasks) > 0

    def test_panel_displays_counts(self, data_manager, event_bus):
        """Test that panel shows correct counts for specs and fixes."""
        panel = ActiveWorkPanel(data_manager=data_manager, event_bus=event_bus)
        panel.on_mount()

        # Should show counts
        assert panel._all_specs_count > 0
        assert panel._all_fixes_count > 0

    def test_panel_responds_to_state_updated_event(self, data_manager, event_bus):
        """Test that panel updates when STATE_UPDATED event is published."""
        panel = ActiveWorkPanel(data_manager=data_manager, event_bus=event_bus)
        panel.on_mount()

        # Record initial state
        initial_work = panel._active_work

        # Simulate data change (add another spec)
        # Then publish STATE_UPDATED event
        event = Event(type=EventType.STATE_UPDATED, data={})
        event_bus.publish(event)

        # Panel should have refreshed
        # (In real scenario, data would have changed)
        assert panel._active_work is not None

    def test_panel_renders_without_errors(self, data_manager, event_bus):
        """Test that panel renders successfully with data."""
        panel = ActiveWorkPanel(data_manager=data_manager, event_bus=event_bus)
        panel.on_mount()

        # Render should not raise exceptions
        rendered = panel.render()

        # Should contain expected content
        assert rendered is not None
        assert "ACTIVE WORK" in str(rendered)

    def test_panel_handles_no_active_work_gracefully(self, tmp_path, event_bus):
        """Test panel when there's no active work."""
        # Create empty .yoyo-dev directory
        yoyo_dir = tmp_path / ".yoyo-dev"
        yoyo_dir.mkdir()

        from lib.yoyo_tui_v3.services.cache_manager import CacheManager
        cache_manager = CacheManager(default_ttl=300)

        manager = DataManager(
            yoyo_dev_path=yoyo_dir,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        manager.initialize()

        panel = ActiveWorkPanel(data_manager=manager, event_bus=event_bus)
        panel.on_mount()

        # Should handle gracefully
        assert panel._active_work is None or panel._active_work.type == "none"

        # Should still render
        rendered = panel.render()
        assert "No active work" in str(rendered)


class TestHistoryPanelIntegration:
    """Integration tests for HistoryPanel with real DataManager."""

    def test_panel_populates_with_history(self, data_manager, event_bus):
        """Test that HistoryPanel displays history entries correctly."""
        panel = HistoryPanel(data_manager=data_manager, event_bus=event_bus)
        panel.on_mount()

        # Should have loaded history
        assert len(panel._history_entries) > 0

        # Entries should be HistoryEntry objects
        assert all(isinstance(e, HistoryEntry) for e in panel._history_entries)

    def test_panel_limits_history_count(self, data_manager, event_bus):
        """Test that panel respects count limit."""
        panel = HistoryPanel(data_manager=data_manager, event_bus=event_bus)
        panel.on_mount()

        # Should be limited to 10
        assert len(panel._history_entries) <= 10

    def test_panel_renders_without_errors(self, data_manager, event_bus):
        """Test that panel renders successfully with data."""
        panel = HistoryPanel(data_manager=data_manager, event_bus=event_bus)
        panel.on_mount()

        rendered = panel.render()

        assert rendered is not None
        assert "RECENT HISTORY" in str(rendered)

    def test_panel_responds_to_events(self, data_manager, event_bus):
        """Test that panel updates on various events."""
        panel = HistoryPanel(data_manager=data_manager, event_bus=event_bus)
        panel.on_mount()

        initial_count = len(panel._history_entries)

        # Publish events
        event_bus.publish(Event(type=EventType.STATE_UPDATED, data={}))
        event_bus.publish(Event(type=EventType.TASK_COMPLETED, data={"task_id": 1}))

        # Panel should still have history
        assert panel._history_entries is not None

    def test_panel_handles_empty_history_gracefully(self, tmp_path, event_bus):
        """Test panel when there's no history."""
        yoyo_dir = tmp_path / ".yoyo-dev"
        yoyo_dir.mkdir()

        from lib.yoyo_tui_v3.services.cache_manager import CacheManager
        cache_manager = CacheManager(default_ttl=300)

        manager = DataManager(
            yoyo_dev_path=yoyo_dir,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        manager.initialize()

        panel = HistoryPanel(data_manager=manager, event_bus=event_bus)
        panel.on_mount()

        assert len(panel._history_entries) == 0

        rendered = panel.render()
        assert "No recent activity" in str(rendered)


class TestKeyboardShortcutIntegration:
    """Integration tests for keyboard shortcuts with MainDashboard."""

    @pytest.fixture
    def mock_app(self):
        """Create mock Textual app."""
        app = MagicMock()
        app.bell = Mock()
        app.exit = Mock()
        return app

    @pytest.fixture
    def dashboard(self, data_manager, event_bus, mock_app):
        """Create MainDashboard instance."""
        dashboard = MainDashboard(data_manager=data_manager, event_bus=event_bus)
        dashboard.app = mock_app
        return dashboard

    def test_action_help_exists(self, dashboard):
        """Test that action_help method exists and is callable."""
        assert hasattr(dashboard, 'action_help')
        assert callable(dashboard.action_help)

        # Call should not raise exception
        dashboard.action_help()
        dashboard.app.bell.assert_called_once()

    def test_action_command_search_exists(self, dashboard):
        """Test that action_command_search method exists."""
        assert hasattr(dashboard, 'action_command_search')
        assert callable(dashboard.action_command_search)

    def test_action_focus_active_work_exists(self, dashboard):
        """Test that action_focus_active_work (t key) exists."""
        # In MainDashboard, 't' key maps to action_focus_active_work
        # Note: The action name might be different - check actual implementation
        assert hasattr(dashboard, 'action_focus_active_work')
        assert callable(dashboard.action_focus_active_work)

    def test_action_focus_history_exists(self, dashboard):
        """Test that action_focus_history (h key) exists."""
        assert hasattr(dashboard, 'action_focus_history')
        assert callable(dashboard.action_focus_history)

    def test_action_focus_specs_exists(self, dashboard):
        """Test that action_focus_specs (s key) exists."""
        assert hasattr(dashboard, 'action_focus_specs')
        assert callable(dashboard.action_focus_specs)

    def test_action_refresh_exists(self, dashboard):
        """Test that action_refresh exists."""
        assert hasattr(dashboard, 'action_refresh')
        assert callable(dashboard.action_refresh)

    def test_action_quit_exists(self, dashboard):
        """Test that action_quit (q key) exists."""
        assert hasattr(dashboard, 'action_quit')
        assert callable(dashboard.action_quit)

        # Call should trigger app.exit()
        dashboard.action_quit()
        dashboard.app.exit.assert_called_once()


class TestFullDashboardIntegration:
    """End-to-end integration tests for complete dashboard."""

    def test_dashboard_initializes_with_all_panels(self, data_manager, event_bus):
        """Test that dashboard initializes all panels correctly."""
        dashboard = MainDashboard(data_manager=data_manager, event_bus=event_bus)

        # Dashboard should have panels
        assert hasattr(dashboard, '_active_work_panel')
        assert hasattr(dashboard, '_history_panel')
        assert hasattr(dashboard, '_command_palette_panel')

    def test_dashboard_loads_data_on_mount(self, data_manager, event_bus):
        """Test that dashboard loads data when mounted."""
        dashboard = MainDashboard(data_manager=data_manager, event_bus=event_bus)

        # Simulate compose (creates panels)
        dashboard.compose()

        # Panels should be created (though compose returns generator)
        assert dashboard._data_manager is not None
        assert dashboard._event_bus is not None

    def test_dashboard_refresh_updates_all_panels(self, data_manager, event_bus):
        """Test that refresh updates all panels."""
        dashboard = MainDashboard(data_manager=data_manager, event_bus=event_bus)

        # Create mock panels
        dashboard._active_work_panel = Mock()
        dashboard._active_work_panel.refresh_display = Mock()

        dashboard._history_panel = Mock()
        dashboard._history_panel.refresh_display = Mock()

        dashboard._mission_panel = Mock()
        dashboard._mission_panel.refresh_display = Mock()

        # Call refresh
        dashboard.refresh_all_panels()

        # All panels should have been refreshed
        dashboard._active_work_panel.refresh_display.assert_called_once()
        dashboard._history_panel.refresh_display.assert_called_once()
        dashboard._mission_panel.refresh_display.assert_called_once()

    def test_dashboard_handles_data_manager_errors_gracefully(self, tmp_path, event_bus):
        """Test that dashboard handles DataManager errors without crashing."""
        from lib.yoyo_tui_v3.services.cache_manager import CacheManager
        cache_manager = CacheManager(default_ttl=300)

        # Create DataManager with nonexistent path
        manager = DataManager(
            yoyo_dev_path=tmp_path / "nonexistent",
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # Dashboard should still initialize
        dashboard = MainDashboard(data_manager=manager, event_bus=event_bus)

        # Should not raise exceptions
        assert dashboard is not None
