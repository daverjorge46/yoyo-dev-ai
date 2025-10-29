"""
Tests for ProjectOverview widget path configuration bug.

Bug Description:
ProjectOverview widget uses Path.cwd() / '.yoyo-dev' / 'product' to locate
product context files. This fails when the TUI is launched from a subdirectory
because cwd is not the repository root.

Expected Behavior:
Widget should find the repository root (by searching for .git directory or
.yoyo-dev directory) and use that as the base path, not cwd.

Test Strategy:
1. Create a temporary project structure with .yoyo-dev/product/
2. Change cwd to a subdirectory
3. Create ProjectOverview widget with default path (no explicit path)
4. Verify that widget FAILS to find product context (bug reproduction)

After fix:
Widget should find product context even from subdirectories.
"""

import unittest
import tempfile
import os
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestProjectOverviewPathBug(unittest.TestCase):
    """Test ProjectOverview widget path configuration bug."""

    def setUp(self):
        """Create temporary project structure for testing."""
        # Create temp directory
        self.temp_dir = tempfile.mkdtemp()
        self.temp_path = Path(self.temp_dir)

        # Create project structure
        # project/
        #   .yoyo-dev/
        #     product/
        #       mission-lite.md
        #       tech-stack.md
        #   src/
        #     (this is where cwd will be)

        self.product_dir = self.temp_path / '.yoyo-dev' / 'product'
        self.product_dir.mkdir(parents=True, exist_ok=True)

        # Create mission-lite.md
        mission_file = self.product_dir / 'mission-lite.md'
        mission_file.write_text("# Test Project\n\nA test project for path validation.")

        # Create tech-stack.md
        tech_file = self.product_dir / 'tech-stack.md'
        tech_file.write_text("## Tech Stack\n\n- **Python**: Core language\n- **Textual**: TUI framework")

        # Create subdirectory
        self.subdir = self.temp_path / 'src'
        self.subdir.mkdir(exist_ok=True)

        # Save original cwd
        self.original_cwd = Path.cwd()

    def tearDown(self):
        """Restore original cwd and cleanup temp directory."""
        os.chdir(self.original_cwd)

        # Cleanup temp directory
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_path_resolution_from_repo_root(self):
        """Test that widget finds product context when cwd IS repo root."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Change to repo root
        os.chdir(self.temp_path)

        # Create widget without explicit path (uses default Path.cwd())
        widget = ProjectOverview()

        # Generate overview text
        overview_text = widget._generate_overview_text()

        # Should find product context successfully
        self.assertNotIn("No product context found", overview_text,
                        "Widget should find product context from repo root")
        self.assertIn("Test Project", overview_text,
                     "Widget should display project name from mission-lite.md")

    def test_path_resolution_from_subdirectory_FAILS(self):
        """
        Test that widget FAILS to find product context from subdirectory.

        This test documents the BUG. It should FAIL initially, proving the bug exists.
        After the fix, this test should be updated or removed.
        """
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Change to subdirectory (src/)
        os.chdir(self.subdir)

        # Verify cwd is NOT repo root
        self.assertEqual(Path.cwd(), self.subdir,
                        "cwd should be subdirectory for this test")

        # Create widget without explicit path (uses default Path.cwd())
        widget = ProjectOverview()

        # Generate overview text
        overview_text = widget._generate_overview_text()

        # BUG: Widget should find product context, but it won't because:
        # - widget.product_path = Path.cwd() / '.yoyo-dev' / 'product'
        # - Path.cwd() = /tmp/xxx/src
        # - Resolved path = /tmp/xxx/src/.yoyo-dev/product (WRONG!)
        # - Correct path = /tmp/xxx/.yoyo-dev/product

        # This assertion FAILS before fix (bug reproduction)
        self.assertIn("No product context found", overview_text,
                     "BUG: Widget fails to find product context from subdirectory")

        # Verify widget is looking in wrong location
        expected_wrong_path = self.subdir / '.yoyo-dev' / 'product'
        self.assertEqual(widget.product_path, expected_wrong_path,
                        "Widget uses cwd instead of repo root (BUG)")

        # Verify correct path exists but widget doesn't find it
        correct_path = self.temp_path / '.yoyo-dev' / 'product'
        self.assertTrue(correct_path.exists(),
                       "Correct product path exists at repo root")
        self.assertTrue((correct_path / 'mission-lite.md').exists(),
                       "mission-lite.md exists at correct location")

    def test_explicit_path_works_from_subdirectory(self):
        """Test that explicit product_path works correctly (workaround)."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Change to subdirectory
        os.chdir(self.subdir)

        # Create widget with EXPLICIT path (workaround for bug)
        explicit_path = self.temp_path / '.yoyo-dev' / 'product'
        widget = ProjectOverview(product_path=explicit_path)

        # Generate overview text
        overview_text = widget._generate_overview_text()

        # Should work with explicit path
        self.assertNotIn("No product context found", overview_text,
                        "Explicit path should work even from subdirectory")
        self.assertIn("Test Project", overview_text,
                     "Should display project name with explicit path")

    def test_product_path_attribute_set_correctly(self):
        """Test that product_path attribute is set based on cwd (current behavior)."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Test from repo root
        os.chdir(self.temp_path)
        widget_root = ProjectOverview()
        expected_root = self.temp_path / '.yoyo-dev' / 'product'
        self.assertEqual(widget_root.product_path, expected_root,
                        "product_path should be <cwd>/.yoyo-dev/product from root")

        # Test from subdirectory
        os.chdir(self.subdir)
        widget_subdir = ProjectOverview()
        expected_subdir = self.subdir / '.yoyo-dev' / 'product'
        self.assertEqual(widget_subdir.product_path, expected_subdir,
                        "product_path should be <cwd>/.yoyo-dev/product from subdir (BUG)")

        # Verify paths are different (proving cwd dependency)
        self.assertNotEqual(expected_root, expected_subdir,
                          "Paths differ based on cwd (this is the bug)")


class TestProjectOverviewExpectedBehaviorAfterFix(unittest.TestCase):
    """
    Tests for expected behavior AFTER fix is applied.

    These tests will FAIL initially (before fix) but should PASS after fix.
    """

    def setUp(self):
        """Create temporary project structure for testing."""
        self.temp_dir = tempfile.mkdtemp()
        self.temp_path = Path(self.temp_dir)

        # Create .yoyo-dev marker (indicates repo root)
        self.yoyo_dev_dir = self.temp_path / '.yoyo-dev'
        self.yoyo_dev_dir.mkdir(exist_ok=True)

        self.product_dir = self.yoyo_dev_dir / 'product'
        self.product_dir.mkdir(exist_ok=True)

        # Create mission-lite.md
        mission_file = self.product_dir / 'mission-lite.md'
        mission_file.write_text("# Test Project\n\nA test project for path validation.")

        # Create subdirectory
        self.subdir = self.temp_path / 'src' / 'components'
        self.subdir.mkdir(parents=True, exist_ok=True)

        # Save original cwd
        self.original_cwd = Path.cwd()

    def tearDown(self):
        """Restore original cwd and cleanup temp directory."""
        os.chdir(self.original_cwd)
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    @unittest.expectedFailure
    def test_find_repo_root_from_subdirectory(self):
        """
        Test that widget finds repo root from subdirectory (AFTER FIX).

        Expected behavior after fix:
        - Widget should search parent directories for .yoyo-dev/
        - Use found repo root as base path
        - Work correctly regardless of cwd

        This test is marked expectedFailure because it will fail before fix.
        """
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Change to deeply nested subdirectory
        os.chdir(self.subdir)

        # Create widget without explicit path
        widget = ProjectOverview()

        # After fix: widget should find repo root and use correct path
        expected_path = self.temp_path / '.yoyo-dev' / 'product'

        # This will fail before fix (widget.product_path uses cwd)
        self.assertEqual(widget.product_path, expected_path,
                        "Widget should find repo root from subdirectory")

        # Generate overview
        overview_text = widget._generate_overview_text()

        # Should find product context
        self.assertNotIn("No product context found", overview_text,
                        "Widget should find product context from any subdirectory")
        self.assertIn("Test Project", overview_text,
                     "Widget should display correct project name")


if __name__ == '__main__':
    unittest.main()
