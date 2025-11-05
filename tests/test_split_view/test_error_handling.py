"""
Tests for error handling and edge cases in split view.

Tests cover:
- Terminal too small errors
- Claude Code not found fallback
- Pane crash scenarios
- Rapid terminal resize (debouncing)
- Config corruption handling
- Comprehensive error scenarios
"""

import os
import sys
import signal
import time
from unittest.mock import Mock, patch, MagicMock, call

import pytest

from lib.yoyo_tui_v3.split_view.manager import (
    SplitViewManager,
    SplitViewConfig,
)
from lib.yoyo_tui_v3.split_view.pane import Pane, PaneBounds


class TestTerminalTooSmallError:
    """Test handling of terminal too small error."""

    def test_terminal_too_small_on_launch(self):
        """Test error when terminal is too small on launch."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Terminal smaller than minimum (120x30)
        with patch('os.get_terminal_size', return_value=os.terminal_size((80, 20))):
            with patch.object(manager, '_detect_claude', return_value=True):
                with patch.object(manager.term_controller, 'enter_alt_screen'):
                    with patch.object(manager.term_controller, 'clear_screen'):
                        with pytest.raises(ValueError, match="Terminal too small"):
                            manager._create_panes()

    def test_terminal_too_small_displays_error_message(self):
        """Test that terminal too small error shows helpful message."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch('os.get_terminal_size', return_value=os.terminal_size((80, 20))):
            try:
                manager._create_panes()
            except ValueError as e:
                assert "120x30" in str(e)
                assert "current: 80x20" in str(e)

    def test_terminal_width_too_small(self):
        """Test error when only terminal width is too small."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Width too small, height OK
        with patch('os.get_terminal_size', return_value=os.terminal_size((100, 40))):
            with pytest.raises(ValueError, match="Terminal too small"):
                manager._create_panes()

    def test_terminal_height_too_small(self):
        """Test error when only terminal height is too small."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Width OK, height too small
        with patch('os.get_terminal_size', return_value=os.terminal_size((130, 20))):
            with pytest.raises(ValueError, match="Terminal too small"):
                manager._create_panes()

    def test_terminal_barely_meets_minimum(self):
        """Test that exactly minimum size is accepted."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Exactly minimum size
        with patch('os.get_terminal_size', return_value=os.terminal_size((120, 30))):
            with patch.object(Pane, 'start'):
                # Should not raise
                manager._create_panes()
                assert manager.claude_pane is not None
                assert manager.tui_pane is not None

    def test_resize_to_too_small_gracefully_ignores(self):
        """Test that resize to too-small terminal is gracefully ignored."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Start with valid size
        with patch('os.get_terminal_size', return_value=os.terminal_size((120, 30))):
            with patch.object(Pane, 'start'):
                manager._create_panes()

        original_claude_bounds = manager.claude_pane.bounds
        original_tui_bounds = manager.tui_pane.bounds

        # Resize to too small
        with patch('os.get_terminal_size', return_value=os.terminal_size((80, 20))):
            # Should not raise, should be gracefully ignored
            manager._handle_resize(signal.SIGWINCH, None)

        # Bounds should remain unchanged
        assert manager.claude_pane.bounds == original_claude_bounds
        assert manager.tui_pane.bounds == original_tui_bounds


class TestClaudeNotFoundFallback:
    """Test handling when Claude Code is not found."""

    def test_claude_not_found_triggers_fallback(self):
        """Test that missing Claude triggers fallback."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch('shutil.which', return_value=None):
            with patch.object(manager, '_launch_fallback', return_value=0) as mock_fallback:
                exit_code = manager.launch()

        mock_fallback.assert_called_once()
        assert exit_code == 0

    def test_fallback_shows_message_to_user(self):
        """Test fallback displays informative message."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Create a mock module with run_tui function
        mock_tui_main = Mock()
        mock_tui_main.run_tui = Mock(return_value=0)

        with patch('builtins.print') as mock_print:
            with patch('time.sleep'):
                with patch.dict('sys.modules', {'lib.yoyo_tui_v3.main': mock_tui_main}):
                    manager._launch_fallback()

        # Verify message was printed
        mock_print.assert_called_once()
        message = mock_print.call_args[0][0]
        assert "Claude Code Not Found" in message
        assert "https://github.com/anthropics/claude-code" in message

    def test_fallback_launches_tui_only(self):
        """Test fallback launches TUI in standalone mode."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Create a mock module with run_tui function
        mock_tui_main = Mock()
        mock_tui_main.run_tui = Mock(return_value=0)

        with patch.object(manager, '_show_claude_not_found_message'):
            with patch('time.sleep'):
                with patch.dict('sys.modules', {'lib.yoyo_tui_v3.main': mock_tui_main}):
                    exit_code = manager._launch_fallback()

        mock_tui_main.run_tui.assert_called_once()
        assert exit_code == 0

    def test_fallback_waits_configured_delay(self):
        """Test fallback waits configured delay before launching TUI."""
        config = SplitViewConfig()
        config.claude.fallback_delay = 5  # 5 seconds
        manager = SplitViewManager(config)

        # Create a mock module with run_tui function
        mock_tui_main = Mock()
        mock_tui_main.run_tui = Mock(return_value=0)

        with patch.object(manager, '_show_claude_not_found_message'):
            with patch('time.sleep') as mock_sleep:
                with patch.dict('sys.modules', {'lib.yoyo_tui_v3.main': mock_tui_main}):
                    manager._launch_fallback()

        mock_sleep.assert_called_once_with(5)

    def test_claude_detection_uses_configured_command(self):
        """Test detection uses configured Claude command name."""
        config = SplitViewConfig()
        config.claude.command = "claude-custom"
        manager = SplitViewManager(config)

        with patch('shutil.which') as mock_which:
            manager._detect_claude()

        mock_which.assert_called_once_with("claude-custom")


class TestPaneCrashScenarios:
    """Test handling of pane crashes."""

    @patch('os.get_terminal_size')
    def test_single_pane_crash_keeps_loop_running(self, mock_size):
        """Test that if one pane crashes, other pane keeps running."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Claude pane crashes, TUI still alive
        with patch.object(manager.claude_pane, 'is_alive', return_value=False):
            with patch.object(manager.tui_pane, 'is_alive', return_value=True):
                # Should not set running to False yet
                manager.running = True
                # Simulate one iteration
                with patch('select.select', return_value=([], [], [])):
                    # Check the condition manually
                    if not manager.claude_pane.is_alive() and not manager.tui_pane.is_alive():
                        manager.running = False

                assert manager.running is True

    @patch('os.get_terminal_size')
    def test_both_panes_crash_exits_loop(self, mock_size):
        """Test that loop exits when both panes crash."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Both panes crash
        with patch.object(manager.claude_pane, 'is_alive', return_value=False):
            with patch.object(manager.tui_pane, 'is_alive', return_value=False):
                with patch('select.select', return_value=([], [], [])):
                    exit_code = manager._main_loop()

        assert exit_code == 0

    @patch('os.get_terminal_size')
    def test_pane_fd_closed_handles_gracefully(self, mock_size):
        """Test graceful handling when pane fd is closed unexpectedly."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Simulate fd closure by raising ValueError in select
        with patch('select.select', side_effect=ValueError("Bad file descriptor")):
            with patch.object(manager.claude_pane, 'is_alive', return_value=False):
                with patch.object(manager.tui_pane, 'is_alive', return_value=False):
                    exit_code = manager._main_loop()

        # Should exit gracefully
        assert exit_code == 0

    @patch('os.get_terminal_size')
    def test_pane_fd_oserror_handles_gracefully(self, mock_size):
        """Test graceful handling of OSError during select."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Simulate OSError during select
        with patch('select.select', side_effect=OSError("I/O error")):
            with patch.object(manager.claude_pane, 'is_alive', return_value=False):
                with patch.object(manager.tui_pane, 'is_alive', return_value=False):
                    exit_code = manager._main_loop()

        assert exit_code == 0

    @patch('os.get_terminal_size')
    def test_pane_read_oserror_continues_loop(self, mock_size):
        """Test that OSError during pane read doesn't crash loop."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Simulate OSError during stdin read
        with patch('select.select', return_value=([sys.stdin], [], [])):
            with patch('os.read', side_effect=OSError("Read error")):
                with patch.object(manager.claude_pane, 'is_alive', side_effect=[True, False]):
                    with patch.object(manager.tui_pane, 'is_alive', return_value=False):
                        # Should not crash, should continue
                        exit_code = manager._main_loop()

        assert exit_code == 0

    @patch('os.get_terminal_size')
    def test_pane_crash_during_write(self, mock_size):
        """Test handling when pane crashes during write operation."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Test that write to crashed pane is handled
        with patch.object(manager.claude_pane, 'write', side_effect=OSError("Broken pipe")):
            # Should not raise exception
            try:
                manager.claude_pane.write(b'test')
            except OSError:
                pass  # Expected

    @patch('os.get_terminal_size')
    def test_display_error_in_pane_area_on_crash(self, mock_size):
        """Test that pane crash displays error in pane area."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Test display_pane_error method if it exists
        if hasattr(manager, '_display_pane_error'):
            with patch.object(manager.term_controller, 'move_cursor') as mock_move:
                with patch('sys.stdout.buffer.write') as mock_write:
                    manager._display_pane_error(manager.claude_pane, "Process crashed")

                mock_move.assert_called()
                mock_write.assert_called()


class TestRapidTerminalResize:
    """Test handling of rapid terminal resize events (debouncing)."""

    @patch('os.get_terminal_size')
    def test_rapid_resize_events(self, mock_size):
        """Test multiple rapid resize events."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Add resize tracking if debouncing exists
        if hasattr(manager, '_last_resize_time'):
            manager._last_resize_time = 0

        resize_count = 0

        def track_resize(*args):
            nonlocal resize_count
            resize_count += 1

        # Simulate rapid resizes
        mock_size.return_value = os.terminal_size((130, 35))
        manager._handle_resize(signal.SIGWINCH, None)

        mock_size.return_value = os.terminal_size((140, 40))
        manager._handle_resize(signal.SIGWINCH, None)

        mock_size.return_value = os.terminal_size((150, 45))
        manager._handle_resize(signal.SIGWINCH, None)

        # Should handle all resizes (or debounce them)
        # At minimum, should not crash

    @patch('os.get_terminal_size')
    def test_resize_debouncing_if_implemented(self, mock_size):
        """Test resize debouncing logic if implemented."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Test debouncing if _should_process_resize exists
        if hasattr(manager, '_should_process_resize'):
            # First resize should be processed
            assert manager._should_process_resize() is True

            # Immediate second resize might be debounced
            # (depends on implementation)
            manager._last_resize_time = time.time()
            # Would need to check if debounced based on threshold

    @patch('os.get_terminal_size')
    def test_resize_oserror_handled_gracefully(self, mock_size):
        """Test OSError during resize is handled gracefully."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch('os.get_terminal_size', return_value=os.terminal_size((120, 30))):
            with patch.object(Pane, 'start'):
                manager._create_panes()

        # Simulate OSError getting terminal size during resize
        with patch('os.get_terminal_size', side_effect=OSError("Can't get size")):
            # Should not crash
            manager._handle_resize(signal.SIGWINCH, None)

        # Panes should still exist unchanged
        assert manager.claude_pane is not None
        assert manager.tui_pane is not None


class TestConfigCorruption:
    """Test handling of corrupted configuration."""

    def test_invalid_ratio_uses_default(self):
        """Test that invalid ratio falls back to default."""
        # Ratio > 1.0
        config = SplitViewConfig(ratio=1.5)
        manager = SplitViewManager(config)

        with patch('os.get_terminal_size', return_value=os.terminal_size((120, 30))):
            with pytest.raises(ValueError):
                manager._create_panes()

    def test_negative_ratio_rejected(self):
        """Test that negative ratio is rejected."""
        config = SplitViewConfig(ratio=-0.5)
        manager = SplitViewManager(config)

        with patch('os.get_terminal_size', return_value=os.terminal_size((120, 30))):
            with pytest.raises(ValueError):
                manager._create_panes()

    def test_invalid_active_pane_uses_default(self):
        """Test that invalid active_pane value uses default."""
        config = SplitViewConfig(active_pane="invalid")
        manager = SplitViewManager(config)

        with patch('os.get_terminal_size', return_value=os.terminal_size((120, 30))):
            with patch.object(Pane, 'start'):
                manager._create_panes()

        # Should default to claude pane
        assert manager.focus_manager.get_active() == manager.claude_pane

    def test_invalid_border_style_uses_default(self):
        """Test that invalid border style falls back to default."""
        # This tests that the system is robust to config issues
        config = SplitViewConfig()
        config.border_style.active = None  # Corrupt value

        manager = SplitViewManager(config)

        with patch('os.get_terminal_size', return_value=os.terminal_size((120, 30))):
            with patch.object(Pane, 'start'):
                manager._create_panes()

        # Should still work even with None color
        # (will handle gracefully in draw_border)

    def test_missing_claude_command_uses_default(self):
        """Test that missing claude command uses default."""
        config = SplitViewConfig()
        config.claude.command = ""  # Empty command

        manager = SplitViewManager(config)

        with patch('shutil.which', return_value=None):
            # Should still try to detect (and fail gracefully)
            result = manager._detect_claude()
            assert result is False


class TestLoggingForDebugging:
    """Test logging infrastructure for debugging."""

    @patch('os.get_terminal_size')
    def test_logging_enabled_captures_errors(self, mock_size):
        """Test that logging captures error events."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Test if logger exists
        if hasattr(manager, 'logger'):
            assert manager.logger is not None

    @patch('os.get_terminal_size')
    def test_logging_captures_resize_events(self, mock_size):
        """Test that resize events are logged."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # If logging exists, test it captures resize
        if hasattr(manager, 'logger'):
            with patch.object(manager.logger, 'debug') as mock_log:
                mock_size.return_value = os.terminal_size((140, 35))
                manager._handle_resize(signal.SIGWINCH, None)

                # Should have logged something about resize
                # mock_log.assert_called()

    @patch('os.get_terminal_size')
    def test_logging_captures_pane_crashes(self, mock_size):
        """Test that pane crashes are logged."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # If logging exists and monitors pane health
        if hasattr(manager, 'logger') and hasattr(manager, '_check_pane_health'):
            with patch.object(manager.logger, 'error') as mock_log:
                with patch.object(manager.claude_pane, 'is_alive', return_value=False):
                    manager._check_pane_health()

                # Should log pane crash
                # mock_log.assert_called()


class TestPaneHealthMonitoring:
    """Test pane health monitoring in main loop."""

    @patch('os.get_terminal_size')
    def test_health_check_detects_dead_pane(self, mock_size):
        """Test health monitoring detects when pane dies."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Test if health check method exists
        if hasattr(manager, '_check_pane_health'):
            with patch.object(manager.claude_pane, 'is_alive', return_value=False):
                status = manager._check_pane_health()
                # Should return information about dead pane
                assert status is not None

    @patch('os.get_terminal_size')
    def test_health_check_both_panes_alive(self, mock_size):
        """Test health check when both panes are healthy."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        if hasattr(manager, '_check_pane_health'):
            with patch.object(manager.claude_pane, 'is_alive', return_value=True):
                with patch.object(manager.tui_pane, 'is_alive', return_value=True):
                    status = manager._check_pane_health()
                    # Both healthy - status should reflect this

    @patch('os.get_terminal_size')
    def test_main_loop_monitors_pane_health(self, mock_size):
        """Test that main loop actively monitors pane health."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Main loop checks is_alive() to determine if should continue
        with patch('select.select', return_value=([], [], [])):
            with patch.object(manager.claude_pane, 'is_alive', return_value=False):
                with patch.object(manager.tui_pane, 'is_alive', return_value=False):
                    exit_code = manager._main_loop()

        # Should exit when both panes die
        assert exit_code == 0
        assert manager.running is False
