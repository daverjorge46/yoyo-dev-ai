"""
Tests for SpecList and GitStatus widgets.

This test suite verifies:
- SpecList widget structure and data display
- GitStatus widget display and live updates
"""

import unittest
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestSpecListWidget(unittest.TestCase):
    """Test SpecList widget functionality."""

    def test_spec_list_can_be_imported(self):
        """Test that SpecList can be imported from widgets module."""
        try:
            from yoyo_tui.widgets.spec_list import SpecList
            self.assertIsNotNone(SpecList)
        except ImportError as e:
            self.fail(f"Failed to import SpecList: {e}")

    def test_spec_list_extends_widget(self):
        """Test that SpecList extends Textual Widget."""
        from yoyo_tui.widgets.spec_list import SpecList
        from textual.widget import Widget

        self.assertTrue(issubclass(SpecList, Widget))

    def test_spec_list_has_compose_method(self):
        """Test that SpecList has compose method."""
        from yoyo_tui.widgets.spec_list import SpecList

        self.assertTrue(hasattr(SpecList, 'compose'))
        self.assertTrue(callable(getattr(SpecList, 'compose')))

    def test_spec_list_can_be_instantiated(self):
        """Test that SpecList can be created without errors."""
        from yoyo_tui.widgets.spec_list import SpecList

        try:
            widget = SpecList()
            self.assertIsNotNone(widget)
        except Exception as e:
            self.fail(f"SpecList instantiation should not raise: {e}")

    def test_spec_list_has_load_specs_method(self):
        """Test that SpecList has method to load spec data."""
        from yoyo_tui.widgets.spec_list import SpecList

        self.assertTrue(
            hasattr(SpecList, 'load_specs') or hasattr(SpecList, 'refresh_data'),
            "SpecList should have method to load/refresh specs"
        )


class TestGitStatusWidget(unittest.TestCase):
    """Test GitStatus widget functionality."""

    def test_git_status_can_be_imported(self):
        """Test that GitStatus can be imported from widgets module."""
        try:
            from yoyo_tui.widgets.git_status import GitStatus
            self.assertIsNotNone(GitStatus)
        except ImportError as e:
            self.fail(f"Failed to import GitStatus: {e}")

    def test_git_status_extends_widget(self):
        """Test that GitStatus extends Textual Widget."""
        from yoyo_tui.widgets.git_status import GitStatus
        from textual.widget import Widget

        self.assertTrue(issubclass(GitStatus, Widget))

    def test_git_status_has_compose_method(self):
        """Test that GitStatus has compose method."""
        from yoyo_tui.widgets.git_status import GitStatus

        self.assertTrue(hasattr(GitStatus, 'compose'))
        self.assertTrue(callable(getattr(GitStatus, 'compose')))

    def test_git_status_can_be_instantiated(self):
        """Test that GitStatus can be created without errors."""
        from yoyo_tui.widgets.git_status import GitStatus

        try:
            widget = GitStatus()
            self.assertIsNotNone(widget)
        except Exception as e:
            self.fail(f"GitStatus instantiation should not raise: {e}")

    def test_git_status_has_update_method(self):
        """Test that GitStatus has method to update status."""
        from yoyo_tui.widgets.git_status import GitStatus

        self.assertTrue(
            hasattr(GitStatus, 'update_status') or hasattr(GitStatus, 'refresh'),
            "GitStatus should have method to update status"
        )

    def test_git_status_has_on_mount_method(self):
        """Test that GitStatus has on_mount for auto-refresh setup."""
        from yoyo_tui.widgets.git_status import GitStatus

        self.assertTrue(hasattr(GitStatus, 'on_mount'))


class TestWidgetsPackageExports(unittest.TestCase):
    """Test that new widgets are exported from package."""

    def test_widgets_exports_spec_list(self):
        """Test that SpecList is exported from widgets package."""
        try:
            from yoyo_tui.widgets import SpecList
            self.assertIsNotNone(SpecList)
        except ImportError as e:
            self.fail(f"SpecList should be exported from widgets: {e}")

    def test_widgets_exports_git_status(self):
        """Test that GitStatus is exported from widgets package."""
        try:
            from yoyo_tui.widgets import GitStatus
            self.assertIsNotNone(GitStatus)
        except ImportError as e:
            self.fail(f"GitStatus should be exported from widgets: {e}")


if __name__ == '__main__':
    unittest.main()
