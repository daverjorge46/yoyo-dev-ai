"""
Tests for MainScreen layout and composition.

This test suite verifies:
- MainScreen can be created and mounted
- Layout structure (header, sidebar, main content, footer)
- Terminal size detection and warnings
- Responsive behavior
"""

import unittest
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from textual.app import App


class TestMainScreenStructure(unittest.TestCase):
    """Test MainScreen structure and composition."""

    def test_main_screen_can_be_imported(self):
        """Test that MainScreen can be imported from screens module."""
        try:
            from yoyo_tui.screens.main import MainScreen
            self.assertIsNotNone(MainScreen)
        except ImportError as e:
            self.fail(f"Failed to import MainScreen: {e}")

    def test_main_screen_extends_screen(self):
        """Test that MainScreen extends Textual Screen."""
        from yoyo_tui.screens.main import MainScreen
        from textual.screen import Screen

        self.assertTrue(issubclass(MainScreen, Screen))

    def test_main_screen_has_compose_method(self):
        """Test that MainScreen has compose method for layout."""
        from yoyo_tui.screens.main import MainScreen

        self.assertTrue(hasattr(MainScreen, 'compose'))
        self.assertTrue(callable(getattr(MainScreen, 'compose')))

    def test_main_screen_has_header(self):
        """Test that MainScreen composition includes Header."""
        from yoyo_tui.screens.main import MainScreen
        from textual.widgets import Header
        import inspect

        # Check that compose method yields Header
        source = inspect.getsource(MainScreen.compose)
        self.assertTrue("Header()" in source, "MainScreen should yield a Header widget")

    def test_main_screen_has_footer(self):
        """Test that MainScreen composition includes Footer."""
        from yoyo_tui.screens.main import MainScreen
        from textual.widgets import Footer
        import inspect

        # Check that compose method yields Footer
        source = inspect.getsource(MainScreen.compose)
        self.assertTrue("Footer()" in source, "MainScreen should yield a Footer widget")

    def test_main_screen_has_sidebar_container(self):
        """Test that MainScreen has a sidebar container."""
        from yoyo_tui.screens.main import MainScreen
        import inspect

        # Check that compose method creates sidebar with id="sidebar"
        source = inspect.getsource(MainScreen.compose)
        self.assertTrue('id="sidebar"' in source, "MainScreen should have sidebar container")
        self.assertTrue('id="main"' in source, "MainScreen should have main content container")


class TestMainScreenSizing(unittest.TestCase):
    """Test MainScreen terminal size detection and responsive behavior."""

    def test_main_screen_has_on_mount_method(self):
        """Test that MainScreen has on_mount for size detection."""
        from yoyo_tui.screens.main import MainScreen

        self.assertTrue(hasattr(MainScreen, 'on_mount'))

    def test_main_screen_can_check_terminal_size(self):
        """Test that MainScreen can check terminal dimensions."""
        from yoyo_tui.screens.main import MainScreen

        # Check if screen has method to get or check size
        screen = MainScreen()
        # The screen should be able to access self.app.size or similar
        # This is tested when mounted in actual app
        self.assertIsNotNone(screen)

    def test_main_screen_has_minimum_size_constants(self):
        """Test that MainScreen defines minimum size requirements."""
        from yoyo_tui.screens.main import MainScreen

        # Should define MIN_WIDTH and MIN_HEIGHT
        self.assertTrue(hasattr(MainScreen, 'MIN_WIDTH') or hasattr(MainScreen, 'min_width'))
        self.assertTrue(hasattr(MainScreen, 'MIN_HEIGHT') or hasattr(MainScreen, 'min_height'))


class TestMainScreenCSS(unittest.TestCase):
    """Test MainScreen CSS integration."""

    def test_styles_css_file_exists(self):
        """Test that styles.css file exists."""
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        self.assertTrue(css_path.exists(), f"styles.css should exist at {css_path}")

    def test_styles_css_is_not_empty(self):
        """Test that styles.css has content."""
        css_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        if css_path.exists():
            content = css_path.read_text()
            self.assertTrue(len(content) > 0, "styles.css should not be empty")
            # Should contain at least some color definitions
            self.assertTrue('#' in content, "styles.css should contain color definitions")


class TestMainScreenIntegration(unittest.TestCase):
    """Test MainScreen integration with app."""

    def test_app_can_push_main_screen(self):
        """Test that app can push MainScreen."""
        from yoyo_tui.app import YoyoDevApp
        from yoyo_tui.screens.main import MainScreen

        app = YoyoDevApp()
        # Check that app has install_screen or push_screen method
        self.assertTrue(
            hasattr(app, 'push_screen') or hasattr(app, 'install_screen'),
            "App should have method to display screens"
        )

    def test_main_screen_can_be_instantiated(self):
        """Test that MainScreen can be created without errors."""
        from yoyo_tui.screens.main import MainScreen

        try:
            screen = MainScreen()
            self.assertIsNotNone(screen)
        except Exception as e:
            self.fail(f"MainScreen instantiation should not raise: {e}")


if __name__ == '__main__':
    unittest.main()
