"""
Yoyo Dev Textual TUI Application

Main application class that coordinates all TUI functionality.
"""

from pathlib import Path

from textual.app import App
from textual.binding import Binding

from .config import ConfigManager, TUIConfig
from .screens.main import MainScreen
from .screens.help_screen import HelpScreen
from .screens.command_palette import CommandPaletteScreen
from .services.event_bus import EventBus
from .services.cache_manager import CacheManager
from .services.data_manager import DataManager
from .services.file_watcher import FileWatcher
from .models import EventType


class YoyoDevApp(App):
    """
    Yoyo Dev Textual TUI Application.

    A modern, interactive terminal user interface for AI-assisted development
    with Yoyo Dev. Provides task management, git integration, command palette,
    and real-time file watching.

    Architecture:
    - EventBus: Central event pub/sub system
    - CacheManager: TTL-based cache for parsed data
    - DataManager: Centralized state management for specs/fixes/tasks
    - FileWatcher: Monitors file changes and emits events
    """

    TITLE = "Yoyo Dev - AI-Assisted Development"
    CSS_PATH = "styles.css"

    BINDINGS = [
        Binding("ctrl+p", "command_palette", "Commands", priority=True),
        Binding("/", "command_palette", "Command Palette"),
        Binding("?", "help", "Help"),
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh"),
        Binding("g", "git_menu", "Git"),
        Binding("t", "focus_tasks", "Tasks"),
        Binding("s", "focus_specs", "Specs"),
    ]

    def __init__(self, *args, **kwargs):
        """Initialize the application."""
        super().__init__(*args, **kwargs)

        # Load configuration
        self.config: TUIConfig = ConfigManager.load()

        # Initialize event-driven architecture
        self.event_bus = EventBus(enable_logging=True)
        self.cache_manager = CacheManager(default_ttl=300)  # 5 min cache TTL
        self.data_manager = None  # Will be initialized in on_mount
        self.file_watcher = None  # Will be initialized in on_mount

        # Subscribe to STATE_UPDATED events for UI refresh
        self.event_bus.subscribe(EventType.STATE_UPDATED, self.on_state_updated)

    def on_mount(self) -> None:
        """
        Called when the app is mounted.

        Initializes screens, services, and starts file watching.
        """
        # Initialize DataManager with .yoyo-dev path
        cwd = Path.cwd()
        yoyo_dev_path = cwd / ".yoyo-dev"

        self.data_manager = DataManager(
            yoyo_dev_path=yoyo_dev_path,
            event_bus=self.event_bus,
            cache_manager=self.cache_manager
        )

        # Load initial data
        self.data_manager.initialize()

        # Push main screen with config and data_manager
        self.push_screen(MainScreen(config=self.config, data_manager=self.data_manager))

        # Start file watcher if enabled
        if self.config.file_watching:
            self.start_file_watcher()

    def action_command_palette(self) -> None:
        """
        Show command palette for fuzzy search of all Yoyo Dev commands.

        Bound to: Ctrl+P
        """
        self.push_screen(CommandPaletteScreen())

    def action_help(self) -> None:
        """
        Show help screen with keyboard shortcuts and tips.

        Bound to: ?
        """
        self.push_screen(HelpScreen())

    def action_refresh(self) -> None:
        """
        Force refresh of all data (specs, fixes, tasks, recaps).

        Triggers DataManager to reload all data from file system.
        DataManager will emit STATE_UPDATED event, which triggers UI refresh.

        Bound to: r
        """
        try:
            if self.data_manager:
                self.data_manager.refresh_all()
                self.notify("Refreshing data...", severity="information", timeout=1)
            else:
                self.notify("Data manager not initialized", severity="error", timeout=2)
        except Exception:
            self.notify("Could not refresh data", severity="error", timeout=3)

    def action_git_menu(self) -> None:
        """
        Show git quick actions menu (stage, commit, push).

        Bound to: g
        """
        self.notify("Git menu - Coming soon")

    def action_focus_tasks(self) -> None:
        """
        Focus on the tasks panel in the dashboard.

        Bound to: t
        """
        try:
            from .widgets import TaskTree
            main_screen = self.screen
            if isinstance(main_screen, MainScreen):
                task_tree = main_screen.query_one(TaskTree)
                task_tree.focus()
                self.notify("Tasks focused", severity="information", timeout=1)
        except Exception:
            self.notify("Could not focus tasks", severity="warning", timeout=2)

    def action_focus_specs(self) -> None:
        """
        Focus on the specs/fixes panel in the dashboard.

        Bound to: s
        """
        try:
            from .widgets import SpecList
            main_screen = self.screen
            if isinstance(main_screen, MainScreen):
                spec_list = main_screen.query_one(SpecList)
                spec_list.focus()
                self.notify("Specs focused", severity="information", timeout=1)
        except Exception:
            self.notify("Could not focus specs", severity="warning", timeout=2)

    def action_quit(self) -> None:
        """
        Quit the application.

        Bound to: q
        """
        self.exit()

    def start_file_watcher(self) -> None:
        """
        Start file watcher service to monitor .yoyo-dev for changes.

        Watches for changes to specs, fixes, recaps, and emits events via EventBus.
        DataManager subscribes to these events and automatically updates state.

        The new architecture uses event-driven updates instead of callbacks.
        """
        # Get .yoyo-dev path
        cwd = Path.cwd()
        yoyo_dev_path = cwd / ".yoyo-dev"

        if not yoyo_dev_path.exists():
            self.notify("No .yoyo-dev directory found", severity="warning", timeout=3)
            return

        # Create FileWatcher with EventBus integration
        self.file_watcher = FileWatcher(
            event_bus=self.event_bus,
            debounce_window=1.5,  # 1.5s debounce window
            max_wait=5.0  # 5s max wait
        )

        # Start watching .yoyo-dev directory recursively
        success = self.file_watcher.start_watching(yoyo_dev_path)

        if success:
            self.notify("File watching enabled", severity="information", timeout=2)
        else:
            self.notify("Could not enable file watching", severity="warning", timeout=3)

    def on_state_updated(self, event) -> None:
        """
        Event handler for STATE_UPDATED events.

        Called when DataManager updates state (from file changes or refresh).
        Refreshes UI to reflect updated data.

        Args:
            event: STATE_UPDATED event from EventBus
        """
        try:
            # Get MainScreen and refresh UI
            main_screen = self.screen
            if isinstance(main_screen, MainScreen):
                main_screen.refresh_all_data()
                # Notify user only on explicit file changes (not on initial load)
                if event.data.get("source") != "initialize":
                    self.notify("Data updated", severity="information", timeout=1)
        except Exception:
            # Silently ignore errors to keep event system running
            pass

    def stop_file_watcher(self) -> None:
        """Stop file watcher service."""
        if self.file_watcher:
            self.file_watcher.stop_watching()
            self.file_watcher = None

    def action_refresh(self) -> None:
        """
        Refresh dashboard data manually.

        Bound to: r key
        Triggers a manual refresh of all data in the UI.
        """
        try:
            main_screen = self.screen
            if isinstance(main_screen, MainScreen):
                main_screen.refresh_all_data()
                self.notify("Data refreshed", severity="information", timeout=1)
        except Exception:
            # Silently ignore errors
            pass

    def on_unmount(self) -> None:
        """Called when app is unmounting. Clean up resources."""
        self.stop_file_watcher()


# Application instance creation helper
def create_app() -> YoyoDevApp:
    """
    Create and configure the Yoyo Dev TUI application.

    Returns:
        Configured YoyoDevApp instance ready to run
    """
    return YoyoDevApp()
