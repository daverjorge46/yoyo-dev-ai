"""
Tests for TUI widgets (TaskTree and ProgressPanel).

This test suite verifies:
- TaskTree widget structure and rendering
- ProgressPanel widget display and progress calculation
- Integration with data models
"""

import unittest
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestTaskTreeWidget(unittest.TestCase):
    """Test TaskTree widget functionality."""

    def test_task_tree_can_be_imported(self):
        """Test that TaskTree can be imported from widgets module."""
        try:
            from yoyo_tui.widgets.task_tree import TaskTree
            self.assertIsNotNone(TaskTree)
        except ImportError as e:
            self.fail(f"Failed to import TaskTree: {e}")

    def test_task_tree_extends_widget(self):
        """Test that TaskTree extends Textual Widget."""
        from yoyo_tui.widgets.task_tree import TaskTree
        from textual.widget import Widget

        self.assertTrue(issubclass(TaskTree, Widget))

    def test_task_tree_has_compose_method(self):
        """Test that TaskTree has compose method for rendering."""
        from yoyo_tui.widgets.task_tree import TaskTree

        self.assertTrue(hasattr(TaskTree, 'compose'))
        self.assertTrue(callable(getattr(TaskTree, 'compose')))

    def test_task_tree_can_be_instantiated(self):
        """Test that TaskTree can be created without errors."""
        from yoyo_tui.widgets.task_tree import TaskTree

        try:
            tree = TaskTree()
            self.assertIsNotNone(tree)
        except Exception as e:
            self.fail(f"TaskTree instantiation should not raise: {e}")

    def test_task_tree_accepts_task_data(self):
        """Test that TaskTree can accept TaskData."""
        from yoyo_tui.widgets.task_tree import TaskTree
        from yoyo_tui.models import TaskData

        # Create empty task data
        task_data = TaskData.empty()

        try:
            tree = TaskTree(task_data=task_data)
            self.assertIsNotNone(tree)
        except Exception as e:
            self.fail(f"TaskTree should accept TaskData: {e}")

    def test_task_tree_has_load_tasks_method(self):
        """Test that TaskTree has method to load task data."""
        from yoyo_tui.widgets.task_tree import TaskTree

        self.assertTrue(
            hasattr(TaskTree, 'load_tasks') or hasattr(TaskTree, 'update_tasks'),
            "TaskTree should have method to load/update tasks"
        )


class TestProgressPanelWidget(unittest.TestCase):
    """Test ProgressPanel widget functionality."""

    def test_progress_panel_can_be_imported(self):
        """Test that ProgressPanel can be imported from widgets module."""
        try:
            from yoyo_tui.widgets.progress_panel import ProgressPanel
            self.assertIsNotNone(ProgressPanel)
        except ImportError as e:
            self.fail(f"Failed to import ProgressPanel: {e}")

    def test_progress_panel_extends_widget(self):
        """Test that ProgressPanel extends Textual Widget."""
        from yoyo_tui.widgets.progress_panel import ProgressPanel
        from textual.widget import Widget

        self.assertTrue(issubclass(ProgressPanel, Widget))

    def test_progress_panel_has_compose_method(self):
        """Test that ProgressPanel has compose method for rendering."""
        from yoyo_tui.widgets.progress_panel import ProgressPanel

        self.assertTrue(hasattr(ProgressPanel, 'compose'))
        self.assertTrue(callable(getattr(ProgressPanel, 'compose')))

    def test_progress_panel_can_be_instantiated(self):
        """Test that ProgressPanel can be created without errors."""
        from yoyo_tui.widgets.progress_panel import ProgressPanel

        try:
            panel = ProgressPanel()
            self.assertIsNotNone(panel)
        except Exception as e:
            self.fail(f"ProgressPanel instantiation should not raise: {e}")

    def test_progress_panel_accepts_task_data(self):
        """Test that ProgressPanel can accept TaskData."""
        from yoyo_tui.widgets.progress_panel import ProgressPanel
        from yoyo_tui.models import TaskData

        # Create empty task data
        task_data = TaskData.empty()

        try:
            panel = ProgressPanel(task_data=task_data)
            self.assertIsNotNone(panel)
        except Exception as e:
            self.fail(f"ProgressPanel should accept TaskData: {e}")

    def test_progress_panel_has_update_method(self):
        """Test that ProgressPanel has method to update data."""
        from yoyo_tui.widgets.progress_panel import ProgressPanel

        self.assertTrue(
            hasattr(ProgressPanel, 'update_data') or hasattr(ProgressPanel, 'update_progress'),
            "ProgressPanel should have method to update progress"
        )


class TestWidgetsPackage(unittest.TestCase):
    """Test widgets package structure."""

    def test_widgets_package_exists(self):
        """Test that widgets package directory exists."""
        widgets_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'widgets'
        self.assertTrue(widgets_path.exists(), "widgets package should exist")
        self.assertTrue(widgets_path.is_dir(), "widgets should be a directory")

    def test_widgets_init_exists(self):
        """Test that widgets/__init__.py exists."""
        init_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'widgets' / '__init__.py'
        self.assertTrue(init_path.exists(), "widgets/__init__.py should exist")

    def test_widgets_can_be_imported(self):
        """Test that widgets package can be imported."""
        try:
            import yoyo_tui.widgets
            self.assertIsNotNone(yoyo_tui.widgets)
        except ImportError as e:
            self.fail(f"Failed to import widgets package: {e}")

    def test_widgets_exports_task_tree(self):
        """Test that TaskTree is exported from widgets package."""
        try:
            from yoyo_tui.widgets import TaskTree
            self.assertIsNotNone(TaskTree)
        except ImportError as e:
            self.fail(f"TaskTree should be exported from widgets: {e}")

    def test_widgets_exports_progress_panel(self):
        """Test that ProgressPanel is exported from widgets package."""
        try:
            from yoyo_tui.widgets import ProgressPanel
            self.assertIsNotNone(ProgressPanel)
        except ImportError as e:
            self.fail(f"ProgressPanel should be exported from widgets: {e}")


if __name__ == '__main__':
    unittest.main()
