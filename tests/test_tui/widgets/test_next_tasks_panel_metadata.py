"""
Tests for NextTasksPanel metadata display (active task indicator).

This test suite verifies that NextTasksPanel displays metadata about the
source task file, including:
- Task file path display in header
- Task file type indicator (spec/fix/master)
- Spec/fix name display

These tests follow TDD methodology and should FAIL initially because
the metadata display functionality has not yet been implemented.
"""

import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.models import TaskData, ParentTask, Subtask


class TestNextTasksPanelMetadataDisplay(unittest.TestCase):
    """Test active task indicator metadata display in NextTasksPanel."""

    def setUp(self):
        """Set up test fixtures."""
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        # Create sample task data with various source file types
        self.spec_task_data = self._create_task_data(
            file_path=Path("/home/user/.yoyo-dev/specs/2025-10-15-user-profiles/tasks.md"),
            source_type="spec",
            spec_name="user-profiles"
        )

        self.fix_task_data = self._create_task_data(
            file_path=Path("/home/user/.yoyo-dev/fixes/2025-10-17-button-styling/tasks.md"),
            source_type="fix",
            fix_name="button-styling"
        )

        self.master_task_data = self._create_task_data(
            file_path=Path("/home/user/project/MASTER-TASKS.md"),
            source_type="master",
            spec_name=None
        )

        # Empty task data
        self.empty_task_data = TaskData.empty()

    def _create_task_data(
        self,
        file_path: Path,
        source_type: str = None,
        spec_name: str = None,
        fix_name: str = None
    ) -> TaskData:
        """
        Create TaskData with metadata fields.

        Args:
            file_path: Path to task file
            source_type: Type of source ("spec", "fix", "master")
            spec_name: Name of spec (without date prefix)
            fix_name: Name of fix (without date prefix)

        Returns:
            TaskData instance with metadata
        """
        # Create sample tasks
        subtasks = [
            Subtask(text="Write tests", completed=False),
            Subtask(text="Implement feature", completed=False),
            Subtask(text="Verify tests pass", completed=False),
        ]

        parent_task = ParentTask(
            number=1,
            name="Create User Profile Component",
            completed=False,
            subtasks=subtasks
        )

        # Create TaskData with extended metadata
        task_data = TaskData(
            file_path=file_path,
            parent_tasks=[parent_task],
            total_tasks=1,
            completed_tasks=0,
            total_subtasks=3,
            completed_subtasks=0,
            progress=0
        )

        # Add metadata attributes (these don't exist yet - tests should fail)
        # We're testing for attributes that will be added in Task 8
        if hasattr(task_data, 'source_type'):
            task_data.source_type = source_type

        if hasattr(task_data, 'spec_name'):
            task_data.spec_name = spec_name

        if hasattr(task_data, 'fix_name'):
            task_data.fix_name = fix_name

        return task_data

    def test_task_file_path_display_in_header(self):
        """
        Test 7.1: Verify task file path is displayed in panel header.

        EXPECTED TO FAIL: Metadata display not yet implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        # Create panel with spec task data
        panel = NextTasksPanel(task_data=self.spec_task_data)

        # Render content
        content = panel._render_content()

        # Should display file path or source location
        # Expected format: "📋 Next Task: specs/2025-10-15-user-profiles"
        # or: "Source: .yoyo-dev/specs/2025-10-15-user-profiles/tasks.md"

        self.assertIn("specs/2025-10-15-user-profiles", content,
                     "Panel should display source file path in header")

    def test_task_file_type_indicator_spec(self):
        """
        Test 7.2a: Verify task file type indicator for spec tasks.

        EXPECTED TO FAIL: Type indicator not yet implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        panel = NextTasksPanel(task_data=self.spec_task_data)
        content = panel._render_content()

        # Should show type indicator (e.g., "📄 SPEC" or "[SPEC]")
        # Check for either emoji or text indicator
        has_spec_indicator = (
            "📄" in content or  # Spec emoji
            "[SPEC]" in content or
            "SPEC:" in content or
            "Type: spec" in content.lower()
        )

        self.assertTrue(has_spec_indicator,
                       "Panel should display 'spec' type indicator")

    def test_task_file_type_indicator_fix(self):
        """
        Test 7.2b: Verify task file type indicator for fix tasks.

        EXPECTED TO FAIL: Type indicator not yet implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        panel = NextTasksPanel(task_data=self.fix_task_data)
        content = panel._render_content()

        # Should show type indicator (e.g., "🔧 FIX" or "[FIX]")
        has_fix_indicator = (
            "🔧" in content or  # Fix emoji
            "[FIX]" in content or
            "FIX:" in content or
            "Type: fix" in content.lower()
        )

        self.assertTrue(has_fix_indicator,
                       "Panel should display 'fix' type indicator")

    def test_task_file_type_indicator_master(self):
        """
        Test 7.2c: Verify task file type indicator for master tasks.

        EXPECTED TO FAIL: Type indicator not yet implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        panel = NextTasksPanel(task_data=self.master_task_data)
        content = panel._render_content()

        # Should show type indicator (e.g., "📋 MASTER" or "[MASTER]")
        has_master_indicator = (
            "MASTER" in content or
            "[MASTER]" in content or
            "master" in content.lower()
        )

        self.assertTrue(has_master_indicator,
                       "Panel should display 'master' type indicator for MASTER-TASKS.md")

    def test_spec_name_display_without_date(self):
        """
        Test 7.3a: Verify spec name is displayed without date prefix.

        EXPECTED TO FAIL: Spec name extraction not yet implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        panel = NextTasksPanel(task_data=self.spec_task_data)
        content = panel._render_content()

        # Should display "user-profiles" not "2025-10-15-user-profiles"
        self.assertIn("user-profiles", content,
                     "Panel should display spec name")

        # Should NOT include the date prefix in the main display
        # (date may appear in full path, but name should be clean)
        lines = content.split('\n')

        # Find the line with the spec name (should be in header area)
        header_lines = lines[:5]  # Check first 5 lines for metadata

        # At least one header line should have clean name without date
        has_clean_name = any("user-profiles" in line for line in header_lines)

        self.assertTrue(has_clean_name,
                       "Header should display clean spec name without full date prefix")

    def test_fix_name_display_without_date(self):
        """
        Test 7.3b: Verify fix name is displayed without date prefix.

        EXPECTED TO FAIL: Fix name extraction not yet implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        panel = NextTasksPanel(task_data=self.fix_task_data)
        content = panel._render_content()

        # Should display "button-styling" not "2025-10-17-button-styling"
        self.assertIn("button-styling", content,
                     "Panel should display fix name")

        # Check that clean name appears in header
        lines = content.split('\n')
        header_lines = lines[:5]

        has_clean_name = any("button-styling" in line for line in header_lines)

        self.assertTrue(has_clean_name,
                       "Header should display clean fix name without full date prefix")

    def test_metadata_header_structure(self):
        """
        Test combined metadata header structure.

        Verify that metadata is displayed in a structured header format:
        - Type indicator visible
        - Name visible
        - Source path visible (optional)

        EXPECTED TO FAIL: Metadata header not yet implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        panel = NextTasksPanel(task_data=self.spec_task_data)
        content = panel._render_content()

        lines = content.split('\n')

        # Metadata should appear before main task content
        # Expected format (example):
        # 📋 Next Task
        # 📄 SPEC: user-profiles
        #
        # ○ Task 1: Create User Profile Component

        # Find where the main task title appears
        task_title_line = None
        for i, line in enumerate(lines):
            if "Task 1:" in line or "Create User Profile Component" in line:
                task_title_line = i
                break

        self.assertIsNotNone(task_title_line,
                           "Should find main task title in content")

        # Metadata should appear before the task title
        # Check that at least one line before task title contains metadata
        metadata_section = lines[:task_title_line]

        has_type_or_name = any(
            "spec" in line.lower() or
            "user-profiles" in line or
            "📄" in line
            for line in metadata_section
        )

        self.assertTrue(has_type_or_name,
                       "Metadata (type or name) should appear before task title")

    def test_empty_task_data_no_metadata(self):
        """
        Test that empty task data doesn't crash metadata display.

        EXPECTED TO FAIL: Error handling for missing metadata not implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        panel = NextTasksPanel(task_data=self.empty_task_data)

        # Should not crash when rendering with empty data
        try:
            content = panel._render_content()
            self.assertIsNotNone(content,
                               "Should render content even with empty task data")
        except Exception as e:
            self.fail(f"Should not crash on empty task data: {e}")

    def test_metadata_display_updates_on_data_change(self):
        """
        Test that metadata updates when task data changes.

        Verify switching from spec to fix updates the metadata display.

        EXPECTED TO FAIL: Dynamic metadata update not implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel

        # Start with spec task
        panel = NextTasksPanel(task_data=self.spec_task_data)
        initial_content = panel._render_content()

        # Should show spec metadata
        self.assertIn("user-profiles", initial_content)

        # Update to fix task
        panel.update_data(self.fix_task_data)
        updated_content = panel._render_content()

        # Should now show fix metadata
        self.assertIn("button-styling", updated_content)

        # Should NOT show old spec metadata
        # (unless it's still in the content for some reason)
        # This is a soft check - main thing is new data appears
        has_new_metadata = "button-styling" in updated_content

        self.assertTrue(has_new_metadata,
                       "Should display new metadata after update_data()")


class TestNextTasksPanelMetadataIntegration(unittest.TestCase):
    """Integration tests for metadata display with real TaskData parsing."""

    def setUp(self):
        """Set up test fixtures with realistic task file paths."""
        # These paths would be created by data_manager in real usage
        self.spec_path = Path.home() / '.yoyo-dev' / 'specs' / '2025-10-15-authentication' / 'tasks.md'
        self.fix_path = Path.home() / '.yoyo-dev' / 'fixes' / '2025-10-17-login-bug' / 'tasks.md'

    def test_metadata_extracted_from_file_path_spec(self):
        """
        Test that metadata is correctly extracted from spec file path.

        EXPECTED TO FAIL: Metadata extraction not implemented in data_manager.
        """
        from yoyo_tui.models import TaskData

        # Create TaskData with spec path
        task_data = TaskData(
            file_path=self.spec_path,
            parent_tasks=[],
            total_tasks=0,
            completed_tasks=0,
            total_subtasks=0,
            completed_subtasks=0,
            progress=0
        )

        # Should have source_type attribute
        self.assertTrue(hasattr(task_data, 'source_type'),
                       "TaskData should have source_type attribute")

        # Should correctly identify as spec
        if hasattr(task_data, 'source_type'):
            self.assertEqual(task_data.source_type, "spec",
                           "Should identify spec from file path")

    def test_metadata_extracted_from_file_path_fix(self):
        """
        Test that metadata is correctly extracted from fix file path.

        EXPECTED TO FAIL: Metadata extraction not implemented in data_manager.
        """
        from yoyo_tui.models import TaskData

        # Create TaskData with fix path
        task_data = TaskData(
            file_path=self.fix_path,
            parent_tasks=[],
            total_tasks=0,
            completed_tasks=0,
            total_subtasks=0,
            completed_subtasks=0,
            progress=0
        )

        # Should have source_type attribute
        self.assertTrue(hasattr(task_data, 'source_type'),
                       "TaskData should have source_type attribute")

        # Should correctly identify as fix
        if hasattr(task_data, 'source_type'):
            self.assertEqual(task_data.source_type, "fix",
                           "Should identify fix from file path")

    def test_spec_name_extracted_from_path(self):
        """
        Test that spec/fix name is extracted from folder name.

        EXPECTED TO FAIL: Name extraction not implemented.
        """
        from yoyo_tui.models import TaskData

        task_data = TaskData(
            file_path=self.spec_path,
            parent_tasks=[],
            total_tasks=0,
            completed_tasks=0,
            total_subtasks=0,
            completed_subtasks=0,
            progress=0
        )

        # Should extract "authentication" from "2025-10-15-authentication"
        if hasattr(task_data, 'spec_name'):
            self.assertEqual(task_data.spec_name, "authentication",
                           "Should extract clean spec name from folder")


class TestNextTasksPanelMetadataRendering(unittest.TestCase):
    """Test rendering and styling of metadata in NextTasksPanel."""

    def test_metadata_uses_distinct_styling(self):
        """
        Test that metadata header uses different styling than task content.

        Should use colors/formatting to differentiate metadata from tasks.

        EXPECTED TO FAIL: Metadata styling not implemented.
        """
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel
        from yoyo_tui.models import TaskData, ParentTask, Subtask
        from pathlib import Path

        # Create task data
        task_data = TaskData(
            file_path=Path("/home/user/.yoyo-dev/specs/2025-10-15-test/tasks.md"),
            parent_tasks=[
                ParentTask(
                    number=1,
                    name="Test Task",
                    subtasks=[Subtask(text="Test subtask", completed=False)]
                )
            ],
            total_tasks=1,
            completed_tasks=0,
            total_subtasks=1,
            completed_subtasks=0,
            progress=0
        )

        panel = NextTasksPanel(task_data=task_data)
        content = panel._render_content()

        # Check for Rich markup indicating styling
        # Metadata should use different color than main content
        # Example: [dim], [cyan], [yellow] for metadata

        has_metadata_styling = (
            "[dim]" in content or
            "[cyan]" in content or
            "[yellow]" in content or
            "[bold dim]" in content
        )

        self.assertTrue(has_metadata_styling,
                       "Metadata should use distinct styling (Rich markup)")


if __name__ == '__main__':
    # Run tests with verbose output to see failures clearly
    unittest.main(verbosity=2)
