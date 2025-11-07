"""
Tests for split view manager TUI pane module reference bug.

This test file reproduces the bug where the TUI pane references
a non-existent module (lib.yoyo_tui_v3.main instead of lib.yoyo_tui_v3.cli).
"""

import pytest
import inspect


class TestTUIPaneModuleReference:
    """Test that TUI pane references the correct module."""

    def test_manager_source_uses_correct_module(self):
        """
        Verify the manager source code uses lib.yoyo_tui_v3.cli (not .main).

        This test reads the actual source code of the manager to check
        the module path, reproducing the bug without needing complex mocks.
        """
        from lib.yoyo_tui_v3.split_view.manager import SplitViewManager

        # Get the source code of the _create_panes method
        source = inspect.getsource(SplitViewManager._create_panes)

        # The bug: manager references lib.yoyo_tui_v3.main
        assert 'lib.yoyo_tui_v3.main' not in source, \
            "Manager should NOT reference non-existent lib.yoyo_tui_v3.main module"

        # The fix: should reference lib.yoyo_tui_v3.cli
        assert 'lib.yoyo_tui_v3.cli' in source, \
            "Manager should reference lib.yoyo_tui_v3.cli module"

    def test_manager_source_includes_no_split_flag(self):
        """
        Verify the TUI pane command includes --no-split flag.

        Without this flag, launching the TUI pane would attempt to create
        another split view, causing infinite recursion.
        """
        from lib.yoyo_tui_v3.split_view.manager import SplitViewManager

        # Get the source code of the _create_panes method
        source = inspect.getsource(SplitViewManager._create_panes)

        # Should include --no-split flag to prevent recursive split view
        assert '--no-split' in source, \
            "TUI pane command should include --no-split flag to prevent recursion"


class TestModuleImportability:
    """Test that the correct module exists and the incorrect one doesn't."""

    def test_cli_module_exists(self):
        """The lib.yoyo_tui_v3.cli module should exist and be importable."""
        try:
            import lib.yoyo_tui_v3.cli
            assert hasattr(lib.yoyo_tui_v3.cli, 'main'), \
                "CLI module should have main() function"
        except ImportError as e:
            pytest.fail(f"lib.yoyo_tui_v3.cli should be importable: {e}")

    def test_main_module_does_not_exist(self):
        """The lib.yoyo_tui_v3.main module should NOT exist (this is the bug)."""
        with pytest.raises(ImportError, match="No module named 'lib.yoyo_tui_v3.main'"):
            import lib.yoyo_tui_v3.main

    def test_cli_module_runnable_as_module(self):
        """The CLI module should be executable with python -m."""
        import subprocess
        import sys

        # Run with --help to avoid needing a real TTY
        result = subprocess.run(
            [sys.executable, '-m', 'lib.yoyo_tui_v3.cli', '--help'],
            capture_output=True,
            cwd='/home/yoga999/PROJECTS/yoyo-dev',
            timeout=5
        )

        # Should not raise ModuleNotFoundError
        assert result.returncode == 0, \
            f"CLI module should be runnable. stderr: {result.stderr.decode()}"

        # Help output should mention split view options
        stdout = result.stdout.decode()
        assert '--no-split' in stdout or 'usage' in stdout.lower(), \
            "Help should show available options"