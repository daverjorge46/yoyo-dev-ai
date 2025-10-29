"""
Performance tests for FileWatcher debounce improvements.

Verifies that the improved debounce logic prevents callback spam
and meets the performance requirements from Task 7.
"""

import time
import pytest
from pathlib import Path
from lib.yoyo_tui.services.file_watcher import FileWatcher


class TestFileWatcherPerformance:
    """Performance test suite for FileWatcher debounce logic."""

    def test_single_callback_after_rapid_saves(self, tmp_path):
        """
        Verify only ONE callback triggered after rapid file saves.

        Requirement: No callback spam during rapid edits.
        Success: callback_count == 1
        """
        callback_count = []

        def count_callback():
            callback_count.append(True)

        watcher = FileWatcher(callback=count_callback, debounce_interval=1.5)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Simulate rapid saves (like vim :w :w :w)
        for i in range(10):
            test_file.write_text(f"Save {i}")
            time.sleep(0.2)  # 200ms between saves

        # Wait for debounce to settle
        time.sleep(2.0)

        # Verify only one callback (true debounce)
        assert len(callback_count) == 1, (
            f"Expected 1 callback after rapid saves, got {len(callback_count)}. "
            f"Timer cancellation is not working properly."
        )

        watcher.stop_watching()

    def test_max_delay_under_2_seconds(self, tmp_path):
        """
        Verify callback triggers within 2 seconds from first change.

        Requirement: No updates delayed more than 2 seconds.
        Success: callback triggered in 1.5s-2.0s range
        """
        callback_times = []

        def record_time():
            callback_times.append(time.time())

        watcher = FileWatcher(callback=record_time, debounce_interval=1.5)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        start_time = time.time()

        # Make several rapid changes
        for i in range(5):
            test_file.write_text(f"Change {i}")
            time.sleep(0.1)

        # Wait for callback
        time.sleep(2.5)

        # Verify callback was triggered
        assert len(callback_times) >= 1, "Callback should have been triggered"

        # Verify delay is under 2 seconds
        elapsed = callback_times[0] - start_time
        assert elapsed < 2.0, (
            f"Callback took {elapsed:.2f}s, exceeds 2s requirement. "
            f"Debounce interval may be too high."
        )

        watcher.stop_watching()

    def test_no_spam_during_continuous_typing(self, tmp_path):
        """
        Verify no callback spam during continuous typing with autosave.

        Requirement: Typing with autosave shouldn't spam callbacks.
        Success: Very few callbacks despite many file changes
        """
        callback_count = []

        def count_callback():
            callback_count.append(True)

        watcher = FileWatcher(callback=count_callback, debounce_interval=1.5)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Simulate typing with autosave (30 keystrokes over 3 seconds)
        for i in range(30):
            test_file.write_text(f"Content {i}")
            time.sleep(0.1)

        # Wait for final debounce
        time.sleep(2.0)

        # Should have very few callbacks (1-2), not 30
        assert len(callback_count) <= 2, (
            f"Expected ≤2 callbacks during typing, got {len(callback_count)}. "
            f"Debounce is allowing too many callbacks."
        )

        watcher.stop_watching()

    def test_max_wait_prevents_indefinite_delay(self, tmp_path):
        """
        Verify max-wait timeout prevents data from being stale forever.

        Requirement: Continuous changes still trigger callback within max-wait.
        Success: Callback triggered even with continuous changes
        """
        callback_times = []

        def record_time():
            callback_times.append(time.time())

        # 1.5s debounce, 3.0s max-wait for faster testing
        watcher = FileWatcher(
            callback=record_time,
            debounce_interval=1.5,
            max_wait=3.0
        )

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        start_time = time.time()

        # Make continuous changes for 4 seconds (exceeds max-wait)
        for i in range(25):
            test_file.write_text(f"Change {i}")
            time.sleep(0.15)  # Below debounce but continuous

        # Wait for any pending callbacks
        time.sleep(0.5)

        # Should have triggered at least once due to max-wait
        assert len(callback_times) >= 1, (
            "Max-wait timeout should force callback even with continuous changes"
        )

        # First callback should be around max-wait time
        elapsed = callback_times[0] - start_time
        assert 2.5 <= elapsed <= 3.8, (
            f"Max-wait triggered at {elapsed:.2f}s, expected around 3.0s ± 0.5s"
        )

        watcher.stop_watching()

    def test_timer_cleanup_on_stop(self, tmp_path):
        """
        Verify timers are cancelled when watcher stops.

        Requirement: No callbacks after watcher is stopped.
        Success: Callback count doesn't increase after stop_watching()
        """
        callback_count = []

        def count_callback():
            callback_count.append(True)

        watcher = FileWatcher(callback=count_callback, debounce_interval=1.0)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        # Trigger change
        test_file.write_text("Modified")
        time.sleep(0.1)

        # Stop watcher BEFORE debounce fires
        watcher.stop_watching()

        initial_count = len(callback_count)

        # Wait for what would have been the debounce period
        time.sleep(1.5)

        # Callback should NOT have been triggered after stop
        assert len(callback_count) == initial_count, (
            f"Callback triggered after stop_watching(). "
            f"Timer cancellation is not working properly."
        )

    def test_performance_comparison_benchmark(self, tmp_path):
        """
        Benchmark to show improvement over naive debounce.

        This test documents the performance improvement.
        With proper debounce: 1 callback for N rapid changes
        With naive debounce: Multiple callbacks
        """
        callback_count = []
        callback_times = []

        def record_callback():
            callback_count.append(True)
            callback_times.append(time.time())

        watcher = FileWatcher(callback=record_callback, debounce_interval=0.5)

        test_file = tmp_path / "tasks.md"
        test_file.write_text("Initial")

        watcher.start_watching(tmp_path)
        time.sleep(0.2)

        start_time = time.time()

        # Make 20 rapid changes
        for i in range(20):
            test_file.write_text(f"Change {i}")
            time.sleep(0.1)

        # Wait for debounce
        time.sleep(1.0)

        total_time = time.time() - start_time

        # Verify performance
        assert len(callback_count) == 1, (
            f"Performance test: Expected 1 callback for 20 changes, got {len(callback_count)}"
        )

        # Document performance metrics
        print(f"\nPerformance Benchmark Results:")
        print(f"  Changes: 20")
        print(f"  Callbacks: {len(callback_count)}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Spam reduction: {20 - len(callback_count)} callbacks prevented")

        watcher.stop_watching()
