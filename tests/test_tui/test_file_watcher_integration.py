#!/usr/bin/env python3
"""
Test FileWatcher integration with YoyoDevApp.

Tests that app correctly starts file watcher and triggers refresh callbacks.
"""

import sys
import time
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestFileWatcherIntegration:
    """Test FileWatcher integration in YoyoDevApp."""

    def test_app_has_file_watcher_methods(self):
        """Test that app has file watcher methods."""
        from yoyo_tui.app import YoyoDevApp

        assert hasattr(YoyoDevApp, 'start_file_watcher')
        assert hasattr(YoyoDevApp, 'stop_file_watcher')
        assert hasattr(YoyoDevApp, 'on_file_change')

    @patch('yoyo_tui.app.ConfigManager')
    def test_app_initializes_file_watcher_to_none(self, mock_config):
        """Test that file watcher is initialized to None."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        mock_config.load.return_value = TUIConfig()
        app = YoyoDevApp()

        assert app.file_watcher is None

    @patch('yoyo_tui.app.ConfigManager')
    @patch('yoyo_tui.app.Path.cwd')
    @patch('yoyo_tui.app.FileWatcher')
    def test_start_file_watcher_creates_watcher(self, mock_fw_class, mock_cwd, mock_config):
        """Test that start_file_watcher creates FileWatcher instance."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        # Setup mocks
        mock_config.load.return_value = TUIConfig()
        mock_yoyo_dev_dir = MagicMock()
        mock_yoyo_dev_dir.exists.return_value = True
        mock_yoyo_dev_dir.is_dir.return_value = True
        mock_cwd.return_value.__truediv__.return_value = mock_yoyo_dev_dir

        mock_watcher = MagicMock()
        mock_watcher.start_watching.return_value = True
        mock_fw_class.return_value = mock_watcher

        # Create app
        app = YoyoDevApp()

        # Call start_file_watcher
        app.start_file_watcher()

        # Verify FileWatcher was created with correct parameters
        mock_fw_class.assert_called_once()
        call_kwargs = mock_fw_class.call_args[1]
        assert 'callback' in call_kwargs
        assert 'debounce_interval' in call_kwargs
        assert call_kwargs['debounce_interval'] == 1.5

    @patch('yoyo_tui.app.ConfigManager')
    @patch('yoyo_tui.app.Path.cwd')
    def test_start_file_watcher_skips_if_no_yoyo_dev_dir(self, mock_cwd, mock_config):
        """Test that start_file_watcher skips if .yoyo-dev doesn't exist."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        # Setup mocks
        mock_config.load.return_value = TUIConfig()
        mock_yoyo_dev_dir = MagicMock()
        mock_yoyo_dev_dir.exists.return_value = False
        mock_cwd.return_value.__truediv__.return_value = mock_yoyo_dev_dir

        # Create app
        app = YoyoDevApp()

        # Call start_file_watcher
        app.start_file_watcher()

        # Verify watcher was not created
        assert app.file_watcher is None

    @patch('yoyo_tui.app.ConfigManager')
    def test_stop_file_watcher_handles_none(self, mock_config):
        """Test that stop_file_watcher handles None gracefully."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        mock_config.load.return_value = TUIConfig()
        app = YoyoDevApp()

        # Should not raise error
        app.stop_file_watcher()

    @patch('yoyo_tui.app.ConfigManager')
    def test_stop_file_watcher_calls_stop(self, mock_config):
        """Test that stop_file_watcher calls watcher.stop()."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        mock_config.load.return_value = TUIConfig()
        app = YoyoDevApp()

        # Mock file watcher
        mock_watcher = MagicMock()
        app.file_watcher = mock_watcher

        # Call stop
        app.stop_file_watcher()

        # Verify stop was called
        mock_watcher.stop_watching.assert_called_once()
        assert app.file_watcher is None

    @patch('yoyo_tui.app.ConfigManager')
    def test_on_file_change_method_exists(self, mock_config):
        """Test that on_file_change method exists and is callable."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        mock_config.load.return_value = TUIConfig()
        app = YoyoDevApp()

        # Verify method exists and is callable
        assert hasattr(app, 'on_file_change')
        assert callable(app.on_file_change)

        # Calling without screen context should not raise error (silently catches)
        app.on_file_change()

    @patch('yoyo_tui.app.ConfigManager')
    def test_action_refresh_method_exists(self, mock_config):
        """Test that action_refresh method exists and is callable."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.config import TUIConfig

        mock_config.load.return_value = TUIConfig()
        app = YoyoDevApp()

        # Verify method exists and is callable
        assert hasattr(app, 'action_refresh')
        assert callable(app.action_refresh)

        # Calling without screen context should not raise error (catches exception)
        app.action_refresh()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
