"""
Yoyo Dev TUI v3.0 - Main Application

Production-grade intelligent development dashboard.
"""

from pathlib import Path
from textual.app import App
from textual.binding import Binding

from .models import TUIConfig
from .config import ConfigManager


class YoyoDevTUIApp(App):
    """
    Yoyo Dev TUI Application.

    A modern, intelligent terminal user interface for AI-assisted development
    with real-time progress tracking, intelligent command suggestions, proactive
    error detection, and MCP server monitoring.

    Architecture:
    - EventBus: Central event pub/sub system
    - CacheManager: TTL-based cache for parsed data
    - DataManager: Centralized state management for specs/fixes/tasks
    - IntelligentCommandSuggester: Context-aware next-step recommendations
    - ErrorDetector: Proactive error monitoring
    - MCPServerMonitor: MCP server connection monitoring
    - RefreshService: Periodic polling (10s) + manual refresh
    """

    TITLE = "Yoyo Dev v3.0 - AI-Assisted Development"
    CSS_PATH = "styles.css"

    BINDINGS = [
        Binding("?", "help", "Help", priority=True),
        Binding("/", "command_search", "Commands"),
        Binding("r", "refresh", "Refresh"),
        Binding("g", "git_menu", "Git"),
        Binding("t", "focus_active_work", "Tasks"),
        Binding("s", "focus_specs", "Specs"),
        Binding("h", "focus_history", "History"),
        Binding("q", "quit", "Quit"),
    ]

    def __init__(self, *args, **kwargs):
        """Initialize the application."""
        super().__init__(*args, **kwargs)

        # Load configuration
        self.config: TUIConfig = ConfigManager.load()

        # Services will be initialized in on_mount
        self.event_bus = None
        self.cache_manager = None
        self.data_manager = None
        self.command_suggester = None
        self.error_detector = None
        self.mcp_monitor = None
        self.refresh_service = None

    def on_mount(self) -> None:
        """
        Called when the app is mounted.

        Initializes screens, services, and starts periodic refresh.
        """
        # TODO: Initialize services
        # self.event_bus = EventBus()
        # self.cache_manager = CacheManager(default_ttl=self.config.cache_ttl_seconds)
        # self.data_manager = DataManager(...)
        # self.command_suggester = IntelligentCommandSuggester(...)
        # self.error_detector = ErrorDetector(...)
        # self.mcp_monitor = MCPServerMonitor(...)
        # self.refresh_service = RefreshService(...)

        # TODO: Load initial data
        # self.data_manager.initialize()

        # TODO: Push main dashboard screen
        # self.push_screen(MainDashboard(...))

        # TODO: Start periodic refresh if enabled
        # if self.config.refresh_interval_seconds > 0:
        #     self.refresh_service.start()

        pass

    def action_help(self) -> None:
        """
        Show help screen with keyboard shortcuts and tips.

        Bound to: ? key
        """
        # TODO: Implement
        self.notify("Help screen - Coming soon")

    def action_command_search(self) -> None:
        """
        Focus command search in command palette.

        Bound to: / key
        """
        # TODO: Implement
        self.notify("Command search - Coming soon")

    def action_refresh(self) -> None:
        """
        Force immediate refresh of all data (manual refresh).

        Triggers DataManager to reload all data from file system.
        Updates command suggestions, error detection, and MCP status.

        Bound to: r key
        """
        # TODO: Implement
        self.notify("Manual refresh - Coming soon")

    def action_git_menu(self) -> None:
        """
        Show git quick actions menu (stage, commit, push).

        Bound to: g key
        """
        # TODO: Implement
        self.notify("Git menu - Coming soon")

    def action_focus_active_work(self) -> None:
        """
        Focus on the active work panel (task tree).

        Bound to: t key
        """
        # TODO: Implement
        self.notify("Focus active work - Coming soon")

    def action_focus_specs(self) -> None:
        """
        Focus on the specs/fixes list.

        Bound to: s key
        """
        # TODO: Implement
        self.notify("Focus specs - Coming soon")

    def action_focus_history(self) -> None:
        """
        Focus on the history panel.

        Bound to: h key
        """
        # TODO: Implement
        self.notify("Focus history - Coming soon")

    def action_quit(self) -> None:
        """
        Quit the application.

        Bound to: q key
        """
        self.exit()

    def on_unmount(self) -> None:
        """Called when app is unmounting. Clean up resources."""
        # TODO: Stop refresh service
        # if self.refresh_service:
        #     self.refresh_service.stop()
        pass


# Application instance creation helper
def create_app() -> YoyoDevTUIApp:
    """
    Create and configure the Yoyo Dev TUI application.

    Returns:
        Configured YoyoDevTUIApp instance ready to run
    """
    return YoyoDevTUIApp()
