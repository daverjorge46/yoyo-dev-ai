"""
Yoyo Dev Textual TUI Application

Main application class that coordinates all TUI functionality.
"""

from pathlib import Path

from textual.app import App
from textual.binding import Binding

from .config import ConfigManager, TUIConfig
from .screens.main import MainScreen
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
        Binding("ctrl+p", "command_palette", "Command Palette", priority=True),
        Binding("/", "command_palette", "Search"),
        Binding("?", "help", "Help"),
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh"),
        Binding("g", "git_menu", "Git"),
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
        # Push main screen (Task 5 complete)
        self.push_screen(MainScreen())

        # Start file watcher (Task 3 complete)
        self.start_file_watcher()

    def action_command_palette(self) -> None:
        """
        Show command palette for fuzzy search of all Yoyo Dev commands.

        Bound to: Ctrl+P, /
        """
        # TODO: Implement in Task 10
        self.notify("Command palette - Coming soon in Task 10")

    def action_help(self) -> None:
        """
        Show help screen with keyboard shortcuts and tips.

        Bound to: ?
        """
        # TODO: Implement in Task 13
        self.notify("Help screen - Coming soon in Task 13")

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
        # TODO: Implement in Task 12
        self.notify("Git menu - Coming soon in Task 12")

    def action_quit(self) -> None:
        """
        Quit the application.

        Bound to: q
        """
        self.exit()

    def start_file_watcher(self) -> None:
        """
        Start file watcher service to monitor .yoyo-dev for changes.

        Watches for changes to tasks.md, state.json, and MASTER-TASKS.md files.
        Automatically refreshes TUI data when relevant files change.
        """
        # Find .yoyo-dev directory (look in current working directory)
        yoyo_dev_dir = Path.cwd() / ".yoyo-dev"

        if not yoyo_dev_dir.exists() or not yoyo_dev_dir.is_dir():
            # No .yoyo-dev directory, skip file watching
            return

        # Create FileWatcher with callback to refresh data
        # Using 1.5s debounce interval as specified in requirements
        self.file_watcher = FileWatcher(
            callback=self.on_file_change,
            debounce_interval=1.5
        )

        # Start watching .yoyo-dev directory recursively
        success = self.file_watcher.start_watching(yoyo_dev_dir)

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
