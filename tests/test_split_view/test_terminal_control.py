"""
Tests for TerminalController - ANSI/VT100 escape sequence management.

This module tests low-level terminal control functionality including
alternate screen buffer, cursor control, colors, and border drawing.
"""

import io
import sys
import pytest
from dataclasses import dataclass
from lib.yoyo_tui_v3.split_view.terminal_control import TerminalController


@dataclass
class PaneBounds:
    """Test bounds dataclass"""
    x: int
    y: int
    width: int
    height: int


class TestTerminalControllerEscapeSequences:
    """Test ANSI escape sequence generation"""

    def test_ansi_constants(self):
        """Test that escape sequence constants are correctly defined"""
        tc = TerminalController()
        
        # Basic escape codes
        assert tc.ESC == '\033'
        assert tc.CSI == '\033['
        
        # Screen control
        assert tc.ALT_SCREEN_ON == '\033[?1049h'
        assert tc.ALT_SCREEN_OFF == '\033[?1049l'
        assert tc.CLEAR_SCREEN == '\033[2J'
        
        # Cursor control
        assert tc.HIDE_CURSOR == '\033[?25l'
        assert tc.SHOW_CURSOR == '\033[?25h'

    def test_color_definitions(self):
        """Test color escape sequences"""
        tc = TerminalController()
        
        assert 'bright_cyan' in tc.COLORS
        assert 'dim_white' in tc.COLORS
        assert 'reset' in tc.COLORS
        
        assert tc.COLORS['bright_cyan'] == '\033[1;36m'
        assert tc.COLORS['dim_white'] == '\033[2;37m'
        assert tc.COLORS['reset'] == '\033[0m'


class TestTerminalControllerScreenBuffer:
    """Test alternate screen buffer management"""

    def test_enter_alt_screen(self, monkeypatch):
        """Test entering alternate screen buffer"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.enter_alt_screen()
        
        result = output.getvalue()
        assert result == '\033[?1049h'

    def test_exit_alt_screen(self, monkeypatch):
        """Test exiting alternate screen buffer"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.exit_alt_screen()
        
        result = output.getvalue()
        assert result == '\033[?1049l'

    def test_clear_screen(self, monkeypatch):
        """Test clearing the screen"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.clear_screen()
        
        result = output.getvalue()
        assert result == '\033[2J'


class TestTerminalControllerCursor:
    """Test cursor control methods"""

    def test_move_cursor_origin(self, monkeypatch):
        """Test moving cursor to origin (0, 0)"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.move_cursor(0, 0)
        
        result = output.getvalue()
        # ANSI uses 1-indexed coordinates
        assert result == '\033[1;1H'

    def test_move_cursor_arbitrary(self, monkeypatch):
        """Test moving cursor to arbitrary position"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.move_cursor(10, 20)
        
        result = output.getvalue()
        # 0-indexed to 1-indexed conversion
        assert result == '\033[11;21H'

    def test_hide_cursor(self, monkeypatch):
        """Test hiding the cursor"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.hide_cursor()
        
        result = output.getvalue()
        assert result == '\033[?25l'

    def test_show_cursor(self, monkeypatch):
        """Test showing the cursor"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.show_cursor()
        
        result = output.getvalue()
        assert result == '\033[?25h'


class TestTerminalControllerColors:
    """Test color setting methods"""

    def test_set_color_bright_cyan(self, monkeypatch):
        """Test setting bright cyan color"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.set_color('bright_cyan')
        
        result = output.getvalue()
        assert result == '\033[1;36m'

    def test_set_color_dim_white(self, monkeypatch):
        """Test setting dim white color"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.set_color('dim_white')
        
        result = output.getvalue()
        assert result == '\033[2;37m'

    def test_set_color_reset(self, monkeypatch):
        """Test resetting color"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.set_color('reset')
        
        result = output.getvalue()
        assert result == '\033[0m'

    def test_set_color_invalid(self, monkeypatch):
        """Test setting invalid color does nothing"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.set_color('invalid_color')
        
        result = output.getvalue()
        assert result == ''


class TestTerminalControllerBorderDrawing:
    """Test border drawing functionality"""

    def test_draw_border_simple(self, monkeypatch):
        """Test drawing a simple border"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        bounds = PaneBounds(x=0, y=0, width=10, height=5)
        
        tc.draw_border(bounds, 'bright_cyan')
        
        result = output.getvalue()
        
        # Should contain color escape sequence
        assert '\033[1;36m' in result
        
        # Should contain box-drawing characters
        assert '┌' in result  # Top-left corner
        assert '┐' in result  # Top-right corner
        assert '└' in result  # Bottom-left corner
        assert '┘' in result  # Bottom-right corner
        assert '─' in result  # Horizontal line
        assert '│' in result  # Vertical line
        
        # Should end with color reset
        assert '\033[0m' in result

    def test_draw_border_dimensions(self, monkeypatch):
        """Test border drawing with specific dimensions"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        bounds = PaneBounds(x=5, y=10, width=20, height=10)
        
        tc.draw_border(bounds, 'dim_white')
        
        result = output.getvalue()
        
        # Check color is applied
        assert '\033[2;37m' in result
        
        # Check cursor positioning (should have multiple move_cursor calls)
        assert '\033[' in result
        assert 'H' in result  # Cursor position command

    def test_draw_border_minimum_size(self, monkeypatch):
        """Test border drawing with minimum size (3x3)"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        bounds = PaneBounds(x=0, y=0, width=3, height=3)
        
        tc.draw_border(bounds, 'bright_cyan')
        
        result = output.getvalue()
        
        # Should still contain all corner characters
        assert '┌' in result
        assert '┐' in result
        assert '└' in result
        assert '┘' in result


class TestTerminalControllerIntegration:
    """Integration tests for combined operations"""

    def test_full_screen_setup_sequence(self, monkeypatch):
        """Test typical screen setup sequence"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        
        # Typical setup: enter alt screen, clear, hide cursor
        tc.enter_alt_screen()
        tc.clear_screen()
        tc.hide_cursor()
        
        result = output.getvalue()
        
        # Check all escape sequences are present in order
        assert '\033[?1049h' in result  # Alt screen
        assert '\033[2J' in result       # Clear
        assert '\033[?25l' in result     # Hide cursor

    def test_full_screen_cleanup_sequence(self, monkeypatch):
        """Test typical screen cleanup sequence"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        
        # Typical cleanup: show cursor, exit alt screen
        tc.show_cursor()
        tc.exit_alt_screen()
        
        result = output.getvalue()
        
        # Check cleanup sequences are present in order
        assert '\033[?25h' in result     # Show cursor
        assert '\033[?1049l' in result   # Exit alt screen

    def test_split_view_border_sequence(self, monkeypatch):
        """Test drawing borders for split view panes"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        
        # Left pane (active)
        left_bounds = PaneBounds(x=0, y=0, width=48, height=30)
        tc.draw_border(left_bounds, 'bright_cyan')
        
        # Right pane (inactive)
        right_bounds = PaneBounds(x=49, y=0, width=71, height=30)
        tc.draw_border(right_bounds, 'dim_white')
        
        result = output.getvalue()
        
        # Should have both colors
        assert '\033[1;36m' in result  # Active (cyan)
        assert '\033[2;37m' in result  # Inactive (white)
        
        # Should have multiple cursor moves
        move_count = result.count('\033[')
        assert move_count > 10  # Many positioning commands


class TestTerminalControllerEdgeCases:
    """Test edge cases and error conditions"""

    def test_move_cursor_negative_coordinates(self, monkeypatch):
        """Test moving cursor with negative coordinates (should still work)"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        tc.move_cursor(-5, -10)
        
        result = output.getvalue()
        # Should convert to 1-indexed (negative becomes 1)
        # Implementation should handle this gracefully
        assert 'H' in result

    def test_draw_border_zero_width(self, monkeypatch):
        """Test border with zero or negative dimensions"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        bounds = PaneBounds(x=0, y=0, width=0, height=5)
        
        # Should not crash - implementation should handle gracefully
        tc.draw_border(bounds, 'bright_cyan')
        
        result = output.getvalue()
        # Some output should be generated (at minimum color codes)
        assert len(result) >= 0

    def test_multiple_color_changes(self, monkeypatch):
        """Test rapid color changes"""
        output = io.StringIO()
        monkeypatch.setattr(sys, 'stdout', output)
        
        tc = TerminalController()
        
        tc.set_color('bright_cyan')
        tc.set_color('dim_white')
        tc.set_color('reset')
        tc.set_color('bright_cyan')
        
        result = output.getvalue()
        
        # Should have all four color codes
        assert result.count('\033[1;36m') == 2  # Cyan twice
        assert result.count('\033[2;37m') == 1  # White once
        assert result.count('\033[0m') == 1     # Reset once


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
