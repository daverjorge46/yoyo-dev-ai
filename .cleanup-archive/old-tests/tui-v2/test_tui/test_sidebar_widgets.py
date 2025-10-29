"""
Tests for Sidebar widgets (ProjectOverview and ShortcutsPanel).

This test suite verifies:
- ProjectOverview widget structure and data display
- ShortcutsPanel widget display and dynamic shortcuts
"""

import unittest
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestProjectOverviewWidget(unittest.TestCase):
    """Test ProjectOverview widget functionality."""

    def test_project_overview_can_be_imported(self):
        """Test that ProjectOverview can be imported from widgets module."""
        try:
            from yoyo_tui.widgets.project_overview import ProjectOverview
            self.assertIsNotNone(ProjectOverview)
        except ImportError as e:
            self.fail(f"Failed to import ProjectOverview: {e}")

    def test_project_overview_extends_widget(self):
        """Test that ProjectOverview extends Textual Widget."""
        from yoyo_tui.widgets.project_overview import ProjectOverview
        from textual.widget import Widget

        self.assertTrue(issubclass(ProjectOverview, Widget))

    def test_project_overview_has_compose_method(self):
        """Test that ProjectOverview has compose method."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        self.assertTrue(hasattr(ProjectOverview, 'compose'))
        self.assertTrue(callable(getattr(ProjectOverview, 'compose')))

    def test_project_overview_can_be_instantiated(self):
        """Test that ProjectOverview can be created without errors."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        try:
            widget = ProjectOverview()
            self.assertIsNotNone(widget)
        except Exception as e:
            self.fail(f"ProjectOverview instantiation should not raise: {e}")

    def test_project_overview_has_load_context_method(self):
        """Test that ProjectOverview has method to load project context."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        self.assertTrue(
            hasattr(ProjectOverview, 'load_context') or hasattr(ProjectOverview, 'refresh'),
            "ProjectOverview should have method to load context"
        )


class TestShortcutsPanelWidget(unittest.TestCase):
    """Test ShortcutsPanel widget functionality."""

    def test_shortcuts_panel_can_be_imported(self):
        """Test that ShortcutsPanel can be imported from widgets module."""
        try:
            from yoyo_tui.widgets.shortcuts_panel import ShortcutsPanel
            self.assertIsNotNone(ShortcutsPanel)
        except ImportError as e:
            self.fail(f"Failed to import ShortcutsPanel: {e}")

    def test_shortcuts_panel_extends_widget(self):
        """Test that ShortcutsPanel extends Textual Widget."""
        from yoyo_tui.widgets.shortcuts_panel import ShortcutsPanel
        from textual.widget import Widget

        self.assertTrue(issubclass(ShortcutsPanel, Widget))

    def test_shortcuts_panel_has_compose_method(self):
        """Test that ShortcutsPanel has compose method."""
        from yoyo_tui.widgets.shortcuts_panel import ShortcutsPanel

        self.assertTrue(hasattr(ShortcutsPanel, 'compose'))
        self.assertTrue(callable(getattr(ShortcutsPanel, 'compose')))

    def test_shortcuts_panel_can_be_instantiated(self):
        """Test that ShortcutsPanel can be created without errors."""
        from yoyo_tui.widgets.shortcuts_panel import ShortcutsPanel

        try:
            widget = ShortcutsPanel()
            self.assertIsNotNone(widget)
        except Exception as e:
            self.fail(f"ShortcutsPanel instantiation should not raise: {e}")


class TestWidgetsPackageExports(unittest.TestCase):
    """Test that sidebar widgets are exported from package."""

    def test_widgets_exports_project_overview(self):
        """Test that ProjectOverview is exported from widgets package."""
        try:
            from yoyo_tui.widgets import ProjectOverview
            self.assertIsNotNone(ProjectOverview)
        except ImportError as e:
            self.fail(f"ProjectOverview should be exported from widgets: {e}")

    def test_widgets_exports_shortcuts_panel(self):
        """Test that ShortcutsPanel is exported from widgets package."""
        try:
            from yoyo_tui.widgets import ShortcutsPanel
            self.assertIsNotNone(ShortcutsPanel)
        except ImportError as e:
            self.fail(f"ShortcutsPanel should be exported from widgets: {e}")


if __name__ == '__main__':
    unittest.main()
