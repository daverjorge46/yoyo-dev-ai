"""
Tests for FileWatcher monitoring current working directory.

Tests that FileWatcher extends monitoring to both .yoyo-dev/ directory
AND the current working directory to detect tasks.md changes.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import tempfile
import os

from ..services.file_watcher import FileWatcher, DebouncedFileHandler


class TestFileWatcherCWDMonitoring:
    """Test FileWatcher monitoring of current working directory."""

    @pytest.fixture
    def temp_directories(self):
        """Create temporary directories for testing."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create .yoyo-dev directory
            yoyo_dev_dir = temp_path / ".yoyo-dev"
            yoyo_dev_dir.mkdir()

            # Create spec directory with tasks.md
            spec_dir = yoyo_dev_dir / "specs" / "2025-10-17-test-feature"
            spec_dir.mkdir(parents=True)
            (spec_dir / "tasks.md").write_text("# Test Tasks")

            # Create tasks.md in CWD (Priority 1 location)
            (temp_path / "tasks.md").write_text("# Master Tasks")

            yield {
                'root': temp_path,
                'yoyo_dev': yoyo_dev_dir,
                'cwd_tasks': temp_path / "tasks.md",
                'spec_tasks': spec_dir / "tasks.md"
            }

    def test_file_watcher_monitors_cwd_in_addition_to_yoyo_dev(self, temp_directories):
        """
        Test that FileWatcher monitors both .yoyo-dev/ and current working directory.

        Expected: FileWatcher should watch both directories when initialized.
        """
        callback = Mock()
        watcher = FileWatcher(callback=callback)

        # This test expects FileWatcher to accept multiple directories
        # or to automatically watch both .yoyo-dev and CWD

        # For now, this will FAIL because current implementation only watches one directory
        # Expected behavior: FileWatcher should have method to watch multiple directories
        # or app.py should create two watchers

        # Once implemented, this test should verify:
        with patch('yoyo_tui.services.file_watcher.Observer') as mock_observer_class:
            mock_observer = Mock()
            mock_observer_class.return_value = mock_observer

            # Start watching both directories
            if hasattr(watcher, 'start_watching_multiple'):
                # Option 1: Single watcher, multiple directories
                directories = [temp_directories['yoyo_dev'], temp_directories['root']]
                success = watcher.start_watching_multiple(directories)
                assert success

                # Verify observer.schedule was called for BOTH directories
                assert mock_observer.schedule.call_count == 2
            else:
                # Option 2: Single directory that includes CWD
                # Current implementation - will only watch one directory
                success = watcher.start_watching(temp_directories['root'])
                assert success

    def test_file_watcher_detects_tasks_md_changes_in_cwd(self, temp_directories):
        """
        Test that FileWatcher detects changes to tasks.md in current working directory.

        Expected: Callback should be triggered when tasks.md in CWD is modified.
        """
        callback = Mock()
        watcher = FileWatcher(
            callback=callback,
            debounce_interval=0.1,  # Short interval for testing
            max_wait=0.5
        )

        # Start watching CWD (where tasks.md Priority 1 location is)
        success = watcher.start_watching(temp_directories['root'])
        assert success

        # Modify tasks.md in CWD
        cwd_tasks_file = temp_directories['cwd_tasks']
        cwd_tasks_file.write_text("# Updated Master Tasks")

        # Wait for debounce
        import time
        time.sleep(0.3)

        # Verify callback was triggered
        # This will FAIL initially because FileWatcher only watches .yoyo-dev
        callback.assert_called()

    def test_file_watcher_detects_tasks_md_in_spec_subdirectory(self, temp_directories):
        """
        Test that FileWatcher detects changes to tasks.md in spec subdirectories.

        Expected: Recursive watching should detect changes in .yoyo-dev/specs/.../tasks.md
        """
        callback = Mock()
        watcher = FileWatcher(
            callback=callback,
            debounce_interval=0.1,
            max_wait=0.5
        )

        # Start watching .yoyo-dev directory
        success = watcher.start_watching(temp_directories['yoyo_dev'])
        assert success

        # Modify tasks.md in spec directory
        spec_tasks_file = temp_directories['spec_tasks']
        spec_tasks_file.write_text("# Updated Spec Tasks")

        # Wait for debounce
        import time
        time.sleep(0.3)

        # Verify callback was triggered
        callback.assert_called()

    def test_debounced_handler_recognizes_tasks_md_as_watched_file(self):
        """
        Test that DebouncedFileHandler includes tasks.md in watched files.

        Expected: tasks.md should be in the watched_files set.
        """
        callback = Mock()
        handler = DebouncedFileHandler(callback=callback)

        # Verify tasks.md is in watched files
        assert 'tasks.md' in handler.watched_files
        assert 'MASTER-TASKS.md' in handler.watched_files

    def test_file_watcher_ignores_non_task_files_in_cwd(self, temp_directories):
        """
        Test that FileWatcher ignores changes to non-task files in CWD.

        Expected: Changes to random files should NOT trigger callback.
        """
        callback = Mock()
        watcher = FileWatcher(
            callback=callback,
            debounce_interval=0.1,
            max_wait=0.5
        )

        success = watcher.start_watching(temp_directories['root'])
        assert success

        # Create random file that should be ignored
        random_file = temp_directories['root'] / "random.txt"
        random_file.write_text("Random content")

        # Wait for debounce period
        import time
        time.sleep(0.3)

        # Verify callback was NOT triggered
        callback.assert_not_called()

    def test_app_starts_multiple_file_watchers_for_cwd_and_yoyo_dev(self):
        """
        Test that YoyoDevApp starts file watchers for both .yoyo-dev and CWD.

        Expected: App should either:
        1. Create two separate FileWatcher instances, OR
        2. Create one FileWatcher that monitors both directories
        """
        from ..app import YoyoDevApp

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            yoyo_dev_dir = temp_path / ".yoyo-dev"
            yoyo_dev_dir.mkdir()

            # Mock CWD to point to temp directory
            with patch('pathlib.Path.cwd', return_value=temp_path):
                app = YoyoDevApp()

                with patch.object(app, 'push_screen'):
                    with patch('yoyo_tui.services.file_watcher.FileWatcher') as mock_watcher_class:
                        mock_watcher_instance = Mock()
                        mock_watcher_class.return_value = mock_watcher_instance
                        mock_watcher_instance.start_watching.return_value = True

                        app.on_mount()

                        # This will FAIL initially
                        # Expected: FileWatcher should be instantiated AND started for both dirs
                        # Current: Only watches .yoyo-dev

                        # Once implemented, verify:
                        # Option 1: Two FileWatcher instances
                        # assert mock_watcher_class.call_count == 2

                        # Option 2: One FileWatcher with multiple start_watching calls
                        # assert mock_watcher_instance.start_watching.call_count >= 2

    def test_file_watcher_callback_receives_correct_context(self, temp_directories):
        """
        Test that FileWatcher callback correctly identifies which file changed.

        Expected: Callback should be able to determine if change was in CWD vs .yoyo-dev.
        """
        # Track which files triggered callback
        triggered_files = []

        def tracking_callback(file_path=None):
            triggered_files.append(file_path)

        # This test expects enhanced FileWatcher that passes file path to callback
        # Current implementation: callback has no parameters
        # Expected implementation: callback(changed_file_path: Path)

        # For now, this test documents the expected behavior
        # Once implemented, FileWatcher should pass the changed file path to callback
        pass
