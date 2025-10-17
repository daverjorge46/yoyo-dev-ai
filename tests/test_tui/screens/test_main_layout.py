"""
Tests for MainScreen layout configuration.

This test suite verifies the layout percentages and resize capabilities
according to the fix specification:
- 50/50 initial panel split (sidebar: 50%, main: 50%)
- Panel resize capability
- Minimum width constraints (40 columns each)
- Responsive behavior (hide sidebar < 80 columns)

NOTE: These tests are written to fail with the current 35/65 split
and will pass once the layout is updated to 50/50.
"""

import unittest
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestMainScreenLayoutPercentages(unittest.TestCase):
    """Test MainScreen layout percentages match specification."""

    def test_styles_css_defines_sidebar_width(self):
        """Test that styles.css defines sidebar width."""
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        self.assertTrue(css_path.exists(), f"styles.css should exist at {css_path}")

        content = css_path.read_text()

        # Check that sidebar width is defined
        self.assertIn('#sidebar', content, "styles.css should define #sidebar styles")
        self.assertIn('width:', content, "styles.css should define width property")

    def test_sidebar_width_is_50_percent(self):
        """Test that sidebar width is set to 50% in CSS.

        This test SHOULD FAIL with current 35% width.
        Will pass after updating to 50% width.
        """
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = css_path.read_text()

        # Find the #sidebar block
        sidebar_section_start = content.find('#sidebar {')
        self.assertNotEqual(sidebar_section_start, -1, "#sidebar block should exist")

        # Find the closing brace for sidebar block
        sidebar_section_end = content.find('}', sidebar_section_start)
        sidebar_section = content[sidebar_section_start:sidebar_section_end]

        # Check for width: 50%;
        self.assertIn('width: 50%;', sidebar_section,
                     "Sidebar width should be 50% (currently 35%, this test should fail)")

    def test_main_width_is_50_percent(self):
        """Test that main content width is set to 50% in CSS.

        This test SHOULD FAIL with current 65% width.
        Will pass after updating to 50% width.
        """
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = css_path.read_text()

        # Find the #main block
        main_section_start = content.find('#main {')
        self.assertNotEqual(main_section_start, -1, "#main block should exist")

        # Find the closing brace for main block
        main_section_end = content.find('}', main_section_start)
        main_section = content[main_section_start:main_section_end]

        # Check for width: 50%;
        self.assertIn('width: 50%;', main_section,
                     "Main content width should be 50% (currently 65%, this test should fail)")

    def test_layout_percentages_sum_to_100(self):
        """Test that sidebar + main widths sum to 100%.

        This test verifies the mathematical correctness of the layout.
        """
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = css_path.read_text()

        # Extract sidebar width
        sidebar_section_start = content.find('#sidebar {')
        sidebar_section_end = content.find('}', sidebar_section_start)
        sidebar_section = content[sidebar_section_start:sidebar_section_end]

        # Extract main width
        main_section_start = content.find('#main {')
        main_section_end = content.find('}', main_section_start)
        main_section = content[main_section_start:main_section_end]

        # Parse widths (basic parsing for percentage values)
        import re
        sidebar_width_match = re.search(r'width:\s*(\d+)%', sidebar_section)
        main_width_match = re.search(r'width:\s*(\d+)%', main_section)

        self.assertIsNotNone(sidebar_width_match, "Sidebar should have percentage width")
        self.assertIsNotNone(main_width_match, "Main should have percentage width")

        sidebar_width = int(sidebar_width_match.group(1))
        main_width = int(main_width_match.group(1))

        # Sum should equal 100%
        total_width = sidebar_width + main_width
        self.assertEqual(total_width, 100,
                        f"Sidebar ({sidebar_width}%) + Main ({main_width}%) should sum to 100%")


class TestMainScreenResizeCapability(unittest.TestCase):
    """Test MainScreen panel resize capabilities."""

    def test_main_screen_has_on_resize_method(self):
        """Test that MainScreen has on_resize handler for responsive behavior."""
        from yoyo_tui.screens.main import MainScreen

        self.assertTrue(hasattr(MainScreen, 'on_resize'),
                       "MainScreen should have on_resize method for responsive layout")

    def test_responsive_behavior_hides_sidebar_below_80_columns(self):
        """Test that MainScreen hides sidebar when terminal width < 80 columns."""
        from yoyo_tui.screens.main import MainScreen
        import inspect

        # Check that on_resize method contains logic to hide sidebar
        source = inspect.getsource(MainScreen.on_resize)

        # Should check for small breakpoint
        self.assertTrue('BREAKPOINT_SMALL' in source or '80' in source or 'sidebar' in source,
                       "on_resize should handle sidebar visibility based on terminal width")

    def test_main_screen_defines_breakpoint_constants(self):
        """Test that MainScreen defines responsive breakpoint constants."""
        from yoyo_tui.screens.main import MainScreen

        # Should define breakpoint constants
        self.assertTrue(hasattr(MainScreen, 'BREAKPOINT_SMALL'),
                       "MainScreen should define BREAKPOINT_SMALL constant")

        # BREAKPOINT_SMALL should be 79 or 80 (hide sidebar below 80 columns)
        breakpoint_small = getattr(MainScreen, 'BREAKPOINT_SMALL', None)
        self.assertIsNotNone(breakpoint_small)
        self.assertIn(breakpoint_small, [79, 80],
                     "BREAKPOINT_SMALL should be 79 or 80 columns")


class TestMainScreenMinimumWidthConstraints(unittest.TestCase):
    """Test MainScreen minimum width constraints."""

    def test_minimum_terminal_width_constant(self):
        """Test that MainScreen defines minimum terminal width."""
        from yoyo_tui.screens.main import MainScreen

        self.assertTrue(hasattr(MainScreen, 'MIN_WIDTH'),
                       "MainScreen should define MIN_WIDTH constant")

        # With 50/50 split and 40 column minimum each, minimum total should be 80
        min_width = getattr(MainScreen, 'MIN_WIDTH', None)
        self.assertIsNotNone(min_width)
        self.assertGreaterEqual(min_width, 80,
                               "MIN_WIDTH should be at least 80 (40 cols each for 50/50 split)")

    def test_check_terminal_size_method_exists(self):
        """Test that MainScreen has method to check terminal size."""
        from yoyo_tui.screens.main import MainScreen

        self.assertTrue(hasattr(MainScreen, 'check_terminal_size'),
                       "MainScreen should have check_terminal_size method")

    def test_terminal_size_warning_for_narrow_terminal(self):
        """Test that MainScreen warns when terminal is too narrow."""
        from yoyo_tui.screens.main import MainScreen
        import inspect

        # Check that check_terminal_size contains logic to check width
        source = inspect.getsource(MainScreen.check_terminal_size)

        # Should check for minimum width and notify user
        self.assertTrue('width' in source.lower() and 'MIN_WIDTH' in source,
                       "check_terminal_size should verify terminal width against MIN_WIDTH")


class TestMainScreenLayoutStructure(unittest.TestCase):
    """Test MainScreen layout structure and composition."""

    def test_layout_uses_horizontal_container(self):
        """Test that MainScreen uses Horizontal container for side-by-side layout."""
        from yoyo_tui.screens.main import MainScreen
        import inspect

        source = inspect.getsource(MainScreen.compose)

        # Should use Horizontal container for sidebar + main layout
        self.assertIn('Horizontal', source,
                     "MainScreen should use Horizontal container for side-by-side layout")

    def test_sidebar_and_main_are_vertical_containers(self):
        """Test that sidebar and main are Vertical containers."""
        from yoyo_tui.screens.main import MainScreen
        import inspect

        source = inspect.getsource(MainScreen.compose)

        # Should use Vertical containers for sidebar and main
        self.assertIn('Vertical', source,
                     "MainScreen should use Vertical containers for sidebar and main")

    def test_sidebar_has_id_attribute(self):
        """Test that sidebar has id='sidebar' for CSS targeting."""
        from yoyo_tui.screens.main import MainScreen
        import inspect

        source = inspect.getsource(MainScreen.compose)

        # Sidebar should have id="sidebar"
        self.assertIn('id="sidebar"', source,
                     "Sidebar container should have id='sidebar' for CSS styling")

    def test_main_has_id_attribute(self):
        """Test that main content has id='main' for CSS targeting."""
        from yoyo_tui.screens.main import MainScreen
        import inspect

        source = inspect.getsource(MainScreen.compose)

        # Main should have id="main"
        self.assertIn('id="main"', source,
                     "Main container should have id='main' for CSS styling")


class TestCSSLayoutIntegration(unittest.TestCase):
    """Test CSS-based layout implementation."""

    def test_css_uses_percentage_widths(self):
        """Test that CSS uses percentage-based widths (not fixed widths)."""
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = css_path.read_text()

        # Find sidebar and main blocks
        sidebar_section_start = content.find('#sidebar {')
        sidebar_section_end = content.find('}', sidebar_section_start)
        sidebar_section = content[sidebar_section_start:sidebar_section_end]

        main_section_start = content.find('#main {')
        main_section_end = content.find('}', main_section_start)
        main_section = content[main_section_start:main_section_end]

        # Both should use percentage widths, not fixed widths
        self.assertIn('%', sidebar_section,
                     "Sidebar should use percentage width for responsive layout")
        self.assertIn('%', main_section,
                     "Main should use percentage width for responsive layout")

    def test_css_includes_layout_containers(self):
        """Test that CSS includes styles for layout containers."""
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = css_path.read_text()

        # Should include sidebar and main container styles
        self.assertIn('#sidebar', content, "CSS should include #sidebar styles")
        self.assertIn('#main', content, "CSS should include #main styles")

    def test_css_sidebar_has_border(self):
        """Test that sidebar has visual border to separate from main content."""
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = css_path.read_text()

        # Find sidebar section
        sidebar_section_start = content.find('#sidebar {')
        sidebar_section_end = content.find('}', sidebar_section_start)
        sidebar_section = content[sidebar_section_start:sidebar_section_end]

        # Sidebar should have a border (right border to separate from main)
        self.assertTrue('border' in sidebar_section.lower(),
                       "Sidebar should have border for visual separation")


if __name__ == '__main__':
    unittest.main()
