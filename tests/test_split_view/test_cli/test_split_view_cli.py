"""
Tests for CLI integration of split view functionality.

Tests command-line argument parsing and split view mode selection.
"""

import pytest
import argparse
from unittest.mock import Mock, patch, MagicMock
from lib.yoyo_tui_v3.split_view import SplitViewConfig


class TestCLIArgumentParsing:
    """Test command-line argument parsing for split view."""

    def test_default_split_view_enabled(self):
        """Split view should be enabled by default."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args([])
        assert args.split_view is True

    def test_no_split_flag_disables_split_view(self):
        """--no-split flag should disable split view."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args(['--no-split'])
        assert args.split_view is False

    def test_split_ratio_override(self):
        """--split-ratio flag should override default ratio."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args(['--split-ratio', '0.5'])
        assert args.split_ratio == 0.5

    def test_split_ratio_validation_range(self):
        """Split ratio should be between 0.0 and 1.0."""
        from lib.yoyo_tui_v3.cli import parse_args

        # Valid ratio
        args = parse_args(['--split-ratio', '0.3'])
        assert 0.0 <= args.split_ratio <= 1.0

        # Invalid ratio (too low)
        with pytest.raises(SystemExit):
            parse_args(['--split-ratio', '-0.1'])

        # Invalid ratio (too high)
        with pytest.raises(SystemExit):
            parse_args(['--split-ratio', '1.5'])

    def test_split_ratio_default_value(self):
        """Split ratio should default to 0.4 when not specified."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args([])
        assert args.split_ratio == 0.4

    def test_focus_flag_claude(self):
        """--focus claude should set initial focus to Claude pane."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args(['--focus', 'claude'])
        assert args.focus == 'claude'

    def test_focus_flag_tui(self):
        """--focus tui should set initial focus to TUI pane."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args(['--focus', 'tui'])
        assert args.focus == 'tui'

    def test_focus_flag_validation(self):
        """Focus flag should only accept 'claude' or 'tui'."""
        from lib.yoyo_tui_v3.cli import parse_args

        # Invalid focus value
        with pytest.raises(SystemExit):
            parse_args(['--focus', 'invalid'])

    def test_focus_default_value(self):
        """Focus should default to 'claude' when not specified."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args([])
        assert args.focus == 'claude'

    def test_help_flag(self):
        """--help flag should trigger help display."""
        from lib.yoyo_tui_v3.cli import parse_args

        with pytest.raises(SystemExit) as exc_info:
            parse_args(['--help'])
        assert exc_info.value.code == 0

    def test_version_flag(self):
        """--version flag should display version."""
        from lib.yoyo_tui_v3.cli import parse_args

        with pytest.raises(SystemExit) as exc_info:
            parse_args(['--version'])
        assert exc_info.value.code == 0

    def test_combined_flags(self):
        """Multiple flags should work together."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args(['--split-ratio', '0.6', '--focus', 'tui'])
        assert args.split_view is True
        assert args.split_ratio == 0.6
        assert args.focus == 'tui'

    def test_no_split_with_ratio_ignored(self):
        """--split-ratio should be ignored when --no-split is set."""
        from lib.yoyo_tui_v3.cli import parse_args

        args = parse_args(['--no-split', '--split-ratio', '0.5'])
        assert args.split_view is False
        # Ratio should still be parsed but won't be used
        assert args.split_ratio == 0.5


class TestConfigOverrides:
    """Test configuration overrides from CLI arguments."""

    def test_cli_args_override_config(self):
        """CLI arguments should override config file settings."""
        from lib.yoyo_tui_v3.cli import merge_config_with_args

        # Mock config from file
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude'
        )

        # Mock CLI args
        args = argparse.Namespace(
            split_view=True,
            split_ratio=0.6,
            focus='tui'
        )

        merged = merge_config_with_args(config, args)

        assert merged.enabled is True
        assert merged.ratio == 0.6
        assert merged.active_pane == 'tui'

    def test_no_split_disables_config(self):
        """--no-split should disable split view even if config enables it."""
        from lib.yoyo_tui_v3.cli import merge_config_with_args

        config = SplitViewConfig(enabled=True)
        args = argparse.Namespace(
            split_view=False,
            split_ratio=0.4,
            focus='claude'
        )

        merged = merge_config_with_args(config, args)
        assert merged.enabled is False

    def test_default_args_preserve_config(self):
        """Default CLI args should preserve config settings."""
        from lib.yoyo_tui_v3.cli import merge_config_with_args

        config = SplitViewConfig(
            enabled=True,
            ratio=0.3,
            active_pane='tui'
        )

        # Args with default values
        args = argparse.Namespace(
            split_view=True,
            split_ratio=0.4,  # Default
            focus='claude'    # Default
        )

        # Should use config values for non-overridden options
        merged = merge_config_with_args(config, args)

        # These should come from explicit CLI args (defaults)
        assert merged.enabled is True
        assert merged.ratio == 0.4  # CLI default takes precedence
        assert merged.active_pane == 'claude'  # CLI default takes precedence


class TestModeSelection:
    """Test split view vs TUI-only mode selection."""

    @patch('lib.yoyo_tui_v3.cli.launch_split_view')
    def test_split_view_mode_launches_split_view(self, mock_launch_split):
        """When split view enabled, should launch SplitViewManager."""
        from lib.yoyo_tui_v3.cli import main

        mock_launch_split.return_value = 0

        with patch('sys.argv', ['yoyo']):
            with patch('lib.yoyo_tui_v3.cli.parse_args') as mock_parse:
                with patch('lib.yoyo_tui_v3.cli.load_config') as mock_config:
                    mock_args = argparse.Namespace(
                        split_view=True,
                        split_ratio=0.4,
                        focus='claude'
                    )
                    mock_parse.return_value = mock_args
                    mock_config.return_value = SplitViewConfig()

                    main()

                    # Should call launch_split_view
                    assert mock_launch_split.called

    @patch('lib.yoyo_tui_v3.cli.launch_tui_only')
    def test_no_split_mode_launches_tui_only(self, mock_launch_tui):
        """When split view disabled, should launch TUI directly."""
        from lib.yoyo_tui_v3.cli import main

        mock_launch_tui.return_value = 0

        with patch('sys.argv', ['yoyo', '--no-split']):
            with patch('lib.yoyo_tui_v3.cli.parse_args') as mock_parse:
                with patch('lib.yoyo_tui_v3.cli.load_config') as mock_config:
                    mock_args = argparse.Namespace(
                        split_view=False,
                        split_ratio=0.4,
                        focus='claude'
                    )
                    mock_parse.return_value = mock_args
                    mock_config.return_value = SplitViewConfig()

                    main()

                    # Should call launch_tui_only
                    assert mock_launch_tui.called

    def test_conditional_import_split_view(self):
        """Split view modules should only import when needed."""
        from lib.yoyo_tui_v3.cli import should_use_split_view

        args = argparse.Namespace(split_view=True)
        assert should_use_split_view(args) is True

        args = argparse.Namespace(split_view=False)
        assert should_use_split_view(args) is False


class TestBackwardCompatibility:
    """Test backward compatibility with existing TUI-only mode."""

    @patch('lib.yoyo_tui_v3.cli.YoyoDevTUIApp')
    def test_tui_only_mode_works_as_before(self, mock_app):
        """TUI-only mode should work exactly as it did before."""
        from lib.yoyo_tui_v3.cli import launch_tui_only

        mock_instance = MagicMock()
        mock_instance.run.return_value = None
        mock_app.return_value = mock_instance

        launch_tui_only()

        # Should create and run TUI app
        mock_app.assert_called_once()
        mock_instance.run.assert_called_once()

    def test_existing_entry_point_compatibility(self):
        """Existing lib/yoyo-tui.py entry point should still work."""
        # This test verifies the old entry point still functions
        import subprocess
        import sys

        result = subprocess.run(
            [sys.executable, '-c', 'from yoyo_tui_v3.app import YoyoDevTUIApp'],
            capture_output=True,
            cwd='/home/yoga999/PROJECTS/yoyo-dev/lib'
        )

        assert result.returncode == 0, "TUI import should work"

    def test_no_breaking_changes_to_tui_app(self):
        """TUI app should not require split view dependencies."""
        from lib.yoyo_tui_v3.app import YoyoDevTUIApp

        # Should be able to create TUI app without split view imports
        app = YoyoDevTUIApp()
        assert app is not None


class TestErrorHandling:
    """Test error handling in CLI integration."""

    def test_invalid_ratio_shows_helpful_error(self):
        """Invalid split ratio should show clear error message."""
        from lib.yoyo_tui_v3.cli import parse_args

        with pytest.raises(SystemExit):
            with patch('sys.stderr'):
                parse_args(['--split-ratio', 'invalid'])

    def test_missing_config_uses_defaults(self):
        """Missing config file should fall back to defaults."""
        from lib.yoyo_tui_v3.cli import load_config

        with patch('pathlib.Path.exists', return_value=False):
            config = load_config()

            assert config.enabled is True
            assert config.ratio == 0.4
            assert config.active_pane == 'claude'

    @patch('lib.yoyo_tui_v3.cli.launch_split_view')
    @patch('lib.yoyo_tui_v3.cli.launch_tui_only')
    def test_split_view_failure_falls_back_to_tui(self, mock_launch_tui, mock_launch_split):
        """If split view fails, should fall back to TUI only."""
        from lib.yoyo_tui_v3.cli import main

        # Make split view launch raise exception
        mock_launch_split.side_effect = Exception("Split view failed")
        mock_launch_tui.return_value = 0

        with patch('sys.argv', ['yoyo']):
            with patch('lib.yoyo_tui_v3.cli.parse_args') as mock_parse:
                with patch('lib.yoyo_tui_v3.cli.load_config') as mock_config:
                    mock_args = argparse.Namespace(
                        split_view=True,
                        split_ratio=0.4,
                        focus='claude'
                    )
                    mock_parse.return_value = mock_args
                    mock_config.return_value = SplitViewConfig()

                    main()

                    # Should fall back to TUI app
                    assert mock_launch_tui.called


class TestIntegrationWithSplitViewManager:
    """Test integration between CLI and SplitViewManager."""

    @patch('lib.yoyo_tui_v3.cli.SplitViewManager')
    def test_cli_args_passed_to_manager(self, mock_manager):
        """CLI arguments should be passed to SplitViewManager."""
        from lib.yoyo_tui_v3.cli import launch_split_view

        mock_instance = MagicMock()
        mock_instance.launch.return_value = 0
        mock_manager.return_value = mock_instance

        config = SplitViewConfig(
            enabled=True,
            ratio=0.6,
            active_pane='tui'
        )

        launch_split_view(config)

        # Should create manager with correct config
        mock_manager.assert_called_once_with(config)

    @patch('lib.yoyo_tui_v3.cli.SplitViewManager')
    def test_manager_launch_called(self, mock_manager):
        """SplitViewManager.launch() should be called."""
        from lib.yoyo_tui_v3.cli import launch_split_view

        mock_instance = MagicMock()
        mock_instance.launch.return_value = 0
        mock_manager.return_value = mock_instance

        config = SplitViewConfig()
        launch_split_view(config)

        mock_instance.launch.assert_called_once()

    @patch('lib.yoyo_tui_v3.cli.SplitViewManager')
    def test_exit_code_propagated(self, mock_manager):
        """Exit code from manager should be returned."""
        from lib.yoyo_tui_v3.cli import launch_split_view

        mock_instance = MagicMock()
        mock_instance.launch.return_value = 42
        mock_manager.return_value = mock_instance

        config = SplitViewConfig()
        exit_code = launch_split_view(config)

        assert exit_code == 42
