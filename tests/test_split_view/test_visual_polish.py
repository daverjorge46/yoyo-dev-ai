"""
Tests for visual polish and UX improvements in split view.

This module tests:
- Border rendering with colors (active/inactive states)
- Active pane indicator updates
- Claude fallback message display
- Visual transitions and polish
"""

import io
import sys
import pytest
from unittest.mock import Mock, MagicMock, patch, call
from dataclasses import dataclass

from lib.yoyo_tui_v3.split_view.terminal_control import TerminalController, PaneBounds
from lib.yoyo_tui_v3.split_view.focus import FocusManager
from lib.yoyo_tui_v3.split_view.manager import (
    SplitViewManager,
    SplitViewConfig,
    BorderStyle,
    KeyboardShortcuts,
    ClaudeConfig
)


# Mock Pane for testing
class MockPane:
    """Mock Pane class for testing"""
    def __init__(self, name: str, bounds: PaneBounds):
        self.name = name
        self.bounds = bounds
        self.fd = None

    def is_alive(self):
        return True

    def write(self, data):
        pass

    def read(self):
        return b""

    def terminate(self):
        pass

    def resize(self, bounds):
        self.bounds = bounds


class TestBorderRenderingWithColors:
    """Test border rendering with active/inactive colors"""

    def test_draw_border_with_bright_cyan_for_active(self, monkeypatch):
        """Test that active pane border is drawn with bright cyan color"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)

        tc = TerminalController()
        bounds = PaneBounds(x=0, y=0, width=50, height=20)

        tc.draw_border(bounds, 'bright_cyan')

        result = output.getvalue()

        # Should contain bright cyan color code
        assert '\033[1;36m' in result

        # Should contain box drawing characters
        assert '┌' in result
        assert '┐' in result
        assert '└' in result
        assert '┘' in result
        assert '─' in result
        assert '│' in result

        # Should reset color at the end
        assert '\033[0m' in result

    def test_draw_border_with_dim_white_for_inactive(self, monkeypatch):
        """Test that inactive pane border is drawn with dim white color"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)

        tc = TerminalController()
        bounds = PaneBounds(x=0, y=0, width=50, height=20)

        tc.draw_border(bounds, 'dim_white')

        result = output.getvalue()

        # Should contain dim white color code
        assert '\033[2;37m' in result

        # Should reset color at the end
        assert '\033[0m' in result

    def test_draw_border_preserves_box_characters(self, monkeypatch):
        """Test that box drawing characters are preserved regardless of color"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)

        tc = TerminalController()
        bounds = PaneBounds(x=5, y=5, width=30, height=15)

        # Test with different colors
        for color in ['bright_cyan', 'dim_white']:
            output.truncate(0)
            output.seek(0)

            tc.draw_border(bounds, color)
            result = output.getvalue()

            # Verify box characters
            assert '┌' in result
            assert '┐' in result
            assert '└' in result
            assert '┘' in result
            assert '─' in result
            assert '│' in result

    def test_draw_border_respects_bounds(self, monkeypatch):
        """Test that borders are drawn respecting the specified bounds"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)

        tc = TerminalController()
        bounds = PaneBounds(x=10, y=5, width=40, height=20)

        tc.draw_border(bounds, 'bright_cyan')

        result = output.getvalue()

        # Should contain cursor movement to bounds positions
        # Top-left corner: (5, 10) -> ANSI (6, 11)
        assert '\033[6;11H' in result

        # Should contain horizontal lines with correct width
        # Width minus 2 corners = 38 characters
        assert '─' * 38 in result


class TestActivePaneIndicatorUpdates:
    """Test that active pane indicators update correctly"""

    def test_focus_manager_renders_active_pane_with_bright_cyan(self):
        """Test that FocusManager renders active pane border in bright cyan"""
        # Setup
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        focus_manager = FocusManager()
        focus_manager.panes = [pane1, pane2]
        focus_manager.set_active(pane1)

        # Mock terminal controller
        term_controller = Mock()
        term_controller.draw_border = Mock()

        # Mock border style
        border_style = BorderStyle()

        # Render indicators
        focus_manager.render_indicators(term_controller, border_style)

        # Verify active pane gets bright cyan
        calls = term_controller.draw_border.call_args_list
        assert len(calls) == 2

        # First call should be for active pane (pane1) with bright_cyan
        assert calls[0] == call(pane1.bounds, 'bright_cyan')

        # Second call should be for inactive pane (pane2) with dim_white
        assert calls[1] == call(pane2.bounds, 'dim_white')

    def test_focus_manager_renders_inactive_pane_with_dim_white(self):
        """Test that FocusManager renders inactive pane border in dim white"""
        # Setup
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        focus_manager = FocusManager()
        focus_manager.panes = [pane1, pane2]
        focus_manager.set_active(pane2)  # pane2 is active, pane1 is inactive

        # Mock terminal controller
        term_controller = Mock()
        term_controller.draw_border = Mock()

        # Mock border style
        border_style = BorderStyle()

        # Render indicators
        focus_manager.render_indicators(term_controller, border_style)

        # Verify inactive pane gets dim white
        calls = term_controller.draw_border.call_args_list
        assert len(calls) == 2

        # First call for pane1 (inactive) should use dim_white
        assert calls[0] == call(pane1.bounds, 'dim_white')

        # Second call for pane2 (active) should use bright_cyan
        assert calls[1] == call(pane2.bounds, 'bright_cyan')

    def test_toggle_focus_updates_indicators(self):
        """Test that toggling focus updates border colors correctly"""
        # Setup
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        focus_manager = FocusManager()
        focus_manager.panes = [pane1, pane2]
        focus_manager.set_active(pane1)

        term_controller = Mock()
        term_controller.draw_border = Mock()
        border_style = BorderStyle()

        # Render initial state
        focus_manager.render_indicators(term_controller, border_style)
        initial_calls = term_controller.draw_border.call_args_list.copy()

        # Toggle focus
        focus_manager.toggle()
        term_controller.draw_border.reset_mock()

        # Render after toggle
        focus_manager.render_indicators(term_controller, border_style)
        toggled_calls = term_controller.draw_border.call_args_list

        # Verify colors switched
        # Initially: pane1=active(cyan), pane2=inactive(white)
        assert initial_calls[0] == call(pane1.bounds, 'bright_cyan')
        assert initial_calls[1] == call(pane2.bounds, 'dim_white')

        # After toggle: pane1=inactive(white), pane2=active(cyan)
        assert toggled_calls[0] == call(pane1.bounds, 'dim_white')
        assert toggled_calls[1] == call(pane2.bounds, 'bright_cyan')

    def test_no_indicators_when_no_panes(self):
        """Test that render_indicators handles empty panes list gracefully"""
        focus_manager = FocusManager()
        focus_manager.panes = []

        term_controller = Mock()
        term_controller.draw_border = Mock()
        border_style = BorderStyle()

        # Should not crash
        focus_manager.render_indicators(term_controller, border_style)

        # Should not call draw_border
        term_controller.draw_border.assert_not_called()


class TestClaudeFallbackMessage:
    """Test Claude Code not found fallback message"""

    def test_fallback_message_contains_warning(self, capsys):
        """Test that fallback message displays warning symbol"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        manager._show_claude_not_found_message()

        captured = capsys.readouterr()
        assert '⚠️' in captured.out
        assert 'Claude Code Not Found' in captured.out

    def test_fallback_message_contains_installation_link(self, capsys):
        """Test that fallback message includes installation URL"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        manager._show_claude_not_found_message()

        captured = capsys.readouterr()
        assert 'https://github.com/anthropics/claude-code' in captured.out

    def test_fallback_message_explains_installation(self, capsys):
        """Test that fallback message explains installation requirement"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        manager._show_claude_not_found_message()

        captured = capsys.readouterr()
        assert 'not installed' in captured.out or 'not in PATH' in captured.out

    def test_fallback_message_suggests_no_split_flag(self, capsys):
        """Test that fallback message suggests --no-split option"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        manager._show_claude_not_found_message()

        captured = capsys.readouterr()
        assert '--no-split' in captured.out or 'yoyo --no-split' in captured.out

    def test_fallback_message_shows_countdown(self, capsys):
        """Test that fallback message shows countdown timer"""
        config = SplitViewConfig()
        config.claude.fallback_delay = 3
        manager = SplitViewManager(config)

        manager._show_claude_not_found_message()

        captured = capsys.readouterr()
        assert '3 seconds' in captured.out or 'Launching TUI' in captured.out

    def test_fallback_message_uses_box_drawing(self, capsys):
        """Test that fallback message uses box drawing characters"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        manager._show_claude_not_found_message()

        captured = capsys.readouterr()
        # Should use double-line box drawing characters
        assert '╔' in captured.out or '═' in captured.out or '║' in captured.out


class TestVisualTransitions:
    """Test smooth visual transitions and polish"""

    def test_render_borders_called_after_toggle(self):
        """Test that borders are re-rendered after focus toggle"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        # Setup mock panes
        manager.claude_pane = MockPane("claude", PaneBounds(0, 0, 50, 30))
        manager.tui_pane = MockPane("tui", PaneBounds(50, 0, 70, 30))
        manager.focus_manager.panes = [manager.claude_pane, manager.tui_pane]
        manager.focus_manager.set_active(manager.claude_pane)

        # Mock the render method
        with patch.object(manager, '_render_borders') as mock_render:
            # Simulate Ctrl+B → shortcut
            manager._handle_shortcut(b'\x02\x1b[C')

            # Verify borders were re-rendered
            mock_render.assert_called_once()

    def test_rerender_all_clears_screen_first(self):
        """Test that _rerender_all clears screen before redrawing"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        manager.claude_pane = MockPane("claude", PaneBounds(0, 0, 50, 30))
        manager.tui_pane = MockPane("tui", PaneBounds(50, 0, 70, 30))
        manager.focus_manager.panes = [manager.claude_pane, manager.tui_pane]

        with patch.object(manager.term_controller, 'clear_screen') as mock_clear:
            with patch.object(manager, '_render_borders') as mock_borders:
                manager._rerender_all()

                # Verify clear was called first
                mock_clear.assert_called_once()
                mock_borders.assert_called_once()

    def test_resize_triggers_full_rerender(self):
        """Test that terminal resize triggers full screen re-render"""
        config = SplitViewConfig()
        manager = SplitViewManager(config)

        manager.claude_pane = MockPane("claude", PaneBounds(0, 0, 50, 30))
        manager.tui_pane = MockPane("tui", PaneBounds(50, 0, 70, 30))

        with patch('os.get_terminal_size') as mock_size:
            mock_size.return_value = (120, 30)

            with patch.object(manager, '_rerender_all') as mock_rerender:
                # Simulate SIGWINCH
                manager._handle_resize(None, None)

                # Verify full rerender was called
                mock_rerender.assert_called_once()


class TestBorderStyleConfiguration:
    """Test border style configuration options"""

    def test_default_border_style_uses_bright_cyan(self):
        """Test that default active border is bright cyan"""
        border_style = BorderStyle()
        assert border_style.active == "bright_cyan"

    def test_default_border_style_uses_dim_white(self):
        """Test that default inactive border is dim white"""
        border_style = BorderStyle()
        assert border_style.inactive == "dim_white"

    def test_border_style_uses_unicode_box_chars(self):
        """Test that border style includes Unicode box-drawing characters"""
        border_style = BorderStyle()

        assert border_style.char_vertical == "│"
        assert border_style.char_horizontal == "─"
        assert border_style.char_top_left == "┌"
        assert border_style.char_top_right == "┐"
        assert border_style.char_bottom_left == "└"
        assert border_style.char_bottom_right == "┘"

    def test_custom_border_style_colors(self):
        """Test that custom border colors can be set"""
        border_style = BorderStyle(active="yellow", inactive="gray")

        assert border_style.active == "yellow"
        assert border_style.inactive == "gray"


class TestKeyboardShortcutHints:
    """Test keyboard shortcut configuration and hints"""

    def test_default_shortcuts_use_ctrl_b_prefix(self):
        """Test that default shortcuts use Ctrl+B prefix"""
        shortcuts = KeyboardShortcuts()

        # All shortcuts should start with Ctrl+B (0x02)
        assert shortcuts.switch_focus.startswith(b'\x02')
        assert shortcuts.resize_left.startswith(b'\x02')
        assert shortcuts.resize_right.startswith(b'\x02')

    def test_switch_focus_shortcut(self):
        """Test switch focus shortcut is Ctrl+B →"""
        shortcuts = KeyboardShortcuts()
        # Ctrl+B followed by right arrow escape sequence
        assert shortcuts.switch_focus == b'\x02\x1b[C'

    def test_resize_shortcuts(self):
        """Test resize shortcuts are Ctrl+B < and Ctrl+B >"""
        shortcuts = KeyboardShortcuts()

        assert shortcuts.resize_left == b'\x02<'
        assert shortcuts.resize_right == b'\x02>'


class TestColorSchemeCompatibility:
    """Test visual appearance across different terminal color schemes"""

    def test_bright_cyan_produces_correct_ansi_code(self):
        """Test that bright_cyan color produces correct ANSI code"""
        tc = TerminalController()
        assert tc.COLORS['bright_cyan'] == '\033[1;36m'

    def test_dim_white_produces_correct_ansi_code(self):
        """Test that dim_white color produces correct ANSI code"""
        tc = TerminalController()
        assert tc.COLORS['dim_white'] == '\033[2;37m'

    def test_reset_clears_all_attributes(self):
        """Test that reset color clears all text attributes"""
        tc = TerminalController()
        assert tc.COLORS['reset'] == '\033[0m'

    def test_set_color_invalid_color_fails_silently(self, monkeypatch):
        """Test that invalid color names fail silently"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)

        tc = TerminalController()

        # Should not crash or produce output
        tc.set_color('invalid_color')

        result = output.getvalue()
        assert result == ''
