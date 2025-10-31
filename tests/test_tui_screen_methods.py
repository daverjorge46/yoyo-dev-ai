"""
Tests for TUI Screen DataManager Method Calls

Tests that screens call correct DataManager methods without AttributeError.
"""

import pytest
from unittest.mock import Mock, MagicMock
from pathlib import Path

from lib.yoyo_tui_v3.screens.tasks_screen import TasksScreen
from lib.yoyo_tui_v3.screens.history_screen import HistoryScreen
from lib.yoyo_tui_v3.screens.task_detail_screen import TaskDetailScreen
from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager
from lib.yoyo_tui_v3.models import TaskData, SpecData, FixData


class TestTasksScreenMethods:
    """Test TasksScreen calls correct DataManager methods."""

    @pytest.fixture
    def mock_data_manager(self):
        """Create mock DataManager with correct methods."""
        dm = Mock(spec=DataManager)
        dm.get_all_specs = Mock(return_value=[])
        dm.get_all_fixes = Mock(return_value=[])
        return dm

    @pytest.fixture
    def mock_event_bus(self):
        """Create mock EventBus."""
        return Mock(spec=EventBus)

    def test_tasks_screen_calls_get_all_specs(self, mock_data_manager, mock_event_bus):
        """Test that TasksScreen calls get_all_specs() not get_active_specs()."""
        screen = TasksScreen(mock_data_manager, mock_event_bus)

        # Build content (triggers DataManager calls)
        content = screen._build_tasks_content()

        # Should call get_all_specs()
        mock_data_manager.get_all_specs.assert_called_once()

    def test_tasks_screen_calls_get_all_fixes(self, mock_data_manager, mock_event_bus):
        """Test that TasksScreen calls get_all_fixes() not get_active_fixes()."""
        screen = TasksScreen(mock_data_manager, mock_event_bus)

        # Build content (triggers DataManager calls)
        content = screen._build_tasks_content()

        # Should call get_all_fixes()
        mock_data_manager.get_all_fixes.assert_called_once()

    def test_tasks_screen_no_attribute_error(self, mock_data_manager, mock_event_bus):
        """Test that TasksScreen doesn't raise AttributeError."""
        screen = TasksScreen(mock_data_manager, mock_event_bus)

        # Should not raise AttributeError
        content = screen._build_tasks_content()
        assert content is not None


class TestHistoryScreenMethods:
    """Test HistoryScreen calls correct DataManager methods."""

    @pytest.fixture
    def mock_data_manager(self):
        """Create mock DataManager with correct methods."""
        dm = Mock(spec=DataManager)
        dm.get_recent_history = Mock(return_value=[])
        return dm

    @pytest.fixture
    def mock_event_bus(self):
        """Create mock EventBus."""
        return Mock(spec=EventBus)

    def test_history_screen_calls_get_recent_history(self, mock_data_manager, mock_event_bus):
        """Test that HistoryScreen calls get_recent_history() with count parameter."""
        screen = HistoryScreen(mock_data_manager, mock_event_bus)

        # Build content (triggers DataManager calls)
        content = screen._build_history_content()

        # Should call get_recent_history(count=30)
        mock_data_manager.get_recent_history.assert_called_once_with(count=30)

    def test_history_screen_no_attribute_error(self, mock_data_manager, mock_event_bus):
        """Test that HistoryScreen doesn't raise AttributeError."""
        screen = HistoryScreen(mock_data_manager, mock_event_bus)

        # Should not raise AttributeError
        content = screen._build_history_content()
        assert content is not None


class TestTaskDetailScreenMethods:
    """Test TaskDetailScreen refresh method."""

    @pytest.fixture
    def mock_data_manager(self):
        """Create mock DataManager with correct methods."""
        dm = Mock(spec=DataManager)
        # Add get_all_tasks method (exists in DataManager)
        dm.get_all_tasks = Mock(return_value=[])
        return dm

    @pytest.fixture
    def mock_event_bus(self):
        """Create mock EventBus."""
        return Mock(spec=EventBus)

    @pytest.fixture
    def sample_task(self):
        """Create sample task data."""
        task = Mock(spec=TaskData)
        task.id = "task-1"
        task.spec_name = "test-spec"
        task.name = "Test Task"
        return task

    def test_task_detail_screen_refresh_no_attribute_error(self, mock_data_manager, mock_event_bus, sample_task):
        """Test that TaskDetailScreen refresh doesn't raise AttributeError."""
        screen = TaskDetailScreen(sample_task, mock_data_manager, mock_event_bus)

        # Should not raise AttributeError when refreshing
        # Note: May need to adjust implementation to not call get_task_by_id
        try:
            screen.refresh_display()
            # If no error, test passes
            assert True
        except AttributeError as e:
            if "get_task_by_id" in str(e):
                pytest.fail(f"TaskDetailScreen calls non-existent get_task_by_id: {e}")
            else:
                raise
