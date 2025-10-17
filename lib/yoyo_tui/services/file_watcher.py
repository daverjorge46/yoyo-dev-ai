"""
FileWatcher Service

Watches file system for changes to tasks.md, state.json, and other relevant files.
Implements proper debouncing with timer cancellation to prevent callback spam.
"""

import time
import threading
from pathlib import Path
from typing import Callable, Optional

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent


class DebouncedFileHandler(FileSystemEventHandler):
    """
    File system event handler with proper debouncing.

    Uses timer cancellation to ensure only ONE callback after a quiet period.
    Implements max-wait timeout to prevent indefinite delay during continuous changes.
    """

    def __init__(
        self,
        callback: Callable[[], None],
        debounce_interval: float = 1.5,
        max_wait: float = 5.0
    ):
        """
        Initialize handler.

        Args:
            callback: Function to call when files change
            debounce_interval: Seconds to wait after last change before triggering (default: 1.5s)
            max_wait: Maximum seconds to wait before forcing trigger (default: 5.0s)
        """
        super().__init__()
        self.callback = callback
        self.debounce_interval = debounce_interval
        self.max_wait = max_wait

        # Timer for debouncing
        self.pending_timer: Optional[threading.Timer] = None
        self.lock = threading.Lock()

        # Track first event time for max-wait enforcement
        self.first_event_time: Optional[float] = None

        # Only watch these specific files
        self.watched_files = {
            'tasks.md',
            'MASTER-TASKS.md',
            'state.json',
            'spec.md',
            'spec-lite.md'
        }

    def _trigger_callback(self) -> None:
        """
        Trigger the callback and reset state.

        Called by timer after quiet period or max-wait timeout.
        """
        with self.lock:
            self.pending_timer = None
            self.first_event_time = None

        try:
            self.callback()
        except Exception:
            # Silently ignore callback errors to keep watcher running
            pass

    def _schedule_callback(self) -> None:
        """
        Schedule callback after debounce interval.

        Cancels any pending timer and schedules a new one.
        """
        with self.lock:
            # Cancel pending timer if exists
            if self.pending_timer is not None:
                self.pending_timer.cancel()

            # Track first event time for max-wait
            if self.first_event_time is None:
                self.first_event_time = time.time()

            # Check if we've exceeded max-wait
            now = time.time()
            time_since_first = now - self.first_event_time

            if time_since_first >= self.max_wait:
                # Max-wait exceeded - trigger immediately
                delay = 0.0
            else:
                # Calculate delay: either debounce_interval or remaining max-wait
                remaining_max_wait = self.max_wait - time_since_first
                delay = min(self.debounce_interval, remaining_max_wait)

            # Schedule new timer
            self.pending_timer = threading.Timer(delay, self._trigger_callback)
            self.pending_timer.daemon = True
            self.pending_timer.start()

    def on_modified(self, event: FileSystemEvent) -> None:
        """
        Handle file modification events.

        Args:
            event: File system event
        """
        # Ignore directory events
        if event.is_directory:
            return

        # Check if this is a file we care about
        filename = Path(event.src_path).name
        if filename not in self.watched_files:
            return

        # Schedule callback with debouncing
        self._schedule_callback()

    def on_created(self, event: FileSystemEvent) -> None:
        """
        Handle file creation events (treat same as modification).

        Args:
            event: File system event
        """
        self.on_modified(event)

    def cancel_pending_timer(self) -> None:
        """
        Cancel any pending timer.

        Called during cleanup to prevent callbacks after watcher stops.
        """
        with self.lock:
            if self.pending_timer is not None:
                self.pending_timer.cancel()
                self.pending_timer = None
            self.first_event_time = None


class FileWatcher:
    """
    Watch file system for changes and trigger callbacks.

    Features:
    - Recursive directory watching
    - Proper debouncing with timer cancellation
    - Max-wait timeout to prevent indefinite delay
    - Filters for relevant files only
    - Context manager support for automatic cleanup
    """

    def __init__(
        self,
        callback: Callable[[], None],
        debounce_interval: float = 1.5,
        max_wait: float = 5.0
    ):
        """
        Initialize FileWatcher.

        Args:
            callback: Function to call when watched files change
            debounce_interval: Seconds to wait after last change (default: 1.5s)
            max_wait: Maximum seconds before forcing trigger (default: 5.0s)
        """
        self.callback = callback
        self.debounce_interval = debounce_interval
        self.max_wait = max_wait
        self.observer: Optional[Observer] = None
        self.event_handler: Optional[DebouncedFileHandler] = None
        self.is_watching = False

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

        if self.is_watching:
            self.stop_watching()

        try:
            # Create event handler
            self.event_handler = DebouncedFileHandler(
                callback=self.callback,
                debounce_interval=self.debounce_interval,
                max_wait=self.max_wait
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
            return True

        except Exception:
            self.observer = None
            self.event_handler = None
            self.is_watching = False
            return False

    def stop_watching(self) -> None:
        """Stop watching for file changes."""
        # Cancel any pending timers first
        if self.event_handler is not None:
            self.event_handler.cancel_pending_timer()

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

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - automatically stop watching."""
        self.stop_watching()
        return False  # Don't suppress exceptions
