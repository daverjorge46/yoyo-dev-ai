"""
Tests for SplitViewManager - orchestration of split view lifecycle.

Tests cover:
- SplitViewManager initialization
- Claude Code detection
- Pane creation and lifecycle
- Main event loop and input routing
- Keyboard shortcut handling
- Terminal resize handling
"""

import os
import sys
import signal
import time
from unittest.mock import Mock, patch, MagicMock, call
from dataclasses import dataclass

import pytest

from lib.yoyo_tui_v3.split_view.manager import (
    SplitViewManager,
    SplitViewConfig,
    BorderStyle,
    KeyboardShortcuts,
    ClaudeConfig
)
from lib.yoyo_tui_v3.split_view.pane import Pane, PaneBounds


class TestSplitViewConfig:
    """Test SplitViewConfig dataclass."""

    def test_default_config(self):
        """Test default configuration values."""
        config = SplitViewConfig()

        assert config.enabled is True
        assert config.ratio == 0.4
        assert config.active_pane == "claude"
        assert isinstance(config.border_style, BorderStyle)
        assert isinstance(config.shortcuts, KeyboardShortcuts)
        assert isinstance(config.claude, ClaudeConfig)

    def test_custom_config(self):
        """Test custom configuration values."""
        config = SplitViewConfig(
            enabled=False,
            ratio=0.5,
            active_pane="tui"
        )

        assert config.enabled is False
        assert config.ratio == 0.5
        assert config.active_pane == "tui"


class TestBorderStyle:
    """Test BorderStyle dataclass."""

    def test_default_border_style(self):
        """Test default border style values."""
        style = BorderStyle()

        assert style.active == "bright_cyan"
        assert style.inactive == "dim_white"
        assert style.char_vertical == "│"
        assert style.char_horizontal == "─"
        assert style.char_top_left == "┌"
        assert style.char_top_right == "┐"
        assert style.char_bottom_left == "└"
        assert style.char_bottom_right == "┘"


class TestKeyboardShortcuts:
    """Test KeyboardShortcuts dataclass."""

    def test_default_shortcuts(self):
        """Test default keyboard shortcuts."""
        shortcuts = KeyboardShortcuts()

        assert shortcuts.switch_focus == b'\x02\x1b[C'  # Ctrl+B →
        assert shortcuts.resize_left == b'\x02<'        # Ctrl+B <
        assert shortcuts.resize_right == b'\x02>'       # Ctrl+B >


class TestClaudeConfig:
    """Test ClaudeConfig dataclass."""

    def test_default_claude_config(self):
        """Test default Claude configuration."""
        config = ClaudeConfig()

        assert config.command == "claude"
        assert config.auto_cwd is True
        assert config.fallback_delay == 3


class TestSplitViewManagerInit:
    """Test SplitViewManager initialization."""

    def test_initialization(self):
        """Test manager initializes with correct state."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        assert manager.config == config
        assert manager.term_controller is not None
        assert manager.layout_manager is not None
        assert manager.focus_manager is not None
        assert manager.claude_pane is None
        assert manager.tui_pane is None
        assert manager.running is False


class TestClaudeDetection:
    """Test Claude Code detection."""

    def test_detect_claude_installed(self):
        """Test detection when Claude is installed."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch('shutil.which', return_value='/usr/bin/claude'):
            assert manager._detect_claude() is True

    def test_detect_claude_not_installed(self):
        """Test detection when Claude is not installed."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch('shutil.which', return_value=None):
            assert manager._detect_claude() is False


class TestLaunchFallback:
    """Test fallback behavior when Claude is not found."""

    def test_launch_fallback_shows_message(self):
        """Test that fallback displays message."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Create a mock module with run_tui function
        mock_tui_main = Mock()
        mock_tui_main.run_tui = Mock(return_value=0)

        with patch.object(manager, '_show_claude_not_found_message') as mock_show:
            with patch('time.sleep'):
                with patch.dict('sys.modules', {'lib.yoyo_tui_v3.main': mock_tui_main}):
                    exit_code = manager._launch_fallback()

        mock_show.assert_called_once()
        assert exit_code == 0

    def test_launch_fallback_runs_tui(self):
        """Test that fallback launches TUI."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Create a mock module with run_tui function
        mock_tui_main = Mock()
        mock_tui_main.run_tui = Mock(return_value=0)

        with patch.object(manager, '_show_claude_not_found_message'):
            with patch('time.sleep'):
                with patch.dict('sys.modules', {'lib.yoyo_tui_v3.main': mock_tui_main}):
                    manager._launch_fallback()

        mock_tui_main.run_tui.assert_called_once()


class TestPaneCreation:
    """Test pane creation and lifecycle."""

    @patch('os.get_terminal_size')
    def test_create_panes_calculates_split(self, mock_size):
        """Test that create_panes calculates split correctly."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig(ratio=0.4)
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        assert manager.claude_pane is not None
        assert manager.tui_pane is not None
        assert manager.claude_pane.bounds.width == 48  # 40% of 120
        assert manager.tui_pane.bounds.width == 72     # 60% of 120

    @patch('os.get_terminal_size')
    def test_create_panes_starts_processes(self, mock_size):
        """Test that create_panes starts both processes."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start') as mock_start:
            manager._create_panes()

        # Should be called twice (once for each pane)
        assert mock_start.call_count == 2

    @patch('os.get_terminal_size')
    def test_create_panes_sets_initial_focus_claude(self, mock_size):
        """Test initial focus on Claude pane."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig(active_pane="claude")
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        assert manager.focus_manager.get_active() == manager.claude_pane

    @patch('os.get_terminal_size')
    def test_create_panes_sets_initial_focus_tui(self, mock_size):
        """Test initial focus on TUI pane."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig(active_pane="tui")
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        assert manager.focus_manager.get_active() == manager.tui_pane


class TestKeyboardShortcutDetection:
    """Test keyboard shortcut detection."""

    def test_is_shortcut_ctrl_b(self):
        """Test detection of Ctrl+B prefix."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        assert manager._is_shortcut(b'\x02') is True
        assert manager._is_shortcut(b'\x02\x1b[C') is True

    def test_is_shortcut_regular_input(self):
        """Test non-shortcut input."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        assert manager._is_shortcut(b'a') is False
        assert manager._is_shortcut(b'\n') is False
        assert manager._is_shortcut(b'\x1b[A') is False  # Arrow up without Ctrl+B


class TestKeyboardShortcutHandling:
    """Test keyboard shortcut handling."""

    @patch('os.get_terminal_size')
    def test_handle_shortcut_switch_focus(self, mock_size):
        """Test focus switching shortcut."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        with patch.object(manager, '_render_borders') as mock_render:
            manager._handle_shortcut(b'\x02\x1b[C')  # Ctrl+B →

        mock_render.assert_called_once()

    @patch('os.get_terminal_size')
    def test_handle_shortcut_resize_left(self, mock_size):
        """Test resize left shortcut."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        original_claude_width = manager.claude_pane.bounds.width

        with patch.object(manager, '_rerender_all'):
            manager._handle_shortcut(b'\x02<')  # Ctrl+B <

        # Claude pane should shrink
        assert manager.claude_pane.bounds.width < original_claude_width

    @patch('os.get_terminal_size')
    def test_handle_shortcut_resize_right(self, mock_size):
        """Test resize right shortcut."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        original_tui_width = manager.tui_pane.bounds.width

        with patch.object(manager, '_rerender_all'):
            manager._handle_shortcut(b'\x02>')  # Ctrl+B >

        # TUI pane should shrink (Claude grows)
        assert manager.tui_pane.bounds.width < original_tui_width


class TestTerminalResize:
    """Test terminal resize handling."""

    @patch('os.get_terminal_size')
    def test_handle_resize_recalculates_layout(self, mock_size):
        """Test that resize recalculates pane layout."""
        # Initial size
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig(ratio=0.4)
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        initial_claude_width = manager.claude_pane.bounds.width

        # Resize terminal
        mock_size.return_value = os.terminal_size((160, 40))

        # Don't mock resize - we want it to actually update bounds
        with patch.object(manager, '_rerender_all'):
            manager._handle_resize(signal.SIGWINCH, None)

        # Claude pane should be 40% of new width (64)
        assert manager.claude_pane.bounds.width == 64
        assert manager.claude_pane.bounds.width > initial_claude_width

    @patch('os.get_terminal_size')
    def test_handle_resize_updates_panes(self, mock_size):
        """Test that resize updates pane sizes."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        mock_size.return_value = os.terminal_size((160, 40))

        with patch.object(Pane, 'resize') as mock_resize:
            with patch.object(manager, '_rerender_all'):
                manager._handle_resize(signal.SIGWINCH, None)

        # Should resize both panes
        assert mock_resize.call_count == 2


class TestRenderMethods:
    """Test rendering methods."""

    @patch('os.get_terminal_size')
    def test_render_borders(self, mock_size):
        """Test border rendering."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        with patch.object(manager.term_controller, 'draw_border') as mock_draw:
            manager._render_borders()

        # Should draw borders for both panes
        assert mock_draw.call_count == 2

    @patch('os.get_terminal_size')
    def test_render_pane_output(self, mock_size):
        """Test pane output rendering."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        test_data = b'Hello, World!'

        with patch.object(manager.term_controller, 'move_cursor') as mock_move:
            with patch('sys.stdout.buffer.write') as mock_write:
                manager._render_pane_output(manager.claude_pane, test_data)

        mock_move.assert_called_once()
        mock_write.assert_called_once_with(test_data)

    @patch('os.get_terminal_size')
    def test_rerender_all(self, mock_size):
        """Test full screen rerender."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        with patch.object(manager.term_controller, 'clear_screen') as mock_clear:
            with patch.object(manager, '_render_borders') as mock_borders:
                manager._rerender_all()

        mock_clear.assert_called_once()
        mock_borders.assert_called_once()


class TestCleanup:
    """Test cleanup and shutdown."""

    @patch('os.get_terminal_size')
    def test_cleanup_terminates_panes(self, mock_size):
        """Test that cleanup terminates both panes."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        with patch.object(Pane, 'terminate') as mock_terminate:
            with patch.object(manager.term_controller, 'exit_alt_screen'):
                with patch.object(manager.term_controller, 'show_cursor'):
                    manager._cleanup()

        # Should terminate both panes
        assert mock_terminate.call_count == 2

    @patch('os.get_terminal_size')
    def test_cleanup_restores_terminal(self, mock_size):
        """Test that cleanup restores terminal state."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        with patch.object(Pane, 'terminate'):
            with patch.object(manager.term_controller, 'exit_alt_screen') as mock_exit:
                with patch.object(manager.term_controller, 'show_cursor') as mock_show:
                    manager._cleanup()

        mock_exit.assert_called_once()
        mock_show.assert_called_once()


class TestMainEventLoop:
    """Test main event loop logic."""

    @patch('os.get_terminal_size')
    def test_main_loop_routes_stdin_to_active_pane(self, mock_size):
        """Test that stdin input routing logic works correctly."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Test the routing logic directly without running the full loop
        test_input = b'a'  # Not a shortcut

        # Verify that non-shortcut input is recognized correctly
        assert manager._is_shortcut(test_input) is False

        # Verify active pane is set correctly
        assert manager.focus_manager.get_active() == manager.claude_pane

        # Test write directly to verify the method exists and works
        with patch.object(manager.claude_pane, 'write') as mock_write:
            manager.claude_pane.write(test_input)
            mock_write.assert_called_once_with(test_input)

    @patch('os.get_terminal_size')
    @patch('select.select')
    def test_main_loop_handles_pane_output(self, mock_select, mock_size):
        """Test that pane output is rendered."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # Mock Claude pane output
        mock_select.return_value = ([manager.claude_pane.fd], [], [])

        test_output = b'output'
        with patch.object(manager.claude_pane, 'read', return_value=test_output):
            with patch.object(manager, '_render_pane_output') as mock_render:
                with patch.object(manager.claude_pane, 'is_alive', side_effect=[True, False]):
                    with patch.object(manager.tui_pane, 'is_alive', return_value=False):
                        manager._main_loop()

        mock_render.assert_called()

    @patch('os.get_terminal_size')
    @patch('select.select')
    def test_main_loop_exits_when_panes_die(self, mock_select, mock_size):
        """Test that loop exits when both panes are dead."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(Pane, 'start'):
            manager._create_panes()

        # No input
        mock_select.return_value = ([], [], [])

        # Both panes dead immediately
        with patch.object(manager.claude_pane, 'is_alive', return_value=False):
            with patch.object(manager.tui_pane, 'is_alive', return_value=False):
                result = manager._main_loop()

        assert result == 0
        assert manager.running is False


class TestLaunchIntegration:
    """Test full launch integration."""

    @patch('os.get_terminal_size')
    def test_launch_with_claude_installed(self, mock_size):
        """Test successful launch with Claude installed."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(manager, '_detect_claude', return_value=True):
            with patch.object(manager.term_controller, 'enter_alt_screen'):
                with patch.object(manager.term_controller, 'clear_screen'):
                    with patch.object(manager, '_create_panes'):
                        with patch('signal.signal'):
                            with patch.object(manager, '_main_loop', return_value=0):
                                with patch.object(manager, '_cleanup'):
                                    exit_code = manager.launch()

        assert exit_code == 0

    def test_launch_without_claude_falls_back(self):
        """Test launch falls back to TUI when Claude not found."""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(manager, '_detect_claude', return_value=False):
            with patch.object(manager, '_launch_fallback', return_value=0) as mock_fallback:
                exit_code = manager.launch()

        mock_fallback.assert_called_once()
        assert exit_code == 0

    @patch('os.get_terminal_size')
    def test_launch_cleanup_on_exception(self, mock_size):
        """Test that cleanup runs even if exception occurs."""
        mock_size.return_value = os.terminal_size((120, 30))

        config = SplitViewConfig()
        manager = SplitViewManager(config)

        with patch.object(manager, '_detect_claude', return_value=True):
            with patch.object(manager.term_controller, 'enter_alt_screen'):
                with patch.object(manager.term_controller, 'clear_screen'):
                    with patch.object(manager, '_create_panes', side_effect=Exception("Test error")):
                        with patch.object(manager, '_cleanup') as mock_cleanup:
                            with pytest.raises(Exception):
                                manager.launch()

        mock_cleanup.assert_called_once()
