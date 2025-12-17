"""
MainDashboard screen for Yoyo Dev TUI v3.

Main dashboard with 3-panel layout: ActiveWork | CommandPalette | History
"""

from textual.screen import Screen
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Header, Footer
from textual.binding import Binding
from textual.events import Click

from ..widgets.status_bar import StatusBar
from ..widgets.project_overview import ProjectOverview
from ..widgets.active_work_panel import ActiveWorkPanel
from ..widgets.command_palette import CommandPalettePanel
from ..widgets.history_panel import HistoryPanel
from ..widgets.execution_monitor import ExecutionMonitor
from ..widgets.keyboard_shortcuts import KeyboardShortcuts
from ..models import EventType, Event
from ..services.memory_bridge import MemoryBridge
from .help_screen import HelpScreen
from .commands_screen import CommandsScreen
from .git_screen import GitScreen
from .tasks_screen import TasksScreen
from .specs_screen import SpecsScreen
from .history_screen import HistoryScreen


class MainDashboard(Screen):
    """
    Main dashboard screen with intelligent panels.

    Layout:
    ┌─────────────────────────────────────────────────────────┐
    │ StatusBar                                                │
    ├─────────────────────────────────────────────────────────┤
    │ ProjectOverview                                          │
    ├──────────────┬───────────────────┬──────────────────────┤
    │ ActiveWork   │ CommandPalette    │ History              │
    │ (30%)        │ (40%)             │ (30%)                │
    │              │                   │                      │
    │ [t] focus    │ [s] focus         │ [h] focus            │
    ├──────────────┴───────────────────┴──────────────────────┤
    │ ExecutionMonitor (shown when task executing)             │
    ├──────────────────────────────────────────────────────────┤
    │ KeyboardShortcuts                                        │
    └──────────────────────────────────────────────────────────┘

    Keyboard Shortcuts:
    - ?: Help
    - /: Command search
    - r: Refresh
    - g: Git menu
    - t: Focus active work
    - s: Focus specs/command palette
    - h: Focus history
    - q: Quit
    """

    BINDINGS = [
        Binding("?", "help", "Help"),
        Binding("/", "command_search", "Commands"),
        Binding("r", "refresh", "Refresh"),
        Binding("g", "git_menu", "Git"),
        Binding("t", "focus_active_work", "Tasks"),
        Binding("s", "focus_specs", "Specs"),
        Binding("h", "focus_history", "History"),
        Binding("q", "quit", "Quit"),
    ]

    CSS = """
    MainDashboard {
        layout: vertical;
    }

    #main-panels {
        layout: horizontal;
        height: 1fr;
    }

    /* Unified panel styling - all panels share same background and border */
    #active-work-panel,
    #command-palette-panel,
    #history-panel {
        background: $panel;
        border: solid $primary;
        padding: 1;
    }

    #active-work-panel {
        width: 30%;
        margin-right: 1;
    }

    #command-palette-panel {
        width: 40%;
        margin-right: 1;
    }

    #history-panel {
        width: 30%;
    }

    .panel-focused {
        border: double $success;
    }

    /* Clickable elements */
    .clickable:hover {
        background: $surface-lighten-1;
    }

    .copyable-command:hover {
        background: $primary-darken-2;
        text-style: bold;
    }
    """

    def __init__(
        self,
        data_manager,
        event_bus,
        command_suggester,
        error_detector,
        mcp_monitor,
        memory_bridge=None,
        **kwargs
    ):
        """
        Initialize MainDashboard.

        Args:
            data_manager: DataManager instance
            event_bus: EventBus instance
            command_suggester: IntelligentCommandSuggester instance
            error_detector: ErrorDetector instance
            mcp_monitor: MCPServerMonitor instance
            memory_bridge: MemoryBridge instance (optional)
        """
        super().__init__(**kwargs)

        # Store services
        self.data_manager = data_manager
        self.event_bus = event_bus
        self.command_suggester = command_suggester
        self.error_detector = error_detector
        self.mcp_monitor = mcp_monitor
        self.memory_bridge = memory_bridge

        # Track focused panel
        self.focused_panel = "active_work"

        # Track event subscriptions for cleanup
        self._subscriptions = []

        # Widget references (set during compose)
        self._status_bar = None
        self._project_overview = None
        self._active_work_panel = None
        self._command_palette_panel = None
        self._history_panel = None
        self._execution_monitor = None
        self._keyboard_shortcuts = None

    def compose(self):
        """Compose the dashboard layout."""
        # Status bar at top
        self._status_bar = StatusBar(
            data_manager=self.data_manager,
            event_bus=self.event_bus,
            id="status-bar"
        )
        yield self._status_bar

        # Project overview
        self._project_overview = ProjectOverview(
            data_manager=self.data_manager,
            event_bus=self.event_bus,
            mcp_monitor=self.mcp_monitor,
            memory_bridge=self.memory_bridge
        )
        yield self._project_overview

        # Main 3-panel layout
        with Container(id="main-panels"):
            # Left panel: Active work
            self._active_work_panel = ActiveWorkPanel(
                data_manager=self.data_manager,
                event_bus=self.event_bus,
                id="active-work-panel"
            )
            yield self._active_work_panel

            # Center panel: Command palette
            self._command_palette_panel = CommandPalettePanel(
                data_manager=self.data_manager,
                event_bus=self.event_bus,
                command_suggester=self.command_suggester,
                error_detector=self.error_detector,
                id="command-palette-panel"
            )
            yield self._command_palette_panel

            # Right panel: History
            self._history_panel = HistoryPanel(
                data_manager=self.data_manager,
                event_bus=self.event_bus,
                id="history-panel"
            )
            yield self._history_panel

        # Execution monitor (docked at bottom, hidden by default)
        self._execution_monitor = ExecutionMonitor(
            event_bus=self.event_bus
        )
        yield self._execution_monitor

        # Keyboard shortcuts footer (docked at bottom)
        self._keyboard_shortcuts = KeyboardShortcuts()
        yield self._keyboard_shortcuts

    def on_mount(self) -> None:
        """Called when screen is mounted."""
        # Subscribe to events (store references for cleanup)
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        self._subscriptions.append((EventType.ERROR_DETECTED, self._on_error_detected))
        self.event_bus.subscribe(EventType.ERROR_DETECTED, self._on_error_detected)

        self._subscriptions.append((EventType.COMMAND_SUGGESTIONS_UPDATED, self._on_command_suggestions_updated))
        self.event_bus.subscribe(
            EventType.COMMAND_SUGGESTIONS_UPDATED,
            self._on_command_suggestions_updated
        )

        self._subscriptions.append((EventType.EXECUTION_STARTED, self._on_execution_started))
        self.event_bus.subscribe(
            EventType.EXECUTION_STARTED,
            self._on_execution_started
        )

        self._subscriptions.append((EventType.EXECUTION_COMPLETED, self._on_execution_completed))
        self.event_bus.subscribe(
            EventType.EXECUTION_COMPLETED,
            self._on_execution_completed
        )

        # Apply initial responsive layout
        self._apply_responsive_layout()

        # Initial data load
        self.refresh_all_panels()

    def on_resize(self, event) -> None:
        """Handle terminal resize events."""
        self._apply_responsive_layout()

    def on_unmount(self) -> None:
        """Called when screen is unmounted."""
        # Unsubscribe all event handlers to prevent memory leaks
        for event_type, handler in self._subscriptions:
            self.event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    # ========================================================================
    # Click Handlers for Panel Focus
    # ========================================================================

    def on_active_work_panel_task_clicked(self, message: ActiveWorkPanel.TaskClicked) -> None:
        """Handle task click from ActiveWorkPanel."""
        self.focused_panel = "active_work"
        self._update_panel_focus_styles()

    def on_active_work_panel_link_clicked(self, message: ActiveWorkPanel.LinkClicked) -> None:
        """Handle link click from ActiveWorkPanel."""
        if message.link_type == "specs":
            self.action_focus_specs()
        elif message.link_type == "fixes":
            # Navigate to fixes (future implementation)
            pass

    def on_command_palette_panel_command_copied(self, message: CommandPalettePanel.CommandCopied) -> None:
        """Handle command copy from CommandPalettePanel."""
        self.focused_panel = "command_palette"
        self._update_panel_focus_styles()
        # Notification is handled in the panel itself

    def on_command_palette_panel_command_clicked(self, message: CommandPalettePanel.CommandClicked) -> None:
        """Handle command click from CommandPalettePanel."""
        self.focused_panel = "command_palette"
        self._update_panel_focus_styles()

    def on_history_panel_entry_clicked(self, message: HistoryPanel.EntryClicked) -> None:
        """Handle entry click from HistoryPanel."""
        self.focused_panel = "history"
        self._update_panel_focus_styles()

    def on_history_panel_view_all_clicked(self, message: HistoryPanel.ViewAllClicked) -> None:
        """Handle View All click from HistoryPanel."""
        self.action_focus_history()

    def on_project_overview_expand_toggled(self, message: ProjectOverview.ExpandToggled) -> None:
        """Handle expand/collapse toggle from ProjectOverview."""
        # Just acknowledge the toggle, no navigation needed
        pass

    # ========================================================================
    # Event Handlers
    # ========================================================================

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self.refresh_all_panels()

    def _on_error_detected(self, event: Event) -> None:
        """Handle ERROR_DETECTED events."""
        # Command palette will auto-update via its own subscription
        if self._status_bar:
            self._status_bar.set_activity_status("error")

    def _on_command_suggestions_updated(self, event: Event) -> None:
        """Handle COMMAND_SUGGESTIONS_UPDATED events."""
        # Command palette will auto-update via its own subscription
        pass

    def _on_execution_started(self, event: Event) -> None:
        """Handle EXECUTION_STARTED events."""
        # Show execution monitor (future implementation)
        if self._status_bar:
            self._status_bar.set_activity_status("active")

    def _on_execution_completed(self, event: Event) -> None:
        """Handle EXECUTION_COMPLETED events."""
        # Hide execution monitor (future implementation)
        if self._status_bar:
            self._status_bar.set_activity_status("idle")

    # ========================================================================
    # Actions (Keyboard Shortcuts)
    # ========================================================================

    def action_help(self) -> None:
        """Show help screen."""
        self.app.push_screen(HelpScreen())

    def action_command_search(self) -> None:
        """Open commands screen."""
        self.app.push_screen(CommandsScreen())

    def action_refresh(self) -> None:
        """Manually refresh all panels."""
        # Trigger fresh data fetch via app's refresh service
        if hasattr(self.app, 'refresh_service') and self.app.refresh_service:
            self.app.refresh_service.refresh_now()

        self.refresh_all_panels()
        self.notify("Dashboard refreshed", severity="information")

    def action_git_menu(self) -> None:
        """Show git menu."""
        self.app.push_screen(GitScreen())

    def action_focus_active_work(self) -> None:
        """Open tasks detail screen."""
        self.app.push_screen(TasksScreen(
            data_manager=self.data_manager,
            event_bus=self.event_bus
        ))

    def action_focus_specs(self) -> None:
        """Open specs list screen."""
        self.app.push_screen(SpecsScreen(
            data_manager=self.data_manager,
            event_bus=self.event_bus
        ))

    def action_focus_history(self) -> None:
        """Open history detail screen."""
        self.app.push_screen(HistoryScreen(
            data_manager=self.data_manager,
            event_bus=self.event_bus
        ))

    def action_quit(self) -> None:
        """Quit the application."""
        self.app.exit()

    # ========================================================================
    # Panel Management
    # ========================================================================

    def refresh_all_panels(self) -> None:
        """Refresh all dashboard panels."""
        try:
            # Refresh each widget
            if self._status_bar:
                self._status_bar.refresh_display()

            if self._project_overview:
                self._project_overview.refresh_display()

            if self._active_work_panel:
                self._active_work_panel.refresh_display()

            if self._command_palette_panel:
                self._command_palette_panel.refresh_display()

            if self._history_panel:
                self._history_panel.refresh_display()

        except Exception as e:
            # Log error but don't crash
            self.notify(f"Refresh error: {e}", severity="error")

    def _update_panel_focus_styles(self) -> None:
        """Update panel styles based on focus."""
        # Remove focus class from all panels
        if self._active_work_panel:
            self._active_work_panel.remove_class("panel-focused")

        if self._command_palette_panel:
            self._command_palette_panel.remove_class("panel-focused")

        if self._history_panel:
            self._history_panel.remove_class("panel-focused")

        # Add focus class to current panel
        if self.focused_panel == "active_work" and self._active_work_panel:
            self._active_work_panel.add_class("panel-focused")
        elif self.focused_panel == "command_palette" and self._command_palette_panel:
            self._command_palette_panel.add_class("panel-focused")
        elif self.focused_panel == "history" and self._history_panel:
            self._history_panel.add_class("panel-focused")

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _update_status_bar(self) -> None:
        """Update status bar."""
        if self._status_bar:
            self._status_bar.refresh_display()

    def _update_project_overview(self) -> None:
        """Update project overview."""
        if self._project_overview:
            self._project_overview.refresh_display()

    def _update_active_work_panel(self) -> None:
        """Update active work panel."""
        if self._active_work_panel:
            self._active_work_panel.refresh_display()

    def _update_command_palette_panel(self) -> None:
        """Update command palette panel."""
        if self._command_palette_panel:
            self._command_palette_panel.refresh_display()

    def _update_history_panel(self) -> None:
        """Update history panel."""
        if self._history_panel:
            self._history_panel.refresh_display()

    # ========================================================================
    # Responsive Layout
    # ========================================================================

    def _apply_responsive_layout(self) -> None:
        """
        Apply responsive layout based on terminal size.

        Breakpoints:
        - < 80 cols: Vertical stacked layout (all panels 100% width)
        - >= 80 cols: Horizontal 3-panel layout (30% | 40% | 30%)
        """
        try:
            terminal_width = self.size.width

            # Get the main panels container
            main_panels_container = self.query_one("#main-panels", Container)

            if terminal_width < 80:
                # Small screen: Vertical layout
                main_panels_container.styles.layout = "vertical"

                # All panels take full width
                if self._active_work_panel:
                    self._active_work_panel.styles.width = "100%"

                if self._command_palette_panel:
                    self._command_palette_panel.styles.width = "100%"

                if self._history_panel:
                    self._history_panel.styles.width = "100%"

            else:
                # Large screen: Horizontal layout
                main_panels_container.styles.layout = "horizontal"

                # Standard 3-panel layout
                if self._active_work_panel:
                    self._active_work_panel.styles.width = "30%"

                if self._command_palette_panel:
                    self._command_palette_panel.styles.width = "40%"

                if self._history_panel:
                    self._history_panel.styles.width = "30%"

        except Exception as e:
            # Silently fail if layout adjustment has issues
            # (screen might not be fully mounted yet)
            pass
