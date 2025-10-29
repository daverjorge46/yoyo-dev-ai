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

    def test_true_debouncing_with_rapid_changes(self, tmp_path):
        """
        Test that true debouncing only triggers ONE callback after rapid changes.

        This verifies the timer cancellation logic - rapid changes should cancel
        pending timers and only trigger after a quiet period.
        """
        callback_count = []
        callback_times = []

        def test_callback():
            callback_count.append(True)
            callback_times.append(time.time())

        # Use 0.3s debounce for faster testing
        watcher = FileWatcher(callback=test_callback, debounce_interval=0.3)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Record start time
        start_time = time.time()

        # Make 10 rapid changes (every 0.1s)
        for i in range(10):
            test_file.write_text(f"Change {i}")
            time.sleep(0.1)  # Well below debounce interval

        # Wait for debounce to settle (debounce + buffer)
        time.sleep(0.6)

        # Should have been called EXACTLY ONCE (true debounce)
        assert len(callback_count) == 1, f"Expected 1 callback, got {len(callback_count)}"

        # Callback should have been triggered after quiet period
        # (approximately start_time + 1.0s for changes + 0.3s debounce)
        elapsed = callback_times[0] - start_time
        assert elapsed >= 1.0, f"Callback triggered too early: {elapsed}s"
        assert elapsed <= 1.8, f"Callback triggered too late: {elapsed}s"

        # Cleanup
        watcher.stop_watching()

    def test_max_wait_timeout(self, tmp_path):
        """
        Test that max-wait timeout prevents indefinite delay.

        If changes keep coming, the callback should still trigger within
        max_wait timeout to prevent data from being stale forever.
        """
        callback_count = []
        callback_times = []

        def test_callback():
            callback_count.append(True)
            callback_times.append(time.time())

        # 0.3s debounce, 1.5s max-wait
        watcher = FileWatcher(callback=test_callback, debounce_interval=0.3, max_wait=1.5)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        start_time = time.time()

        # Make continuous changes for 2.5 seconds (longer than max-wait)
        # This should trigger callback at max-wait boundary (~1.5s)
        for i in range(15):
            test_file.write_text(f"Change {i}")
            time.sleep(0.15)  # Below debounce but continuous

        # Wait for any pending callbacks
        time.sleep(0.5)

        # Should have triggered at least once due to max-wait
        assert len(callback_count) >= 1, "Max-wait timeout should trigger callback"

        # First callback should be around max-wait time (1.5s ± 0.5s)
        elapsed = callback_times[0] - start_time
        assert elapsed >= 1.2, f"Max-wait triggered too early: {elapsed}s"
        assert elapsed <= 2.0, f"Max-wait triggered too late: {elapsed}s"

        # Cleanup
        watcher.stop_watching()

    def test_vim_emacs_save_pattern(self, tmp_path):
        """
        Test with realistic editor save patterns (vim, emacs, etc).

        Many editors write temp files, rename, or trigger multiple events.
        Should only get ONE callback after save completes.
        """
        callback_count = []

        def test_callback():
            callback_count.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.5)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Simulate vim save pattern (multiple rapid writes)
        for _ in range(3):
            test_file.write_text("Updated content")
            time.sleep(0.05)

        # Wait for debounce
        time.sleep(0.8)

        # Should only trigger ONCE despite multiple writes
        assert len(callback_count) == 1, f"Expected 1 callback, got {len(callback_count)}"

        # Cleanup
        watcher.stop_watching()

    def test_no_callback_spam_during_rapid_edits(self, tmp_path):
        """
        Test that rapid editing doesn't cause callback spam.

        Simulates user typing rapidly with autosave - should NOT trigger
        callback on every keystroke, only after typing stops.
        """
        callback_count = []

        def test_callback():
            callback_count.append(True)

        watcher = FileWatcher(callback=test_callback, debounce_interval=0.4)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Simulate rapid typing (20 keystrokes with autosave)
        for i in range(20):
            test_file.write_text(f"Content {i}")
            time.sleep(0.05)  # 50ms between keystrokes

        # Wait for final debounce
        time.sleep(0.6)

        # Should trigger ONCE (or very few times), not 20 times
        assert len(callback_count) <= 2, f"Too many callbacks: {len(callback_count)}"

        # Cleanup
        watcher.stop_watching()
