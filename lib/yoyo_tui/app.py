"""
Yoyo Dev Textual TUI Application

Main application class that coordinates all TUI functionality.
"""

from textual.app import App
from textual.binding import Binding

from .config import ConfigManager, TUIConfig
from .screens.main import MainScreen


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

        # TODO: Start file watcher when implemented (Task 2 already has FileWatcher service)
        # self.start_file_watcher()

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
        # TODO: Implement data refresh logic
        self.notify("Refreshing data...")

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
        """
        # TODO: Implement file watcher integration (Task 2 service exists)
        pass

    def stop_file_watcher(self) -> None:
        """Stop file watcher service."""
        if self.file_watcher:
            self.file_watcher.stop()
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
