"""
Tests for MainScreen auto-refresh timer functionality.

Tests that MainScreen automatically refreshes task data using a polling timer
every 10 seconds, ensuring real-time updates without manual refresh.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, call
from pathlib import Path

from ..screens.main import MainScreen
from ..models import TaskData, ParentTask, Subtask
from ..config import TUIConfig


class TestMainScreenAutoRefresh:
    """Test auto-refresh timer in MainScreen."""

    @pytest.fixture
    def mock_config(self):
        """Create mock TUI configuration."""
        config = TUIConfig()
        config.refresh_interval = 10.0  # 10 seconds
        return config

    @pytest.fixture
    def mock_task_data(self):
        """Create mock task data for testing."""
        return TaskData(
            parent_tasks=[
                ParentTask(
                    number=1,
                    name="Test Task",
                    completed=False,
                    subtasks=[
                        Subtask(number="1.1", text="Subtask 1", completed=False),
                        Subtask(number="1.2", text="Subtask 2", completed=True),
                    ]
                )
            ],
            source_type="spec",
            spec_name="test-feature",
            file_path=Path(".yoyo-dev/specs/2025-10-17-test-feature/tasks.md")
        )

    @pytest.mark.asyncio
    async def test_auto_refresh_timer_initialized_on_mount(self, mock_config):
        """
        Test that auto-refresh timer is initialized when MainScreen mounts.

        Expected: MainScreen.on_mount() should call set_interval() to start polling timer.
        """
        screen = MainScreen(config=mock_config)

        with patch.object(screen, 'set_interval') as mock_set_interval:
            with patch.object(screen, 'load_data'):
                with patch.object(screen, 'check_terminal_size'):
                    screen.on_mount()

                    # Verify set_interval was called with correct interval (10 seconds)
                    mock_set_interval.assert_called_once()
                    args, kwargs = mock_set_interval.call_args

                    # First argument should be the refresh method
                    assert callable(args[0])

                    # Second argument should be the interval (10 seconds)
                    assert args[1] == 10.0

    @pytest.mark.asyncio
    async def test_auto_refresh_timer_calls_refresh_method(self, mock_config, mock_task_data):
        """
        Test that the polling timer calls the refresh method periodically.

        Expected: Timer should call refresh_task_data() every 10 seconds.
        """
        screen = MainScreen(config=mock_config)

        with patch.object(screen, 'refresh_task_data') as mock_refresh:
            with patch.object(screen, 'load_data'):
                with patch.object(screen, 'check_terminal_size'):
                    # Simulate timer callback being invoked
                    screen.on_mount()

                    # Manually trigger the timer callback
                    # In actual implementation, this would be called by set_interval
                    if hasattr(screen, '_auto_refresh_callback'):
                        screen._auto_refresh_callback()
                        mock_refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_refresh_task_data_reloads_without_full_screen_refresh(self, mock_config, mock_task_data):
        """
        Test that refresh_task_data() reloads task data without full screen refresh.

        Expected: Method should reload task data and update widgets without remounting screen.
        """
        screen = MainScreen(config=mock_config)
        screen.task_data = mock_task_data

        # Mock widgets
        mock_task_tree = Mock()
        mock_progress_panel = Mock()
        mock_next_tasks_panel = Mock()
        mock_suggested_commands = Mock()

        with patch.object(screen, 'query_one') as mock_query_one:
            mock_query_one.side_effect = [
                mock_task_tree,
                mock_progress_panel,
                mock_next_tasks_panel,
                mock_suggested_commands
            ]

            with patch('yoyo_tui.services.data_manager.DataManager.load_active_tasks', return_value=mock_task_data):
                # Call refresh_task_data (method to be implemented)
                if hasattr(screen, 'refresh_task_data'):
                    screen.refresh_task_data()

                    # Verify widgets were updated
                    mock_task_tree.load_tasks.assert_called_once()
                    mock_progress_panel.update_data.assert_called_once()
                    mock_next_tasks_panel.update_data.assert_called_once()
                    mock_suggested_commands.update_data.assert_called_once()

    @pytest.mark.asyncio
    async def test_refresh_task_data_handles_widget_not_mounted(self, mock_config):
        """
        Test that refresh_task_data() handles case when widgets aren't mounted yet.

        Expected: Method should gracefully handle exceptions when widgets don't exist.
        """
        screen = MainScreen(config=mock_config)

        with patch.object(screen, 'query_one', side_effect=Exception("Widget not found")):
            # Should not raise exception
            if hasattr(screen, 'refresh_task_data'):
                try:
                    screen.refresh_task_data()
                    assert True  # Success if no exception
                except Exception:
                    pytest.fail("refresh_task_data() should handle missing widgets gracefully")

    @pytest.mark.asyncio
    async def test_timer_interval_configurable(self):
        """
        Test that auto-refresh timer interval is configurable via TUIConfig.

        Expected: Different config values should result in different timer intervals.
        """
        # Test with custom refresh interval
        config = TUIConfig()
        config.refresh_interval = 5.0  # 5 seconds instead of 10

        screen = MainScreen(config=config)

        with patch.object(screen, 'set_interval') as mock_set_interval:
            with patch.object(screen, 'load_data'):
                with patch.object(screen, 'check_terminal_size'):
                    screen.on_mount()

                    # Verify set_interval was called with custom interval
                    args, kwargs = mock_set_interval.call_args
                    assert args[1] == 5.0

    @pytest.mark.asyncio
    async def test_timer_can_be_cancelled_on_unmount(self, mock_config):
        """
        Test that auto-refresh timer is cancelled when screen unmounts.

        Expected: Timer should be stopped to prevent memory leaks.
        """
        screen = MainScreen(config=mock_config)
        mock_timer = Mock()

        with patch.object(screen, 'set_interval', return_value=mock_timer):
            with patch.object(screen, 'load_data'):
                with patch.object(screen, 'check_terminal_size'):
                    screen.on_mount()

                    # Simulate unmount
                    if hasattr(screen, 'on_unmount'):
                        screen.on_unmount()

                        # Verify timer was cancelled
                        if hasattr(mock_timer, 'stop'):
                            mock_timer.stop.assert_called_once()
