"""
Test suite for LayoutManager

Tests split calculations, minimum size validation, and resize operations.
"""

import pytest
from lib.yoyo_tui_v3.split_view.layout import LayoutManager, PaneBounds


class TestPaneBounds:
    """Test PaneBounds dataclass"""

    def test_pane_bounds_creation(self):
        """Test basic PaneBounds instantiation"""
        bounds = PaneBounds(x=0, y=0, width=60, height=30)
        assert bounds.x == 0
        assert bounds.y == 0
        assert bounds.width == 60
        assert bounds.height == 30

    def test_pane_bounds_equality(self):
        """Test PaneBounds equality comparison"""
        bounds1 = PaneBounds(x=0, y=0, width=60, height=30)
        bounds2 = PaneBounds(x=0, y=0, width=60, height=30)
        bounds3 = PaneBounds(x=1, y=0, width=60, height=30)

        assert bounds1 == bounds2
        assert bounds1 != bounds3


class TestLayoutManagerSplitCalculations:
    """Test LayoutManager split calculation logic"""

    def test_calculate_split_40_60_ratio(self):
        """Test 40/60 split on 120x30 terminal"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=120, height=30, ratio=0.4)

        # Left pane should be ~40% of width
        assert left.x == 0
        assert left.y == 0
        assert left.width == 48  # 40% of 120
        assert left.height == 30

        # Right pane should be ~60% of width
        assert right.x == 48  # Starts where left ends
        assert right.y == 0
        assert right.width == 72  # 120 - 48
        assert right.height == 30

    def test_calculate_split_50_50_ratio(self):
        """Test 50/50 split on 120x30 terminal"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=120, height=30, ratio=0.5)

        assert left.width == 60  # 50% of 120
        assert right.width == 60  # 50% of 120
        assert left.width + right.width == 120

    def test_calculate_split_30_70_ratio(self):
        """Test 30/70 split on 160x40 terminal"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=160, height=40, ratio=0.3)

        # Left pane should be ~30% of width
        assert left.width == 48  # 30% of 160
        assert right.width == 112  # 160 - 48
        assert left.height == 40
        assert right.height == 40

    def test_calculate_split_preserves_total_width(self):
        """Test that split preserves total terminal width"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=150, height=35, ratio=0.4)

        # Total width = left.width + right.width (border is visual, no space)
        total_width = left.width + right.width
        assert total_width == 150

    def test_calculate_split_full_height_for_both_panes(self):
        """Test that both panes get full terminal height"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=120, height=45, ratio=0.4)

        assert left.height == 45
        assert right.height == 45


class TestLayoutManagerMinimumSizeValidation:
    """Test minimum terminal size validation (120x30)"""

    def test_minimum_size_exactly_met(self):
        """Test terminal at exactly minimum size (120x30)"""
        manager = LayoutManager()
        # Should not raise exception
        left, right = manager.calculate_split(width=120, height=30, ratio=0.4)
        assert left is not None
        assert right is not None

    def test_minimum_size_exceeded(self):
        """Test terminal larger than minimum size"""
        manager = LayoutManager()
        # Should not raise exception
        left, right = manager.calculate_split(width=200, height=50, ratio=0.4)
        assert left is not None
        assert right is not None

    def test_width_too_small(self):
        """Test terminal width below minimum (119x30)"""
        manager = LayoutManager()
        with pytest.raises(ValueError, match="Terminal too small.*120x30"):
            manager.calculate_split(width=119, height=30, ratio=0.4)

    def test_height_too_small(self):
        """Test terminal height below minimum (120x29)"""
        manager = LayoutManager()
        with pytest.raises(ValueError, match="Terminal too small.*120x30"):
            manager.calculate_split(width=120, height=29, ratio=0.4)

    def test_both_dimensions_too_small(self):
        """Test terminal with both dimensions below minimum (80x20)"""
        manager = LayoutManager()
        with pytest.raises(ValueError, match="Terminal too small.*120x30"):
            manager.calculate_split(width=80, height=20, ratio=0.4)

    def test_validate_minimum_size_true(self):
        """Test validate_minimum_size returns True for valid terminal"""
        manager = LayoutManager()
        # Mock terminal size
        import os
        original_get_terminal_size = os.get_terminal_size
        try:
            os.get_terminal_size = lambda: os.terminal_size((120, 30))
            assert manager.validate_minimum_size() is True
        finally:
            os.get_terminal_size = original_get_terminal_size

    def test_validate_minimum_size_false(self):
        """Test validate_minimum_size returns False for invalid terminal"""
        manager = LayoutManager()
        # Mock terminal size
        import os
        original_get_terminal_size = os.get_terminal_size
        try:
            os.get_terminal_size = lambda: os.terminal_size((80, 20))
            assert manager.validate_minimum_size() is False
        finally:
            os.get_terminal_size = original_get_terminal_size


class TestLayoutManagerResizeOperations:
    """Test resize pane operations"""

    def test_resize_pane_increase_width(self):
        """Test increasing pane width"""
        manager = LayoutManager()
        # Initial split
        left, right = manager.calculate_split(width=120, height=30, ratio=0.4)
        initial_left_width = left.width

        # Resize left pane wider by 10 columns
        new_left, new_right = manager.resize_pane(
            left_pane=left,
            right_pane=right,
            delta=10
        )

        assert new_left.width == initial_left_width + 10
        assert new_right.width == right.width - 10
        assert new_left.width + new_right.width == 120

    def test_resize_pane_decrease_width(self):
        """Test decreasing pane width"""
        manager = LayoutManager()
        # Initial split
        left, right = manager.calculate_split(width=120, height=30, ratio=0.4)
        initial_left_width = left.width

        # Resize left pane narrower by 10 columns
        new_left, new_right = manager.resize_pane(
            left_pane=left,
            right_pane=right,
            delta=-10
        )

        assert new_left.width == initial_left_width - 10
        assert new_right.width == right.width + 10
        assert new_left.width + new_right.width == 120

    def test_resize_pane_maintains_minimum_width(self):
        """Test that resize doesn't make panes too small"""
        manager = LayoutManager()
        # Initial split
        left, right = manager.calculate_split(width=120, height=30, ratio=0.4)

        # Try to resize beyond minimum (should clamp)
        new_left, new_right = manager.resize_pane(
            left_pane=left,
            right_pane=right,
            delta=-100  # Try to make left pane tiny
        )

        # Both panes should maintain minimum width
        assert new_left.width >= manager.MIN_PANE_WIDTH
        assert new_right.width >= manager.MIN_PANE_WIDTH

    def test_resize_pane_right_boundary_adjustment(self):
        """Test that right pane x position adjusts correctly"""
        manager = LayoutManager()
        # Initial split
        left, right = manager.calculate_split(width=120, height=30, ratio=0.4)

        # Resize left pane wider
        new_left, new_right = manager.resize_pane(
            left_pane=left,
            right_pane=right,
            delta=5
        )

        # Right pane should start where left pane ends
        assert new_right.x == new_left.width

    def test_resize_pane_preserves_height(self):
        """Test that resize doesn't affect pane height"""
        manager = LayoutManager()
        # Initial split
        left, right = manager.calculate_split(width=120, height=30, ratio=0.4)

        # Resize
        new_left, new_right = manager.resize_pane(
            left_pane=left,
            right_pane=right,
            delta=10
        )

        assert new_left.height == left.height
        assert new_right.height == right.height


class TestLayoutManagerEdgeCases:
    """Test edge cases and error conditions"""

    def test_invalid_ratio_too_low(self):
        """Test ratio below 0.1"""
        manager = LayoutManager()
        with pytest.raises(ValueError, match="Ratio must be between 0.1 and 0.9"):
            manager.calculate_split(width=120, height=30, ratio=0.05)

    def test_invalid_ratio_too_high(self):
        """Test ratio above 0.9"""
        manager = LayoutManager()
        with pytest.raises(ValueError, match="Ratio must be between 0.1 and 0.9"):
            manager.calculate_split(width=120, height=30, ratio=0.95)

    def test_boundary_ratio_0_1(self):
        """Test minimum valid ratio (0.1)"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=120, height=30, ratio=0.1)
        # Should work without exception
        assert left.width > 0
        assert right.width > 0

    def test_boundary_ratio_0_9(self):
        """Test maximum valid ratio (0.9)"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=120, height=30, ratio=0.9)
        # Should work without exception
        assert left.width > 0
        assert right.width > 0

    def test_zero_width_terminal(self):
        """Test terminal with zero width"""
        manager = LayoutManager()
        with pytest.raises(ValueError):
            manager.calculate_split(width=0, height=30, ratio=0.4)

    def test_zero_height_terminal(self):
        """Test terminal with zero height"""
        manager = LayoutManager()
        with pytest.raises(ValueError):
            manager.calculate_split(width=120, height=0, ratio=0.4)

    def test_negative_dimensions(self):
        """Test terminal with negative dimensions"""
        manager = LayoutManager()
        with pytest.raises(ValueError):
            manager.calculate_split(width=-120, height=-30, ratio=0.4)

    def test_very_large_terminal(self):
        """Test split calculation on very large terminal"""
        manager = LayoutManager()
        left, right = manager.calculate_split(width=400, height=100, ratio=0.4)

        # Should handle large terminals correctly
        assert left.width + right.width == 400
        assert left.height == 100
        assert right.height == 100
