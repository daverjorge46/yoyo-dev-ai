"""
FileWatcher Service with EventBus Integration

Watches file system for changes to yoyo-dev files and emits events via EventBus.
Implements debouncing with 100ms window to prevent callback spam.
Filters out unwanted files (.pyc, __pycache__, .git, etc.).
"""

import time
import threading
import fnmatch
from pathlib import Path
from typing import Dict, Optional, Set

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from .event_bus import EventBus
from ..models import EventType


class YoyoDevFileHandler(FileSystemEventHandler):
    """
    File system event handler with debouncing and EventBus integration.

    Features:
    - 100ms debouncing window per file
    - Smart filtering for ignored patterns
    - Event emission via EventBus
    - Thread-safe operation
    """

    def __init__(self, event_bus: EventBus, debounce_window: float = 0.1):
        """
        Initialize handler.

        Args:
            event_bus: EventBus instance for event emission
            debounce_window: Seconds to wait after last change before emitting (default: 0.1s = 100ms)
        """
        super().__init__()
        self.event_bus = event_bus
        self.debounce_window = debounce_window

        # Debouncing state: file_path -> (last_event_time, pending_timer)
        self._pending_events: Dict[str, tuple[float, Optional[threading.Timer]]] = {}
        self._lock = threading.Lock()

        # Ignore patterns for unwanted files
        self.ignore_patterns = {
            '*.pyc',
            '__pycache__',
            '.git',
            '.pytest_cache',
            '.DS_Store',
            '*.swp',
            '*.swo',
            '*~',
            '.mypy_cache',
            '*.egg-info',
            '.tox',
            'node_modules',
            '.venv',
            'venv',
            '*.log'
        }

    def _should_ignore(self, file_path: str) -> bool:
        """
        Check if file should be ignored based on patterns.

        Args:
            file_path: Path to check

        Returns:
            True if file should be ignored, False otherwise
        """
        path = Path(file_path)

        # Check filename and all parent directories
        parts = [path.name] + [p.name for p in path.parents]

        for part in parts:
            for pattern in self.ignore_patterns:
                if fnmatch.fnmatch(part, pattern):
                    return True

        return False

    def _emit_event(self, file_path: str, event_type: EventType, change_type: str) -> None:
        """
        Emit event via EventBus.

        Args:
            file_path: Path to file that changed
            event_type: Type of event
            change_type: Human-readable change type (created/modified/deleted)
        """
        self.event_bus.publish(
            event_type=event_type,
            data={
                'file_path': file_path,
                'change_type': change_type
            },
            source='FileWatcher'
        )

    def _schedule_event(self, file_path: str, event_type: EventType, change_type: str) -> None:
        """
        Schedule event emission after debounce window.

        Args:
            file_path: Path to file that changed
            event_type: Type of event
            change_type: Human-readable change type
        """
        with self._lock:
            # Cancel existing timer for this file
            if file_path in self._pending_events:
                _, existing_timer = self._pending_events[file_path]
                if existing_timer is not None:
                    existing_timer.cancel()

            # Create new timer
            def emit_after_debounce():
                with self._lock:
                    if file_path in self._pending_events:
                        del self._pending_events[file_path]
                self._emit_event(file_path, event_type, change_type)

            timer = threading.Timer(self.debounce_window, emit_after_debounce)
            timer.daemon = True
            timer.start()

            # Store timer
            self._pending_events[file_path] = (time.time(), timer)

    def on_created(self, event: FileSystemEvent) -> None:
        """
        Handle file creation events.

        Args:
            event: File system event
        """
        # Ignore directory events
        if event.is_directory:
            return

        file_path = event.src_path

        # Check ignore patterns
        if self._should_ignore(file_path):
            return

        # Schedule FILE_CREATED event with debouncing
        self._schedule_event(file_path, EventType.FILE_CREATED, 'created')

    def on_modified(self, event: FileSystemEvent) -> None:
        """
        Handle file modification events.

        Args:
            event: File system event
        """
        # Ignore directory events
        if event.is_directory:
            return

        file_path = event.src_path

        # Check ignore patterns
        if self._should_ignore(file_path):
            return

        # Schedule FILE_CHANGED event with debouncing
        self._schedule_event(file_path, EventType.FILE_CHANGED, 'modified')

    def on_deleted(self, event: FileSystemEvent) -> None:
        """
        Handle file deletion events.

        Args:
            event: File system event
        """
        # Ignore directory events
        if event.is_directory:
            return

        file_path = event.src_path

        # Check ignore patterns
        if self._should_ignore(file_path):
            return

        # Schedule FILE_DELETED event with debouncing
        self._schedule_event(file_path, EventType.FILE_DELETED, 'deleted')

    def cancel_pending_timers(self) -> None:
        """
        Cancel all pending timers.

        Called during cleanup to prevent events after watcher stops.
        """
        with self._lock:
            for file_path, (_, timer) in list(self._pending_events.items()):
                if timer is not None:
                    timer.cancel()
            self._pending_events.clear()


class FileWatcher:
    """
    Watch file system for changes and emit events via EventBus.

    Features:
    - Recursive directory watching
    - Debouncing with 100ms window
    - Filters for ignored files
    - Multiple directory watching
    - Thread-safe operation
    - Context manager support
    """

    def __init__(self, event_bus: EventBus, debounce_window: float = 0.1):
        """
        Initialize FileWatcher.

        Args:
            event_bus: EventBus instance for event emission
            debounce_window: Seconds to wait after last change (default: 0.1s = 100ms)
        """
        self.event_bus = event_bus
        self.debounce_window = debounce_window
        self.observer: Optional[Observer] = None
        self.event_handler: Optional[YoyoDevFileHandler] = None
        self.is_watching = False
        self.watched_directories: Set[Path] = set()

    def start_watching(self, directory: Path) -> bool:
        """
        Start watching a directory for file changes.

        Args:
            directory: Directory to watch (recursive)

        Returns:
            True if watching started successfully, False otherwise
        """
        if not directory.exists() or not directory.is_dir():
            return False

        # Stop existing watcher if running
        if self.is_watching:
            self.stop_watching()

        try:
            # Create event handler
            self.event_handler = YoyoDevFileHandler(
                event_bus=self.event_bus,
                debounce_window=self.debounce_window
            )

            # Create and start observer
            self.observer = Observer()
            self.observer.schedule(
                self.event_handler,
                str(directory),
                recursive=True
            )
            self.observer.start()

            self.is_watching = True
            self.watched_directories = {directory}
            return True

        except Exception as e:
            # Log error but don't crash
            print(f"Error starting file watcher: {e}")
            self.observer = None
            self.event_handler = None
            self.is_watching = False
            return False

    def add_watch_directory(self, directory: Path) -> bool:
        """
        Add an additional directory to watch.

        Args:
            directory: Directory to add to watching

        Returns:
            True if directory added successfully, False otherwise
        """
        if not directory.exists() or not directory.is_dir():
            return False

        if not self.is_watching or self.observer is None or self.event_handler is None:
            return False

        try:
            self.observer.schedule(
                self.event_handler,
                str(directory),
                recursive=True
            )
            self.watched_directories.add(directory)
            return True

        except Exception as e:
            print(f"Error adding watch directory: {e}")
            return False

    def stop_watching(self) -> None:
        """Stop watching for file changes."""
        # Cancel any pending timers first
        if self.event_handler is not None:
            self.event_handler.cancel_pending_timers()

        if self.observer is not None:
            try:
                self.observer.stop()
                self.observer.join(timeout=1.0)
            except Exception:
                pass  # Ignore errors during shutdown
            finally:
                self.observer = None
                self.event_handler = None
                self.is_watching = False
                self.watched_directories.clear()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - automatically stop watching."""
        self.stop_watching()
        return False  # Don't suppress exceptions
