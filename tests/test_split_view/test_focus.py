"""
Tests for FocusManager class

Tests focus tracking, toggling, and visual indicator rendering for split view panes.
"""

import pytest
from unittest.mock import Mock, MagicMock, call
from dataclasses import dataclass


# Mock PaneBounds for testing
@dataclass
class PaneBounds:
    """Mock bounds for testing"""
    x: int
    y: int
    width: int
    height: int


# Mock Pane for testing
class MockPane:
    """Mock Pane class for testing"""
    def __init__(self, name: str, bounds: PaneBounds):
        self.name = name
        self.bounds = bounds


# Mock TerminalController for testing
class MockTerminalController:
    """Mock terminal controller for testing"""
    def __init__(self):
        self.draw_border = Mock()
        self.set_color = Mock()
        self.move_cursor = Mock()


# Mock BorderStyle for testing
@dataclass
class MockBorderStyle:
    """Mock border style configuration"""
    active: str = "bright_cyan"
    inactive: str = "dim_white"


class TestFocusManagerPaneTracking:
    """Test FocusManager pane tracking functionality"""

    def test_set_active_pane(self):
        """Test setting a pane as active"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane = MockPane("test_pane", PaneBounds(0, 0, 50, 30))

        manager.set_active(pane)

        assert manager.get_active() == pane

    def test_set_active_updates_previous_active(self):
        """Test that setting active pane updates from previous"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.set_active(pane1)
        assert manager.get_active() == pane1

        manager.set_active(pane2)
        assert manager.get_active() == pane2

    def test_get_active_returns_none_when_not_set(self):
        """Test that get_active returns None when no pane is active"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()

        assert manager.get_active() is None

    def test_track_multiple_panes(self):
        """Test tracking multiple panes in the manager"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]

        assert len(manager.panes) == 2
        assert pane1 in manager.panes
        assert pane2 in manager.panes


class TestFocusManagerToggle:
    """Test FocusManager focus toggle functionality"""

    def test_toggle_switches_between_two_panes(self):
        """Test toggling between two panes"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(pane1)

        manager.toggle()
        assert manager.get_active() == pane2

        manager.toggle()
        assert manager.get_active() == pane1

    def test_toggle_cycles_back_to_first_pane(self):
        """Test that toggle cycles back to first pane"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(pane2)

        manager.toggle()
        assert manager.get_active() == pane1

    def test_toggle_with_no_panes_does_nothing(self):
        """Test that toggle with empty panes list doesn't crash"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        manager.panes = []

        # Should not raise exception
        manager.toggle()
        assert manager.get_active() is None

    def test_toggle_with_one_pane_stays_on_same_pane(self):
        """Test that toggle with single pane doesn't change active"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 100, 30))

        manager.panes = [pane1]
        manager.set_active(pane1)

        manager.toggle()
        # With only one pane, it should stay active
        assert manager.get_active() == pane1

    def test_toggle_maintains_pane_list_integrity(self):
        """Test that toggle doesn't modify panes list"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(pane1)

        original_panes = manager.panes.copy()
        manager.toggle()

        assert manager.panes == original_panes


class TestFocusManagerVisualIndicators:
    """Test FocusManager visual indicator rendering"""

    def test_render_indicators_draws_borders_for_all_panes(self):
        """Test that render_indicators draws borders for all panes"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(pane1)

        term_controller = MockTerminalController()
        border_style = MockBorderStyle()

        manager.render_indicators(term_controller, border_style)

        # Should draw border for both panes
        assert term_controller.draw_border.call_count == 2

    def test_render_indicators_uses_active_color_for_active_pane(self):
        """Test that active pane gets active color"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(pane1)

        term_controller = MockTerminalController()
        border_style = MockBorderStyle()

        manager.render_indicators(term_controller, border_style)

        # First call should be for active pane with active color
        calls = term_controller.draw_border.call_args_list
        assert calls[0] == call(pane1.bounds, "bright_cyan")

    def test_render_indicators_uses_inactive_color_for_inactive_pane(self):
        """Test that inactive pane gets inactive color"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(pane1)

        term_controller = MockTerminalController()
        border_style = MockBorderStyle()

        manager.render_indicators(term_controller, border_style)

        # Second call should be for inactive pane with inactive color
        calls = term_controller.draw_border.call_args_list
        assert calls[1] == call(pane2.bounds, "dim_white")

    def test_render_indicators_with_no_active_pane(self):
        """Test render_indicators when no pane is active"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        # Don't set any pane as active

        term_controller = MockTerminalController()
        border_style = MockBorderStyle()

        manager.render_indicators(term_controller, border_style)

        # Both should get inactive color since no active pane
        calls = term_controller.draw_border.call_args_list
        assert len(calls) == 2
        assert calls[0] == call(pane1.bounds, "dim_white")
        assert calls[1] == call(pane2.bounds, "dim_white")

    def test_render_indicators_with_empty_panes_list(self):
        """Test render_indicators with no panes"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        manager.panes = []

        term_controller = MockTerminalController()
        border_style = MockBorderStyle()

        # Should not crash
        manager.render_indicators(term_controller, border_style)

        # Should not draw any borders
        assert term_controller.draw_border.call_count == 0

    def test_render_indicators_updates_after_toggle(self):
        """Test that visual indicators update after focus toggle"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(pane1)

        term_controller = MockTerminalController()
        border_style = MockBorderStyle()

        # Render with pane1 active
        manager.render_indicators(term_controller, border_style)
        first_calls = term_controller.draw_border.call_args_list.copy()

        # Toggle and render again
        manager.toggle()
        term_controller.draw_border.reset_mock()
        manager.render_indicators(term_controller, border_style)
        second_calls = term_controller.draw_border.call_args_list

        # First pane should now be inactive, second should be active
        assert second_calls[0] == call(pane1.bounds, "dim_white")
        assert second_calls[1] == call(pane2.bounds, "bright_cyan")


class TestFocusManagerEdgeCases:
    """Test edge cases and error handling"""

    def test_set_active_with_none(self):
        """Test setting active pane to None"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane = MockPane("pane", PaneBounds(0, 0, 50, 30))
        manager.set_active(pane)

        # Should allow setting to None
        manager.set_active(None)
        assert manager.get_active() is None

    def test_toggle_when_active_pane_not_in_list(self):
        """Test toggle when active pane is not in panes list"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))
        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))
        orphan_pane = MockPane("orphan", PaneBounds(0, 0, 100, 30))

        manager.panes = [pane1, pane2]
        manager.set_active(orphan_pane)  # Set active to pane not in list

        # Should handle gracefully
        manager.toggle()
        # Should not crash, behavior may vary

    def test_panes_list_is_mutable(self):
        """Test that panes list can be modified"""
        from lib.yoyo_tui_v3.split_view.focus import FocusManager

        manager = FocusManager()
        pane1 = MockPane("pane1", PaneBounds(0, 0, 50, 30))

        manager.panes = [pane1]
        assert len(manager.panes) == 1

        pane2 = MockPane("pane2", PaneBounds(50, 0, 50, 30))
        manager.panes.append(pane2)
        assert len(manager.panes) == 2
