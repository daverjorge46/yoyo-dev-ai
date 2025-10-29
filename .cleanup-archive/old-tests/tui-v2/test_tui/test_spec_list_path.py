"""
Tests for SpecList widget path configuration bug.

Bug Description:
SpecList widget uses Path.cwd() / '.yoyo-dev' to locate specs and fixes
directories. This fails when the TUI is launched from a subdirectory because
cwd is not the repository root.

Expected Behavior:
Widget should find the repository root (by searching for .git directory or
.yoyo-dev directory) and use that as the base path, not cwd.

Test Strategy:
1. Create a temporary project structure with .yoyo-dev/specs/ and .yoyo-dev/fixes/
2. Change cwd to a subdirectory
3. Create SpecList widget with default path (no explicit path)
4. Verify that widget FAILS to find specs/fixes (bug reproduction)

After fix:
Widget should find specs/fixes even from subdirectories.
"""

import unittest
import tempfile
import os
import json
import asyncio
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestSpecListPathBug(unittest.TestCase):
    """Test SpecList widget path configuration bug."""

    def setUp(self):
        """Create temporary project structure for testing."""
        # Create temp directory
        self.temp_dir = tempfile.mkdtemp()
        self.temp_path = Path(self.temp_dir)

        # Create project structure
        # project/
        #   .yoyo-dev/
        #     specs/
        #       2025-10-17-test-spec/
        #         state.json
        #     fixes/
        #       2025-10-17-test-fix/
        #         state.json
        #   src/
        #     (this is where cwd will be)

        self.yoyo_dev_dir = self.temp_path / '.yoyo-dev'
        self.yoyo_dev_dir.mkdir(exist_ok=True)

        # Create specs directory with test spec
        self.specs_dir = self.yoyo_dev_dir / 'specs'
        self.specs_dir.mkdir(exist_ok=True)

        test_spec_dir = self.specs_dir / '2025-10-17-test-spec'
        test_spec_dir.mkdir(exist_ok=True)

        # Create state.json for spec
        state_file = test_spec_dir / 'state.json'
        state_data = {
            'completed_tasks': ['task1', 'task2'],
            'execution_started': True,
            'execution_completed': False
        }
        state_file.write_text(json.dumps(state_data))

        # Create fixes directory with test fix
        self.fixes_dir = self.yoyo_dev_dir / 'fixes'
        self.fixes_dir.mkdir(exist_ok=True)

        test_fix_dir = self.fixes_dir / '2025-10-17-test-fix'
        test_fix_dir.mkdir(exist_ok=True)

        # Create state.json for fix
        fix_state_file = test_fix_dir / 'state.json'
        fix_state_data = {
            'completed_tasks': ['fix1'],
            'execution_started': True,
            'execution_completed': False
        }
        fix_state_file.write_text(json.dumps(fix_state_data))

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
        """Test that widget finds specs/fixes when cwd IS repo root."""
        from yoyo_tui.widgets.spec_list import SpecList

        # Change to repo root
        os.chdir(self.temp_path)

        # Create widget without explicit path (uses default Path.cwd())
        widget = SpecList()

        # Verify yoyo_dev_path is set correctly
        expected_path = self.temp_path / '.yoyo-dev'
        self.assertEqual(widget.yoyo_dev_path, expected_path,
                        "yoyo_dev_path should be <cwd>/.yoyo-dev from repo root")

        # Load specs synchronously (testing the sync method directly)
        specs = widget._load_specs_sync()

        # Should find test spec
        self.assertGreater(len(specs), 0,
                          "Widget should find specs from repo root")
        self.assertEqual(specs[0]['name'], '2025-10-17-test-spec',
                        "Should find correct spec")

        # Load fixes synchronously
        fixes = widget._load_fixes_sync()

        # Should find test fix
        self.assertGreater(len(fixes), 0,
                          "Widget should find fixes from repo root")
        self.assertEqual(fixes[0]['name'], '2025-10-17-test-fix',
                        "Should find correct fix")

    def test_path_resolution_from_subdirectory_FAILS(self):
        """
        Test that widget FAILS to find specs/fixes from subdirectory.

        This test documents the BUG. It should FAIL initially, proving the bug exists.
        After the fix, this test should be updated or removed.
        """
        from yoyo_tui.widgets.spec_list import SpecList

        # Change to subdirectory (src/)
        os.chdir(self.subdir)

        # Verify cwd is NOT repo root
        self.assertEqual(Path.cwd(), self.subdir,
                        "cwd should be subdirectory for this test")

        # Create widget without explicit path (uses default Path.cwd())
        widget = SpecList()

        # BUG: Widget should find specs/fixes, but it won't because:
        # - widget.yoyo_dev_path = Path.cwd() / '.yoyo-dev'
        # - Path.cwd() = /tmp/xxx/src
        # - Resolved path = /tmp/xxx/src/.yoyo-dev (WRONG!)
        # - Correct path = /tmp/xxx/.yoyo-dev

        # Verify widget is looking in wrong location
        expected_wrong_path = self.subdir / '.yoyo-dev'
        self.assertEqual(widget.yoyo_dev_path, expected_wrong_path,
                        "Widget uses cwd instead of repo root (BUG)")

        # Load specs synchronously
        specs = widget._load_specs_sync()

        # BUG: Should be empty because looking in wrong directory
        self.assertEqual(len(specs), 0,
                        "BUG: Widget fails to find specs from subdirectory")

        # Load fixes synchronously
        fixes = widget._load_fixes_sync()

        # BUG: Should be empty because looking in wrong directory
        self.assertEqual(len(fixes), 0,
                        "BUG: Widget fails to find fixes from subdirectory")

        # Verify correct path exists but widget doesn't find it
        correct_yoyo_dev = self.temp_path / '.yoyo-dev'
        correct_specs_dir = correct_yoyo_dev / 'specs'
        correct_fixes_dir = correct_yoyo_dev / 'fixes'

        self.assertTrue(correct_yoyo_dev.exists(),
                       "Correct .yoyo-dev exists at repo root")
        self.assertTrue(correct_specs_dir.exists(),
                       "Correct specs directory exists at repo root")
        self.assertTrue(correct_fixes_dir.exists(),
                       "Correct fixes directory exists at repo root")

    def test_explicit_path_works_from_subdirectory(self):
        """Test that explicit yoyo_dev_path works correctly (workaround)."""
        from yoyo_tui.widgets.spec_list import SpecList

        # Change to subdirectory
        os.chdir(self.subdir)

        # Create widget with EXPLICIT path (workaround for bug)
        explicit_path = self.temp_path / '.yoyo-dev'
        widget = SpecList(yoyo_dev_path=explicit_path)

        # Load specs
        specs = widget._load_specs_sync()

        # Should work with explicit path
        self.assertGreater(len(specs), 0,
                          "Explicit path should work even from subdirectory")
        self.assertEqual(specs[0]['name'], '2025-10-17-test-spec',
                        "Should find correct spec with explicit path")

        # Load fixes
        fixes = widget._load_fixes_sync()

        # Should work with explicit path
        self.assertGreater(len(fixes), 0,
                          "Explicit path should work for fixes too")
        self.assertEqual(fixes[0]['name'], '2025-10-17-test-fix',
                        "Should find correct fix with explicit path")

    def test_yoyo_dev_path_attribute_set_correctly(self):
        """Test that yoyo_dev_path attribute is set based on cwd (current behavior)."""
        from yoyo_tui.widgets.spec_list import SpecList

        # Test from repo root
        os.chdir(self.temp_path)
        widget_root = SpecList()
        expected_root = self.temp_path / '.yoyo-dev'
        self.assertEqual(widget_root.yoyo_dev_path, expected_root,
                        "yoyo_dev_path should be <cwd>/.yoyo-dev from root")

        # Test from subdirectory
        os.chdir(self.subdir)
        widget_subdir = SpecList()
        expected_subdir = self.subdir / '.yoyo-dev'
        self.assertEqual(widget_subdir.yoyo_dev_path, expected_subdir,
                        "yoyo_dev_path should be <cwd>/.yoyo-dev from subdir (BUG)")

        # Verify paths are different (proving cwd dependency)
        self.assertNotEqual(expected_root, expected_subdir,
                          "Paths differ based on cwd (this is the bug)")


class TestSpecListExpectedBehaviorAfterFix(unittest.TestCase):
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

        # Create specs with test spec
        self.specs_dir = self.yoyo_dev_dir / 'specs'
        self.specs_dir.mkdir(exist_ok=True)

        test_spec_dir = self.specs_dir / '2025-10-17-test-spec'
        test_spec_dir.mkdir(exist_ok=True)

        state_file = test_spec_dir / 'state.json'
        state_data = {'completed_tasks': ['task1'], 'execution_started': True}
        state_file.write_text(json.dumps(state_data))

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
        from yoyo_tui.widgets.spec_list import SpecList

        # Change to deeply nested subdirectory
        os.chdir(self.subdir)

        # Create widget without explicit path
        widget = SpecList()

        # After fix: widget should find repo root and use correct path
        expected_path = self.temp_path / '.yoyo-dev'

        # This will fail before fix (widget.yoyo_dev_path uses cwd)
        self.assertEqual(widget.yoyo_dev_path, expected_path,
                        "Widget should find repo root from subdirectory")

        # Load specs
        specs = widget._load_specs_sync()

        # Should find specs
        self.assertGreater(len(specs), 0,
                          "Widget should find specs from any subdirectory")
        self.assertEqual(specs[0]['name'], '2025-10-17-test-spec',
                        "Widget should find correct specs")


if __name__ == '__main__':
    unittest.main()
