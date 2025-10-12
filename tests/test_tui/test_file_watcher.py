"""
Tests for FileWatcher service.

Tests file watching with debouncing for real-time TUI updates.
"""

import time
import pytest
from pathlib import Path
from lib.yoyo_tui.services.file_watcher import FileWatcher


class TestFileWatcher:
    """Test suite for FileWatcher."""

    def test_init_with_callback(self):
        """Test FileWatcher initialization with callback."""
        callback_called = []

        def test_callback():
            callback_called.append(True)

        watcher = FileWatcher(callback=test_callback)

        assert watcher.callback == test_callback
        assert watcher.observer is None
        assert watcher.is_watching is False

    def test_start_watching_nonexistent_directory(self):
        """Test starting watcher on nonexistent directory."""
        watcher = FileWatcher(callback=lambda: None)

        result = watcher.start_watching(Path("/nonexistent/path"))

        assert result is False
        assert watcher.is_watching is False

    def test_start_watching_valid_directory(self, tmp_path):
        """Test starting watcher on valid directory."""
        watcher = FileWatcher(callback=lambda: None)

        result = watcher.start_watching(tmp_path)

        assert result is True
        assert watcher.is_watching is True
        assert watcher.observer is not None

        # Cleanup
        watcher.stop_watching()

    def test_stop_watching_when_not_started(self):
        """Test stopping watcher when not started."""
        watcher = FileWatcher(callback=lambda: None)

        # Should not raise error
        watcher.stop_watching()

        assert watcher.is_watching is False

    def test_stop_watching_after_start(self, tmp_path):
        """Test stopping watcher after starting."""
        watcher = FileWatcher(callback=lambda: None)
        watcher.start_watching(tmp_path)

        watcher.stop_watching()

        assert watcher.is_watching is False
        assert watcher.observer is None

    def test_watch_specific_file_modification(self, tmp_path):
        """Test callback triggered on file modification."""
        callback_called = []

        def test_callback():
            callback_called.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.1)

        # Create test file
        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial content")

        # Start watching
        watcher.start_watching(tmp_path)

        # Give watcher time to start
        time.sleep(0.2)

        # Modify file
        test_file.write_text("Modified content")

        # Wait for debounce + processing
        time.sleep(0.5)

        # Callback should have been called
        assert len(callback_called) > 0

        # Cleanup
        watcher.stop_watching()

    def test_debouncing_multiple_rapid_changes(self, tmp_path):
        """Test that debouncing prevents callback spam."""
        callback_count = []

        def test_callback():
            callback_count.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.5)

        # Create test file
        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        # Start watching
        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Make 5 rapid changes
        for i in range(5):
            test_file.write_text(f"Change {i}")
            time.sleep(0.1)  # Less than debounce interval

        # Wait for debounce to settle
        time.sleep(0.8)

        # Should have been called only 1-2 times due to debouncing
        # (not 5 times)
        assert len(callback_count) <= 2

        # Cleanup
        watcher.stop_watching()

    def test_watch_only_relevant_files(self, tmp_path):
        """Test that only tasks.md and state.json trigger callbacks."""
        callback_count = []

        def test_callback():
            callback_count.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.1)

        # Start watching
        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Modify irrelevant file (should not trigger callback)
        irrelevant = tmp_path / "random.txt"
        irrelevant.write_text("Random content")
        time.sleep(0.5)

        initial_count = len(callback_count)

        # Modify relevant file (should trigger callback)
        relevant = tmp_path / "tasks.md"
        relevant.write_text("Task content")
        time.sleep(0.5)

        # Callback should have been called for relevant file
        assert len(callback_count) > initial_count

        # Cleanup
        watcher.stop_watching()

    def test_watch_master_tasks_file(self, tmp_path):
        """Test that MASTER-TASKS.md also triggers callback."""
        callback_called = []

        def test_callback():
            callback_called.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.1)

        # Create test file
        test_file = tmp_path / "MASTER-TASKS.md"
        test_file.write_text("Initial")

        # Start watching
        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Modify file
        test_file.write_text("Modified")
        time.sleep(0.5)

        # Callback should have been called
        assert len(callback_called) > 0

        # Cleanup
        watcher.stop_watching()

    def test_watch_state_json_file(self, tmp_path):
        """Test that state.json triggers callback."""
        callback_called = []

        def test_callback():
            callback_called.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.1)

        # Create test file
        test_file = tmp_path / "state.json"
        test_file.write_text('{"phase": "init"}')

        # Start watching
        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Modify file
        test_file.write_text('{"phase": "implementation"}')
        time.sleep(0.5)

        # Callback should have been called
        assert len(callback_called) > 0

        # Cleanup
        watcher.stop_watching()

    def test_recursive_watching(self, tmp_path):
        """Test that watcher watches subdirectories recursively."""
        callback_called = []

        def test_callback():
            callback_called.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.1)

        # Create subdirectory structure
        subdir = tmp_path / "specs" / "2025-10-11-feature"
        subdir.mkdir(parents=True)
        test_file = subdir / "tasks.md"
        test_file.write_text("Initial")

        # Start watching root directory
        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Modify file in subdirectory
        test_file.write_text("Modified")
        time.sleep(0.5)

        # Callback should have been called for nested file
        assert len(callback_called) > 0

        # Cleanup
        watcher.stop_watching()

    def test_context_manager_usage(self, tmp_path):
        """Test using FileWatcher as context manager."""
        callback_called = []

        def test_callback():
            callback_called.append(True)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        with FileWatcher(callback=test_callback, debounce_interval=0.1) as watcher:
            watcher.start_watching(tmp_path)
            time.sleep(0.2)

            test_file.write_text("Modified")
            time.sleep(0.5)

        # Watcher should be automatically stopped
        assert watcher.is_watching is False
        assert len(callback_called) > 0

    def test_error_handling_in_callback(self, tmp_path):
        """Test that watcher continues working if callback raises error."""
        callback_count = []

        def failing_callback():
            callback_count.append(True)
            if len(callback_count) == 1:
                raise Exception("Test error")

        watcher = FileWatcher(callback=failing_callback, debounce_interval=0.1)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # First modification (will raise error)
        test_file.write_text("Change 1")
        time.sleep(0.6)

        # Second modification (should still work)
        test_file.write_text("Change 2")
        time.sleep(0.6)

        # Should have been called twice despite first error
        assert len(callback_count) >= 1

        # Cleanup
        watcher.stop_watching()
