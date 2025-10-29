#!/usr/bin/env python3
"""
Comprehensive FileWatcher integration tests.

Tests event emission, debouncing, file type detection, ignore patterns, and edge cases.
Uses real Event Bus instance for proper integration testing.
"""

import sys
import time
import tempfile
import shutil
import pytest
from pathlib import Path

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_watch_dir():
    """Create temporary directory for file watching tests."""
    temp_dir = tempfile.mkdtemp(prefix="yoyo_test_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def real_event_bus():
    """Real EventBus instance for testing."""
    from yoyo_tui.services.event_bus import EventBus
    return EventBus(enable_logging=False)


# ============================================================================
# Test FileWatcher Event Emission
# ============================================================================

class TestFileWatcherEventEmission:
    """Test that FileWatcher correctly emits events for file changes."""

    def test_file_modified_emits_file_changed_event(self, temp_watch_dir, real_event_bus):
        """Test that modifying a file emits FILE_CHANGED event."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Create test file
        test_file = temp_watch_dir / "tasks.md"
        test_file.write_text("# Tasks\n- [ ] Task 1")

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CHANGED, lambda e: events_received.append(e))

        # Create FileWatcher with very short debounce for testing
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        success = watcher.start_watching(temp_watch_dir)
        assert success, "Failed to start watching"

        try:
            # Modify file
            test_file.write_text("# Tasks\n- [x] Task 1")

            # Wait for debounce + processing
            time.sleep(0.3)

            # Verify FILE_CHANGED event was emitted
            assert len(events_received) > 0, "FILE_CHANGED event not emitted"
            assert events_received[0].event_type == EventType.FILE_CHANGED
            assert "tasks.md" in events_received[0].data.get("file_path", "")

        finally:
            watcher.stop_watching()

    def test_file_created_emits_file_created_event(self, temp_watch_dir, real_event_bus):
        """Test that creating a file emits FILE_CREATED event."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CREATED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        # Give watchdog time to start watching
        time.sleep(0.2)

        try:
            # Create new file
            new_file = temp_watch_dir / "new_spec.md"
            new_file.write_text("# New Spec")

            # Wait for debounce + processing
            time.sleep(0.3)

            # Verify FILE_CREATED event was emitted
            assert len(events_received) > 0, "FILE_CREATED event not emitted"

        finally:
            watcher.stop_watching()

    def test_file_deleted_emits_file_deleted_event(self, temp_watch_dir, real_event_bus):
        """Test that deleting a file emits FILE_DELETED event."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Create test file
        test_file = temp_watch_dir / "to_delete.md"
        test_file.write_text("# To Delete")

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_DELETED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        try:
            # Delete file
            test_file.unlink()

            # Wait for debounce + processing
            time.sleep(0.3)

            # Verify FILE_DELETED event was emitted
            assert len(events_received) > 0, "FILE_DELETED event not emitted"

        finally:
            watcher.stop_watching()


# ============================================================================
# Test FileWatcher Debouncing
# ============================================================================

class TestFileWatcherDebouncing:
    """Test that FileWatcher properly debounces rapid file changes."""

    def test_rapid_edits_debounced_to_single_event(self, temp_watch_dir, real_event_bus):
        """Test that rapid edits within debounce window emit only one event."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Create test file
        test_file = temp_watch_dir / "tasks.md"
        test_file.write_text("# Tasks")

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CHANGED, lambda e: events_received.append(e))

        # Create FileWatcher with 0.5s debounce
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.5)
        watcher.start_watching(temp_watch_dir)

        try:
            # Make 5 rapid edits within 0.4s (within debounce window)
            for i in range(5):
                test_file.write_text(f"# Tasks v{i}")
                time.sleep(0.08)  # 0.08 * 5 = 0.4s total

            # Wait for debounce to complete
            time.sleep(0.7)

            # Verify callback called only once (or very few times, not 5)
            assert len(events_received) <= 2, f"Expected ≤2 events, got {len(events_received)}"

        finally:
            watcher.stop_watching()

    def test_slow_edits_emit_multiple_events(self, temp_watch_dir, real_event_bus):
        """Test that slow edits outside debounce window emit separate events."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Create test file
        test_file = temp_watch_dir / "tasks.md"
        test_file.write_text("# Tasks")

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CHANGED, lambda e: events_received.append(e))

        # Create FileWatcher with 0.2s debounce
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.2)
        watcher.start_watching(temp_watch_dir)

        try:
            # Make 3 slow edits with 0.4s between each (outside debounce window)
            for i in range(3):
                test_file.write_text(f"# Tasks v{i}")
                time.sleep(0.4)

            # Wait for final debounce
            time.sleep(0.3)

            # Verify callback called multiple times (at least 2)
            assert len(events_received) >= 2, f"Expected ≥2 events, got {len(events_received)}"

        finally:
            watcher.stop_watching()


# ============================================================================
# Test FileWatcher Ignore Patterns
# ============================================================================

class TestFileWatcherIgnorePatterns:
    """Test that FileWatcher ignores specified file patterns."""

    def test_pyc_files_ignored(self, temp_watch_dir, real_event_bus):
        """Test that .pyc files are ignored."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CREATED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        try:
            # Create .pyc file (should be ignored)
            pyc_file = temp_watch_dir / "test.pyc"
            pyc_file.write_bytes(b"compiled python")

            # Wait
            time.sleep(0.3)

            # Verify no events published for .pyc file
            assert len(events_received) == 0, ".pyc file should be ignored"

        finally:
            watcher.stop_watching()

    def test_vim_swap_files_ignored(self, temp_watch_dir, real_event_bus):
        """Test that vim swap files (.swp, .swo) are ignored."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CREATED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        try:
            # Create swap files (should be ignored)
            swp_file = temp_watch_dir / ".tasks.md.swp"
            swp_file.write_text("vim swap")

            swo_file = temp_watch_dir / ".tasks.md.swo"
            swo_file.write_text("vim swap")

            # Wait
            time.sleep(0.3)

            # Verify no events published for swap files
            assert len(events_received) == 0, "Vim swap files should be ignored"

        finally:
            watcher.stop_watching()

    def test_pycache_directory_ignored(self, temp_watch_dir, real_event_bus):
        """Test that __pycache__ directory is ignored."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CREATED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        try:
            # Create __pycache__ directory and file (should be ignored)
            pycache_dir = temp_watch_dir / "__pycache__"
            pycache_dir.mkdir()
            (pycache_dir / "test.pyc").write_bytes(b"compiled")

            # Wait
            time.sleep(0.3)

            # Verify no events published for __pycache__
            assert len(events_received) == 0, "__pycache__ directory should be ignored"

        finally:
            watcher.stop_watching()


# ============================================================================
# Test FileWatcher File Type Detection
# ============================================================================

class TestFileWatcherFileTypeDetection:
    """Test that FileWatcher detects file types correctly."""

    def test_tasks_md_detected(self, temp_watch_dir, real_event_bus):
        """Test that tasks.md is detected as task file."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Create test file
        tasks_file = temp_watch_dir / "tasks.md"
        tasks_file.write_text("# Tasks")

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CHANGED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        try:
            # Modify tasks.md
            tasks_file.write_text("# Tasks\n- [ ] Task 1")

            # Wait for debounce
            time.sleep(0.3)

            # Verify event published with correct file path
            assert len(events_received) > 0, "No events received"
            assert "tasks.md" in events_received[0].data.get("file_path", "")

        finally:
            watcher.stop_watching()

    def test_spec_md_detected(self, temp_watch_dir, real_event_bus):
        """Test that spec.md is detected as spec file."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Create test file
        spec_file = temp_watch_dir / "spec.md"
        spec_file.write_text("# Spec")

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CHANGED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        try:
            # Modify spec.md
            spec_file.write_text("# Spec\n## Overview")

            # Wait for debounce
            time.sleep(0.3)

            # Verify event published
            assert len(events_received) > 0, "No events received"

        finally:
            watcher.stop_watching()

    def test_state_json_detected(self, temp_watch_dir, real_event_bus):
        """Test that state.json is detected as state file."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType
        import json

        # Create test file
        state_file = temp_watch_dir / "state.json"
        state_file.write_text(json.dumps({"phase": "planning"}))

        # Track events
        events_received = []
        real_event_bus.subscribe(EventType.FILE_CHANGED, lambda e: events_received.append(e))

        # Create FileWatcher
        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
        watcher.start_watching(temp_watch_dir)

        try:
            # Modify state.json
            state_file.write_text(json.dumps({"phase": "implementation"}))

            # Wait for debounce
            time.sleep(0.3)

            # Verify event published
            assert len(events_received) > 0, "No events received"

        finally:
            watcher.stop_watching()


# ============================================================================
# Test FileWatcher Edge Cases
# ============================================================================

class TestFileWatcherEdgeCases:
    """Test FileWatcher edge cases and error handling."""

    def test_watching_nonexistent_directory_handled(self, real_event_bus):
        """Test that watching nonexistent directory is handled gracefully."""
        from yoyo_tui.services.file_watcher import FileWatcher

        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)

        # Should not raise exception
        result = watcher.start_watching(Path("/nonexistent/path/to/directory"))

        # Should return False
        assert result is False

    def test_stop_without_start_handled(self, real_event_bus):
        """Test that stopping without starting is handled gracefully."""
        from yoyo_tui.services.file_watcher import FileWatcher

        watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)

        # Should not raise exception
        watcher.stop_watching()

    def test_context_manager_usage(self, temp_watch_dir, real_event_bus):
        """Test that FileWatcher works as context manager."""
        from yoyo_tui.services.file_watcher import FileWatcher

        # Use as context manager
        with FileWatcher(event_bus=real_event_bus, debounce_window=0.1) as watcher:
            watcher.start_watching(temp_watch_dir)

            # Create test file
            test_file = temp_watch_dir / "test.md"
            test_file.write_text("# Test")

            time.sleep(0.3)

        # Verify watcher stopped automatically
        # (no assertion needed, just verify no exception)


# ============================================================================
# Test FileWatcher Multiple Directories
# ============================================================================

class TestFileWatcherMultipleDirectories:
    """Test FileWatcher with multiple watch directories."""

    def test_watching_multiple_directories(self, real_event_bus):
        """Test that FileWatcher can watch multiple directories."""
        from yoyo_tui.services.file_watcher import FileWatcher
        from yoyo_tui.services.event_bus import EventType

        # Create two temp directories
        temp_dir1 = tempfile.mkdtemp(prefix="yoyo_test1_")
        temp_dir2 = tempfile.mkdtemp(prefix="yoyo_test2_")

        try:
            # Track events
            events_received = []
            real_event_bus.subscribe(EventType.FILE_CREATED, lambda e: events_received.append(e))

            watcher = FileWatcher(event_bus=real_event_bus, debounce_window=0.1)
            watcher.start_watching(Path(temp_dir1))
            watcher.add_watch_directory(Path(temp_dir2))

            # Give watchdog time to start watching both directories
            time.sleep(0.2)

            try:
                # Create files in both directories
                file1 = Path(temp_dir1) / "file1.md"
                file2 = Path(temp_dir2) / "file2.md"

                file1.write_text("# File 1")
                file2.write_text("# File 2")

                # Wait for debounce
                time.sleep(0.4)

                # Verify events from both directories
                assert len(events_received) >= 2, "Should detect files in both directories"

            finally:
                watcher.stop_watching()

        finally:
            shutil.rmtree(temp_dir1, ignore_errors=True)
            shutil.rmtree(temp_dir2, ignore_errors=True)


# ============================================================================
# App Integration Tests
# ============================================================================

class TestFileWatcherAppIntegration:
    """Test FileWatcher integration in YoyoDevApp."""

    def test_app_has_file_watcher_methods(self):
        """Test that app has file watcher methods."""
        from yoyo_tui.app import YoyoDevApp

        assert hasattr(YoyoDevApp, 'start_file_watcher')
        assert hasattr(YoyoDevApp, 'stop_file_watcher')
        # Note: YoyoDevApp uses on_state_updated, not on_file_change

    @pytest.mark.skip(reason="Requires full app initialization with Textual")
    def test_app_initializes_file_watcher_to_none(self):
        """Test that file watcher is initialized to None."""
        from yoyo_tui.app import YoyoDevApp

        app = YoyoDevApp()
        assert app.file_watcher is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
