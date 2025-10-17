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
from .services.file_watcher import FileWatcher


class YoyoDevApp(App):
    """
    Yoyo Dev Textual TUI Application.

    A modern, interactive terminal user interface for AI-assisted development
    with Yoyo Dev. Provides task management, git integration, command palette,
    and real-time file watching.
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

        # Initialize services (will be set up in on_mount)
        self.file_watcher = None

    def on_mount(self) -> None:
        """
        Called when the app is mounted.

        Initializes screens, services, and starts file watching.
        """
        # Push main screen with config
        self.push_screen(MainScreen(config=self.config))

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
        Force refresh of all data (tasks, specs, git status).

        Bound to: r
        """
        try:
            main_screen = self.screen
            if isinstance(main_screen, MainScreen):
                main_screen.refresh_all_data()
                self.notify("Data refreshed", severity="information", timeout=2)
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
        Start file watcher service to monitor both CWD and .yoyo-dev for changes.

        Watches for changes to tasks.md, state.json, and MASTER-TASKS.md files
        in both the current working directory and .yoyo-dev directory.
        Automatically refreshes TUI data when relevant files change.

        Uses config values for debounce_interval and max_wait (Task 8).
        """
        # Get current working directory
        cwd = Path.cwd()

        # Create FileWatcher with callback to refresh data
        # Use config values for debounce and max-wait
        self.file_watcher = FileWatcher(
            callback=self.on_file_change,
            debounce_interval=self.config.file_watcher_debounce,
            max_wait=self.config.file_watcher_max_wait
        )

        # Start watching current working directory recursively
        # This will watch both CWD and .yoyo-dev subdirectory
        success = self.file_watcher.start_watching(cwd)

        if success:
            self.notify("File watching enabled", severity="information", timeout=2)
        else:
            self.notify("Could not enable file watching", severity="warning", timeout=3)

    def on_file_change(self) -> None:
        """
        Callback triggered when watched files change.

        Refreshes all data in the MainScreen to reflect file changes.
        Called by FileWatcher with debouncing to prevent spam.
        """
        try:
            # Get MainScreen and refresh all data
            main_screen = self.screen
            if isinstance(main_screen, MainScreen):
                main_screen.refresh_all_data()
                self.notify("Data refreshed", severity="information", timeout=1)
        except Exception:
            # Silently ignore errors to keep watcher running
            pass

    def stop_file_watcher(self) -> None:
        """Stop file watcher service."""
        if self.file_watcher:
            self.file_watcher.stop_watching()
            self.file_watcher = None

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
