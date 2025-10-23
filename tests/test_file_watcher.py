"""
Unit tests for FileWatcher with EventBus integration.

Tests cover:
- File creation, modification, deletion events
- Debouncing logic (100ms window)
- Ignore patterns for unwanted files
- EventBus integration
- Thread safety
"""

import pytest
import time
import threading
from pathlib import Path
from unittest.mock import Mock, MagicMock, call
from tempfile import TemporaryDirectory

from lib.yoyo_tui.services.file_watcher import FileWatcher, YoyoDevFileHandler
from lib.yoyo_tui.services.event_bus import EventBus
from lib.yoyo_tui.models import EventType, Event


class TestYoyoDevFileHandler:
    """Test YoyoDevFileHandler with debouncing and filtering."""

    def test_handler_initialization(self):
        """Test handler initializes with EventBus."""
        event_bus = EventBus()
        handler = YoyoDevFileHandler(event_bus)

        assert handler.event_bus is event_bus
        assert handler.debounce_window == 0.1  # 100ms
        assert len(handler.ignore_patterns) > 0

    def test_ignore_patterns_configured(self):
        """Test ignore patterns include common unwanted files."""
        event_bus = EventBus()
        handler = YoyoDevFileHandler(event_bus)

        expected_patterns = {
            '*.pyc',
            '__pycache__',
            '.git',
            '.pytest_cache',
            '.DS_Store',
            '*.swp',
            '*.swo',
            '*~'
        }

        for pattern in expected_patterns:
            assert pattern in handler.ignore_patterns

    def test_should_ignore_file(self):
        """Test file filtering for ignored patterns."""
        event_bus = EventBus()
        handler = YoyoDevFileHandler(event_bus)

        # Should ignore
        assert handler._should_ignore('/path/to/file.pyc') is True
        assert handler._should_ignore('/path/__pycache__/module.py') is True
        assert handler._should_ignore('/path/.git/config') is True
        assert handler._should_ignore('/path/.pytest_cache/v/') is True
        assert handler._should_ignore('/path/.DS_Store') is True
        assert handler._should_ignore('/path/file.swp') is True
        assert handler._should_ignore('/path/file.swo') is True
        assert handler._should_ignore('/path/file~') is True

        # Should not ignore
        assert handler._should_ignore('/path/to/spec.md') is False
        assert handler._should_ignore('/path/to/tasks.md') is False
        assert handler._should_ignore('/path/to/state.json') is False

    def test_debouncing_single_event(self):
        """Test debouncing allows single event after quiet period."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        # Create mock event
        mock_event = Mock()
        mock_event.is_directory = False
        mock_event.src_path = '/path/specs/spec.md'

        # Trigger single event
        handler.on_modified(mock_event)

        # Wait for debounce window
        time.sleep(0.15)

        # Should have emitted exactly one FILE_CHANGED event
        events = event_bus.get_event_log()
        assert len(events) == 1
        assert events[0].event_type == EventType.FILE_CHANGED
        assert events[0].data['file_path'] == '/path/specs/spec.md'
        assert events[0].data['change_type'] == 'modified'
        assert events[0].source == 'FileWatcher'

    def test_debouncing_multiple_rapid_events(self):
        """Test debouncing coalesces rapid events into single notification."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        # Create mock event
        mock_event = Mock()
        mock_event.is_directory = False
        mock_event.src_path = '/path/specs/spec.md'

        # Trigger rapid events (simulating editor saves)
        for _ in range(5):
            handler.on_modified(mock_event)
            time.sleep(0.05)  # 50ms between events

        # Wait for debounce window
        time.sleep(0.15)

        # Should have emitted exactly one FILE_CHANGED event
        events = event_bus.get_event_log()
        assert len(events) == 1
        assert events[0].event_type == EventType.FILE_CHANGED

    def test_debouncing_different_files(self):
        """Test debouncing tracks events per file independently."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        # Create mock events for different files
        event1 = Mock()
        event1.is_directory = False
        event1.src_path = '/path/specs/spec1.md'

        event2 = Mock()
        event2.is_directory = False
        event2.src_path = '/path/fixes/fix1.md'

        # Trigger events for different files
        handler.on_modified(event1)
        time.sleep(0.05)
        handler.on_modified(event2)

        # Wait for debounce window
        time.sleep(0.15)

        # Should have emitted two separate events
        events = event_bus.get_event_log()
        assert len(events) == 2

        file_paths = {e.data['file_path'] for e in events}
        assert '/path/specs/spec1.md' in file_paths
        assert '/path/fixes/fix1.md' in file_paths

    def test_file_created_event(self):
        """Test FILE_CREATED event emission."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        mock_event = Mock()
        mock_event.is_directory = False
        mock_event.src_path = '/path/specs/new-spec.md'

        handler.on_created(mock_event)
        time.sleep(0.15)

        events = event_bus.get_event_log()
        assert len(events) == 1
        assert events[0].event_type == EventType.FILE_CREATED
        assert events[0].data['file_path'] == '/path/specs/new-spec.md'
        assert events[0].data['change_type'] == 'created'

    def test_file_deleted_event(self):
        """Test FILE_DELETED event emission."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        mock_event = Mock()
        mock_event.is_directory = False
        mock_event.src_path = '/path/specs/old-spec.md'

        handler.on_deleted(mock_event)
        time.sleep(0.15)

        events = event_bus.get_event_log()
        assert len(events) == 1
        assert events[0].event_type == EventType.FILE_DELETED
        assert events[0].data['file_path'] == '/path/specs/old-spec.md'
        assert events[0].data['change_type'] == 'deleted'

    def test_directory_events_ignored(self):
        """Test directory events are ignored."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        mock_event = Mock()
        mock_event.is_directory = True
        mock_event.src_path = '/path/specs/'

        handler.on_modified(mock_event)
        time.sleep(0.15)

        # Should not emit any events for directories
        events = event_bus.get_event_log()
        assert len(events) == 0

    def test_ignored_files_no_events(self):
        """Test ignored files don't trigger events."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        # Test various ignored files
        ignored_paths = [
            '/path/file.pyc',
            '/path/__pycache__/module.py',
            '/path/.git/config',
            '/path/.DS_Store',
            '/path/file.swp'
        ]

        for path in ignored_paths:
            mock_event = Mock()
            mock_event.is_directory = False
            mock_event.src_path = path

            handler.on_modified(mock_event)

        time.sleep(0.15)

        # Should not emit any events
        events = event_bus.get_event_log()
        assert len(events) == 0

    def test_thread_safety(self):
        """Test handler is thread-safe with concurrent events."""
        event_bus = EventBus(enable_logging=True)
        handler = YoyoDevFileHandler(event_bus)

        def trigger_events(file_id: int):
            for i in range(10):
                mock_event = Mock()
                mock_event.is_directory = False
                mock_event.src_path = f'/path/file{file_id}.md'
                handler.on_modified(mock_event)
                time.sleep(0.01)

        # Start multiple threads
        threads = []
        for i in range(3):
            t = threading.Thread(target=trigger_events, args=(i,))
            threads.append(t)
            t.start()

        # Wait for threads
        for t in threads:
            t.join()

        # Wait for debounce
        time.sleep(0.2)

        # Should have emitted events for 3 different files
        events = event_bus.get_event_log()
        assert len(events) == 3

        file_paths = {e.data['file_path'] for e in events}
        assert len(file_paths) == 3


class TestFileWatcher:
    """Test FileWatcher with EventBus integration."""

    def test_watcher_initialization(self):
        """Test FileWatcher initializes with EventBus."""
        event_bus = EventBus()
        watcher = FileWatcher(event_bus)

        assert watcher.event_bus is event_bus
        assert watcher.observer is None
        assert watcher.is_watching is False

    def test_start_watching_directory(self):
        """Test starting watcher on a directory."""
        event_bus = EventBus()
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            result = watcher.start_watching(Path(tmpdir))
            assert result is True
            assert watcher.is_watching is True
            assert watcher.observer is not None

            watcher.stop_watching()

    def test_start_watching_nonexistent_directory(self):
        """Test starting watcher on nonexistent directory fails gracefully."""
        event_bus = EventBus()
        watcher = FileWatcher(event_bus)

        result = watcher.start_watching(Path('/nonexistent/path'))
        assert result is False
        assert watcher.is_watching is False

    def test_stop_watching(self):
        """Test stopping watcher cleans up properly."""
        event_bus = EventBus()
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            watcher.start_watching(Path(tmpdir))
            assert watcher.is_watching is True

            watcher.stop_watching()
            assert watcher.is_watching is False
            assert watcher.observer is None

    def test_watch_multiple_directories(self):
        """Test watching multiple directories."""
        event_bus = EventBus()
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir1:
            with TemporaryDirectory() as tmpdir2:
                # Start watching first directory
                watcher.start_watching(Path(tmpdir1))
                assert watcher.is_watching is True

                # Add second directory
                watcher.add_watch_directory(Path(tmpdir2))

                # Both should be watched
                assert len(watcher.watched_directories) == 2
                assert Path(tmpdir1) in watcher.watched_directories
                assert Path(tmpdir2) in watcher.watched_directories

                watcher.stop_watching()

    def test_file_change_detection(self):
        """Test watcher detects file changes and emits events."""
        event_bus = EventBus(enable_logging=True)
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)

            # Start watching
            watcher.start_watching(tmppath)
            time.sleep(0.2)  # Give watchdog time to set up

            # Create a file
            test_file = tmppath / 'specs' / 'test-spec.md'
            test_file.parent.mkdir(parents=True, exist_ok=True)
            test_file.write_text('# Test Spec')

            # Wait for event propagation
            time.sleep(0.5)  # Increased wait time for file system events

            # Should have detected FILE_CREATED or FILE_CHANGED (Linux may report either for new files)
            events = event_bus.get_event_log()
            assert len(events) > 0, "No events detected at all"

            file_events = [e for e in events if e.event_type in (EventType.FILE_CREATED, EventType.FILE_CHANGED)]
            assert len(file_events) > 0, f"No file events detected. Got: {[e.event_type for e in events]}"

            watcher.stop_watching()

    def test_file_modification_detection(self):
        """Test watcher detects file modifications."""
        event_bus = EventBus(enable_logging=True)
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)

            # Create file first
            test_file = tmppath / 'specs' / 'test-spec.md'
            test_file.parent.mkdir(parents=True, exist_ok=True)
            test_file.write_text('# Test Spec')

            # Start watching
            event_bus.clear_event_log()
            watcher.start_watching(tmppath)
            time.sleep(0.1)

            # Modify file
            test_file.write_text('# Modified Spec')

            # Wait for event
            time.sleep(0.3)

            # Should have detected FILE_CHANGED
            events = event_bus.get_event_log()
            changed_events = [e for e in events if e.event_type == EventType.FILE_CHANGED]
            assert len(changed_events) > 0

            watcher.stop_watching()

    def test_file_deletion_detection(self):
        """Test watcher detects file deletions."""
        event_bus = EventBus(enable_logging=True)
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)

            # Create file first
            test_file = tmppath / 'specs' / 'test-spec.md'
            test_file.parent.mkdir(parents=True, exist_ok=True)
            test_file.write_text('# Test Spec')

            # Start watching
            event_bus.clear_event_log()
            watcher.start_watching(tmppath)
            time.sleep(0.1)

            # Delete file
            test_file.unlink()

            # Wait for event
            time.sleep(0.3)

            # Should have detected FILE_DELETED
            events = event_bus.get_event_log()
            deleted_events = [e for e in events if e.event_type == EventType.FILE_DELETED]
            assert len(deleted_events) > 0

            watcher.stop_watching()

    def test_rapid_file_changes_debounced(self):
        """Test rapid file changes are debounced."""
        event_bus = EventBus(enable_logging=True)
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)

            # Create file
            test_file = tmppath / 'specs' / 'test-spec.md'
            test_file.parent.mkdir(parents=True, exist_ok=True)
            test_file.write_text('# Test Spec')

            # Start watching
            event_bus.clear_event_log()
            watcher.start_watching(tmppath)
            time.sleep(0.1)

            # Rapid modifications (simulating editor saves)
            for i in range(5):
                test_file.write_text(f'# Test Spec {i}')
                time.sleep(0.05)  # 50ms between writes

            # Wait for debounce
            time.sleep(0.3)

            # Should have coalesced into fewer events
            events = event_bus.get_event_log()
            changed_events = [e for e in events if e.event_type == EventType.FILE_CHANGED]

            # Should be significantly less than 5 events due to debouncing
            assert len(changed_events) <= 2

            watcher.stop_watching()

    def test_ignored_files_not_watched(self):
        """Test ignored files don't trigger events."""
        event_bus = EventBus(enable_logging=True)
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)

            # Start watching
            watcher.start_watching(tmppath)
            time.sleep(0.1)

            # Create ignored files
            (tmppath / 'test.pyc').write_text('compiled')
            (tmppath / '__pycache__').mkdir()
            (tmppath / '__pycache__' / 'module.pyc').write_text('compiled')
            (tmppath / '.DS_Store').write_text('mac')

            # Wait
            time.sleep(0.3)

            # Should not have emitted events for ignored files
            events = event_bus.get_event_log()
            assert len(events) == 0

            watcher.stop_watching()

    def test_context_manager_support(self):
        """Test FileWatcher works as context manager."""
        event_bus = EventBus()

        with TemporaryDirectory() as tmpdir:
            with FileWatcher(event_bus) as watcher:
                watcher.start_watching(Path(tmpdir))
                assert watcher.is_watching is True

            # Should auto-stop when exiting context
            assert watcher.is_watching is False

    def test_restart_watching(self):
        """Test stopping and restarting watcher."""
        event_bus = EventBus()
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            # First watch
            watcher.start_watching(Path(tmpdir))
            assert watcher.is_watching is True

            # Stop
            watcher.stop_watching()
            assert watcher.is_watching is False

            # Restart
            watcher.start_watching(Path(tmpdir))
            assert watcher.is_watching is True

            watcher.stop_watching()


class TestFileWatcherIntegration:
    """Integration tests for FileWatcher with real file system."""

    def test_watch_yoyo_dev_directories(self):
        """Test watching typical yoyo-dev directory structure."""
        event_bus = EventBus(enable_logging=True)
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)

            # Create yoyo-dev structure
            (tmppath / 'specs').mkdir()
            (tmppath / 'fixes').mkdir()
            (tmppath / 'recaps').mkdir()
            (tmppath / '.cache').mkdir()

            # Start watching
            watcher.start_watching(tmppath)
            time.sleep(0.2)  # Give watchdog time to set up

            # Create files in different directories
            (tmppath / 'specs' / '2025-10-23-feature' / 'spec.md').parent.mkdir()
            (tmppath / 'specs' / '2025-10-23-feature' / 'spec.md').write_text('# Spec')

            (tmppath / 'fixes' / '2025-10-23-fix' / 'analysis.md').parent.mkdir()
            (tmppath / 'fixes' / '2025-10-23-fix' / 'analysis.md').write_text('# Fix')

            (tmppath / 'recaps' / 'recap.md').write_text('# Recap')

            (tmppath / '.cache' / 'execution-progress.json').write_text('{}')

            # Wait for events
            time.sleep(0.5)  # Increased wait time

            # Should have detected all file creations (FILE_CREATED or FILE_CHANGED on Linux)
            events = event_bus.get_event_log()
            file_events = [e for e in events if e.event_type in (EventType.FILE_CREATED, EventType.FILE_CHANGED)]
            assert len(file_events) >= 4, f"Expected >=4 file events, got {len(file_events)}"

            watcher.stop_watching()

    def test_concurrent_file_changes(self):
        """Test handling concurrent file changes from multiple sources."""
        event_bus = EventBus(enable_logging=True)
        watcher = FileWatcher(event_bus)

        with TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            (tmppath / 'specs').mkdir()

            watcher.start_watching(tmppath)
            time.sleep(0.2)  # Give watchdog time to set up

            def create_files(thread_id: int):
                for i in range(3):
                    file_path = tmppath / 'specs' / f'thread{thread_id}_file{i}.md'
                    file_path.write_text(f'Content {i}')
                    time.sleep(0.05)

            # Create files from multiple threads
            threads = []
            for i in range(3):
                t = threading.Thread(target=create_files, args=(i,))
                threads.append(t)
                t.start()

            for t in threads:
                t.join()

            # Wait for events
            time.sleep(0.5)  # Increased wait time

            # Should have detected all file creations (FILE_CREATED or FILE_CHANGED on Linux)
            events = event_bus.get_event_log()
            file_events = [e for e in events if e.event_type in (EventType.FILE_CREATED, EventType.FILE_CHANGED)]
            assert len(file_events) >= 9, f"Expected >=9 file events (3 threads × 3 files), got {len(file_events)}"  # 3 threads × 3 files

            watcher.stop_watching()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
