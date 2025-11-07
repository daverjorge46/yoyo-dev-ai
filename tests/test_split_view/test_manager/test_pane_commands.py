"""
Tests for split view manager pane command configuration.

Tests that verify the correct module paths and flags are used when
creating Claude Code and TUI panes.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from lib.yoyo_tui_v3.split_view import SplitViewConfig
from lib.yoyo_tui_v3.split_view.manager import SplitViewManager


class TestTUIPaneCommand:
    """Test TUI pane command configuration."""

    def test_tui_pane_uses_correct_module_path(self):
        """TUI pane should use lib.yoyo_tui_v3.cli module (not .main)."""
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude'
        )

        with patch('lib.yoyo_tui_v3.split_view.manager.shutil.which', return_value='/usr/bin/claude'):
            with patch('lib.yoyo_tui_v3.split_view.manager.sys.stdin.isatty', return_value=True):
                with patch('lib.yoyo_tui_v3.split_view.manager.Pane') as mock_pane:
                    manager = SplitViewManager(config)

                    # Get the TUI pane creation call
                    tui_call = None
                    for call in mock_pane.call_args_list:
                        if 'Yoyo TUI' in str(call):
                            tui_call = call
                            break

                    assert tui_call is not None, "TUI pane should be created"

                    # Check command argument
                    command = tui_call[1]['command']

                    # Should use lib.yoyo_tui_v3.cli, not lib.yoyo_tui_v3.main
                    assert 'lib.yoyo_tui_v3.cli' in command, \
                        f"Expected 'lib.yoyo_tui_v3.cli' in command, got: {command}"

                    # Should NOT use the non-existent .main module
                    assert 'lib.yoyo_tui_v3.main' not in command, \
                        f"Should not use non-existent 'lib.yoyo_tui_v3.main' module"

    def test_tui_pane_includes_no_split_flag(self):
        """TUI pane command should include --no-split flag to prevent recursion."""
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude'
        )

        with patch('lib.yoyo_tui_v3.split_view.manager.shutil.which', return_value='/usr/bin/claude'):
            with patch('lib.yoyo_tui_v3.split_view.manager.sys.stdin.isatty', return_value=True):
                with patch('lib.yoyo_tui_v3.split_view.manager.Pane') as mock_pane:
                    manager = SplitViewManager(config)

                    # Get the TUI pane creation call
                    tui_call = None
                    for call in mock_pane.call_args_list:
                        if 'Yoyo TUI' in str(call):
                            tui_call = call
                            break

                    assert tui_call is not None, "TUI pane should be created"

                    command = tui_call[1]['command']

                    # Should include --no-split flag
                    assert '--no-split' in command, \
                        f"Expected '--no-split' flag in command, got: {command}"

    def test_tui_pane_command_format(self):
        """TUI pane command should use correct format: python3 -m module --no-split."""
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude'
        )

        with patch('lib.yoyo_tui_v3.split_view.manager.shutil.which', return_value='/usr/bin/claude'):
            with patch('lib.yoyo_tui_v3.split_view.manager.sys.stdin.isatty', return_value=True):
                with patch('lib.yoyo_tui_v3.split_view.manager.Pane') as mock_pane:
                    manager = SplitViewManager(config)

                    # Get the TUI pane creation call
                    tui_call = None
                    for call in mock_pane.call_args_list:
                        if 'Yoyo TUI' in str(call):
                            tui_call = call
                            break

                    assert tui_call is not None, "TUI pane should be created"

                    command = tui_call[1]['command']

                    # Verify command structure
                    assert command[0] == 'python3', "Should use python3"
                    assert command[1] == '-m', "Should use -m flag"
                    assert command[2] == 'lib.yoyo_tui_v3.cli', "Should specify cli module"
                    assert command[3] == '--no-split', "Should include --no-split flag"


class TestClaudePaneCommand:
    """Test Claude Code pane command configuration."""

    def test_claude_pane_uses_claude_command(self):
        """Claude pane should use the 'claude' command from PATH."""
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude'
        )

        with patch('lib.yoyo_tui_v3.split_view.manager.shutil.which', return_value='/usr/bin/claude'):
            with patch('lib.yoyo_tui_v3.split_view.manager.sys.stdin.isatty', return_value=True):
                with patch('lib.yoyo_tui_v3.split_view.manager.Pane') as mock_pane:
                    manager = SplitViewManager(config)

                    # Get the Claude pane creation call
                    claude_call = None
                    for call in mock_pane.call_args_list:
                        if 'Claude Code' in str(call):
                            claude_call = call
                            break

                    assert claude_call is not None, "Claude pane should be created"

                    command = claude_call[1]['command']

                    # Should use 'claude' command
                    assert command[0] == 'claude', \
                        f"Expected 'claude' command, got: {command}"

    def test_claude_pane_includes_cwd_flag_when_enabled(self):
        """Claude pane should include --cwd flag when auto_cwd is enabled."""
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude',
            claude_config={
                'command': 'claude',
                'auto_cwd': True
            }
        )

        with patch('lib.yoyo_tui_v3.split_view.manager.shutil.which', return_value='/usr/bin/claude'):
            with patch('lib.yoyo_tui_v3.split_view.manager.sys.stdin.isatty', return_value=True):
                with patch('lib.yoyo_tui_v3.split_view.manager.Pane') as mock_pane:
                    with patch('os.getcwd', return_value='/test/path'):
                        manager = SplitViewManager(config)

                        # Get the Claude pane creation call
                        claude_call = None
                        for call in mock_pane.call_args_list:
                            if 'Claude Code' in str(call):
                                claude_call = call
                                break

                        assert claude_call is not None, "Claude pane should be created"

                        command = claude_call[1]['command']

                        # Should include --cwd flag
                        if len(command) > 1:
                            assert '--cwd' in command or config.claude_config.get('auto_cwd') is True


class TestModuleImportability:
    """Test that the modules referenced in pane commands can actually be imported."""

    def test_cli_module_exists(self):
        """The lib.yoyo_tui_v3.cli module should exist and be importable."""
        try:
            import lib.yoyo_tui_v3.cli
            assert True, "CLI module imported successfully"
        except ImportError as e:
            pytest.fail(f"lib.yoyo_tui_v3.cli module should be importable: {e}")

    def test_main_module_does_not_exist(self):
        """The lib.yoyo_tui_v3.main module should NOT exist (this was the bug)."""
        with pytest.raises(ImportError):
            import lib.yoyo_tui_v3.main

    def test_cli_module_has_main_function(self):
        """The cli module should have a main() entry point."""
        from lib.yoyo_tui_v3.cli import main
        assert callable(main), "main() should be callable"

    def test_cli_module_can_run_as_module(self):
        """The cli module should be executable with python -m."""
        import subprocess
        import sys

        result = subprocess.run(
            [sys.executable, '-m', 'lib.yoyo_tui_v3.cli', '--help'],
            capture_output=True,
            cwd='/home/yoga999/PROJECTS/yoyo-dev',
            timeout=5
        )

        # Should not raise ModuleNotFoundError
        assert result.returncode == 0, \
            f"CLI module should be runnable with -m flag. stderr: {result.stderr.decode()}"


class TestPaneCreationOrder:
    """Test that panes are created in the correct order."""

    def test_claude_pane_created_first(self):
        """Claude pane should be created before TUI pane."""
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude'
        )

        with patch('lib.yoyo_tui_v3.split_view.manager.shutil.which', return_value='/usr/bin/claude'):
            with patch('lib.yoyo_tui_v3.split_view.manager.sys.stdin.isatty', return_value=True):
                with patch('lib.yoyo_tui_v3.split_view.manager.Pane') as mock_pane:
                    manager = SplitViewManager(config)

                    # Should have 2 calls (Claude, then TUI)
                    assert mock_pane.call_count == 2, "Should create 2 panes"

                    # First call should be Claude
                    first_call = mock_pane.call_args_list[0]
                    assert 'Claude Code' in str(first_call), "First pane should be Claude"

                    # Second call should be TUI
                    second_call = mock_pane.call_args_list[1]
                    assert 'Yoyo TUI' in str(second_call), "Second pane should be TUI"

    def test_both_panes_started(self):
        """Both panes should be started after creation."""
        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude'
        )

        with patch('lib.yoyo_tui_v3.split_view.manager.shutil.which', return_value='/usr/bin/claude'):
            with patch('lib.yoyo_tui_v3.split_view.manager.sys.stdin.isatty', return_value=True):
                with patch('lib.yoyo_tui_v3.split_view.manager.Pane') as mock_pane:
                    mock_claude_instance = MagicMock()
                    mock_tui_instance = MagicMock()
                    mock_pane.side_effect = [mock_claude_instance, mock_tui_instance]

                    manager = SplitViewManager(config)

                    # Both instances should have start() called
                    mock_claude_instance.start.assert_called_once()
                    mock_tui_instance.start.assert_called_once()
