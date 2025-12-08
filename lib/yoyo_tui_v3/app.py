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
        from .services.event_bus import EventBus
        from .services.cache_manager import CacheManager
        from .services.data_manager import DataManager
        from .services.command_suggester import IntelligentCommandSuggester
        from .services.error_detector import ErrorDetector
        from .services.mcp_monitor import MCPServerMonitor
        from .services.refresh_service import RefreshService
        from .screens.main_dashboard import MainDashboard

        # Initialize services in dependency order
        # 1. EventBus (no dependencies)
        self.event_bus = EventBus()

        # 2. CacheManager (no dependencies)
        self.cache_manager = CacheManager(default_ttl=self.config.cache_ttl_seconds)

        # 3. DataManager (depends on EventBus, CacheManager)
        self.data_manager = DataManager(
            event_bus=self.event_bus,
            cache_manager=self.cache_manager,
            yoyo_dev_path=self.config.yoyo_dev_path
        )

        # 4. IntelligentCommandSuggester (depends on DataManager, EventBus)
        self.command_suggester = IntelligentCommandSuggester(
            data_manager=self.data_manager,
            event_bus=self.event_bus,
            yoyo_dev_path=self.config.yoyo_dev_path
        )

        # 5. ErrorDetector (depends on EventBus)
        self.error_detector = ErrorDetector(
            event_bus=self.event_bus,
            yoyo_dev_path=self.config.yoyo_dev_path
        )

        # Set services on DataManager (circular dependency resolution)
        self.data_manager.command_suggester = self.command_suggester
        self.data_manager.error_detector = self.error_detector

        # 6. MCPServerMonitor (depends on EventBus)
        self.mcp_monitor = MCPServerMonitor(event_bus=self.event_bus)

        # Wire mcp_monitor to data_manager for MCP status display
        self.data_manager.mcp_monitor = self.mcp_monitor

        # Do initial MCP status check before dashboard loads
        self.mcp_monitor.check_mcp_status()

        # 7. RefreshService (depends on all above)
        self.refresh_service = RefreshService(
            data_manager=self.data_manager,
            command_suggester=self.command_suggester,
            error_detector=self.error_detector,
            mcp_monitor=self.mcp_monitor,
            event_bus=self.event_bus
        )

        # Load initial data
        self.data_manager.initialize()

        # Push main dashboard screen
        main_dashboard = MainDashboard(
            data_manager=self.data_manager,
            event_bus=self.event_bus,
            command_suggester=self.command_suggester,
            error_detector=self.error_detector,
            mcp_monitor=self.mcp_monitor
        )
        self.push_screen(main_dashboard)

        # Start periodic refresh if enabled
        if self.config.refresh_interval_seconds > 0:
            self.refresh_service.start()

    def action_help(self) -> None:
        """
        Show help screen with keyboard shortcuts and tips.

        Bound to: ? key
        """
        # Delegate to current screen if it has the action
        if hasattr(self.screen, 'action_help'):
            self.screen.action_help()
        else:
            self.notify("Help screen - Coming soon", severity="information")

    def action_command_search(self) -> None:
        """
        Focus command search in command palette.

        Bound to: / key
        """
        # Delegate to current screen
        if hasattr(self.screen, 'action_command_search'):
            self.screen.action_command_search()
        else:
            self.notify("Command search", severity="information")

    def action_refresh(self) -> None:
        """
        Force immediate refresh of all data (manual refresh).

        Triggers DataManager to reload all data from file system.
        Updates command suggestions, error detection, and MCP status.

        Bound to: r key
        """
        # Trigger refresh service if available
        if self.refresh_service:
            self.refresh_service.refresh_now()

        # Delegate to current screen for UI refresh
        if hasattr(self.screen, 'action_refresh'):
            self.screen.action_refresh()
        else:
            self.notify("Refreshed", severity="information")

    def action_git_menu(self) -> None:
        """
        Show git quick actions menu (stage, commit, push).

        Bound to: g key
        """
        # Delegate to current screen
        if hasattr(self.screen, 'action_git_menu'):
            self.screen.action_git_menu()
        else:
            self.notify("Git menu - Coming soon", severity="information")

    def action_focus_active_work(self) -> None:
        """
        Focus on the active work panel (task tree).

        Bound to: t key
        """
        # Delegate to current screen
        if hasattr(self.screen, 'action_focus_active_work'):
            self.screen.action_focus_active_work()

    def action_focus_specs(self) -> None:
        """
        Focus on the specs/fixes list.

        Bound to: s key
        """
        # Delegate to current screen
        if hasattr(self.screen, 'action_focus_specs'):
            self.screen.action_focus_specs()

    def action_focus_history(self) -> None:
        """
        Focus on the history panel.

        Bound to: h key
        """
        # Delegate to current screen
        if hasattr(self.screen, 'action_focus_history'):
            self.screen.action_focus_history()

    def action_quit(self) -> None:
        """
        Quit the application.

        Bound to: q key
        """
        self.exit()

    def on_unmount(self) -> None:
        """Called when app is unmounting. Clean up resources."""
        # Stop refresh service
        if self.refresh_service:
            self.refresh_service.stop()

        # Clean up other resources if needed
        # (Most services clean up automatically)


# Application instance creation helper
def create_app() -> YoyoDevTUIApp:
    """
    Create and configure the Yoyo Dev TUI application.

    Returns:
        Configured YoyoDevTUIApp instance ready to run
    """
    return YoyoDevTUIApp()
