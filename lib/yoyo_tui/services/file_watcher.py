"""
FileWatcher Service

Watches file system for changes to tasks.md, state.json, and other relevant files.
Implements debouncing to prevent callback spam during rapid file changes.
"""

import time
from pathlib import Path
from typing import Callable, Optional

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent


class DebouncedFileHandler(FileSystemEventHandler):
    """
    File system event handler with debouncing.

    Prevents callback spam by only triggering after a quiet period.
    """

    def __init__(self, callback: Callable[[], None], debounce_interval: float = 0.5):
        """
        Initialize handler.

        Args:
            callback: Function to call when files change
            debounce_interval: Minimum seconds between callback invocations
        """
        super().__init__()
        self.callback = callback
        self.debounce_interval = debounce_interval
        self.last_trigger_time = 0.0

        # Only watch these specific files
        self.watched_files = {
            'tasks.md',
            'MASTER-TASKS.md',
            'state.json',
            'spec.md',
            'spec-lite.md'
        }

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

        # Debounce: only trigger if enough time has passed
        now = time.time()
        if now - self.last_trigger_time > self.debounce_interval:
            self.last_trigger_time = now
            try:
                self.callback()
            except Exception:
                # Silently ignore callback errors to keep watcher running
                pass

    def on_created(self, event: FileSystemEvent) -> None:
        """
        Handle file creation events (treat same as modification).

        Args:
            event: File system event
        """
        self.on_modified(event)


class FileWatcher:
    """
    Watch file system for changes and trigger callbacks.

    Features:
    - Recursive directory watching
    - Debouncing to prevent callback spam
    - Filters for relevant files only
    - Context manager support for automatic cleanup
    """

    def __init__(
        self,
        callback: Callable[[], None],
        debounce_interval: float = 0.5
    ):
        """
        Initialize FileWatcher.

        Args:
            callback: Function to call when watched files change
            debounce_interval: Minimum seconds between callbacks (default: 0.5)
        """
        self.callback = callback
        self.debounce_interval = debounce_interval
        self.observer: Optional[Observer] = None
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
            event_handler = DebouncedFileHandler(
                callback=self.callback,
                debounce_interval=self.debounce_interval
            )

            # Create and start observer
            self.observer = Observer()
            self.observer.schedule(
                event_handler,
                str(directory),
                recursive=True
            )
            self.observer.start()

            self.is_watching = True
            return True

        except Exception:
            self.observer = None
            self.is_watching = False
            return False

    def stop_watching(self) -> None:
        """Stop watching for file changes."""
        if self.observer is not None:
            try:
                self.observer.stop()
                self.observer.join(timeout=1.0)
            except Exception:
                pass  # Ignore errors during shutdown
            finally:
                self.observer = None
                self.is_watching = False

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - automatically stop watching."""
        self.stop_watching()
        return False  # Don't suppress exceptions
