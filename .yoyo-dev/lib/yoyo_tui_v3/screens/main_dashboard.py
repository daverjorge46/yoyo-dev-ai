"""
MainDashboard screen for Yoyo Dev TUI v3.

Main dashboard with 3-panel layout: ActiveWork | CommandPalette | History
"""

from textual.screen import Screen
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Header, Footer
from textual.binding import Binding

from ..widgets.status_bar import StatusBar
from ..widgets.project_overview import ProjectOverview
from ..widgets.active_work_panel import ActiveWorkPanel
from ..widgets.command_palette import CommandPalettePanel
from ..widgets.history_panel import HistoryPanel
from ..widgets.execution_monitor import ExecutionMonitor
from ..widgets.keyboard_shortcuts import KeyboardShortcuts
from ..models import EventType, Event


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

    #active-work-panel {
        width: 30%;
        border: solid $primary;
        padding: 1;
    }

    #command-palette-panel {
        width: 40%;
        border: solid $secondary;
        padding: 1;
    }

    #history-panel {
        width: 30%;
        border: solid $accent;
        padding: 1;
    }

    .panel-focused {
        border: double $success;
    }
    """

    def __init__(
        self,
        data_manager,
        event_bus,
        command_suggester,
        error_detector,
        mcp_monitor,
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
        """
        super().__init__(**kwargs)

        # Store services
        self.data_manager = data_manager
        self.event_bus = event_bus
        self.command_suggester = command_suggester
        self.error_detector = error_detector
        self.mcp_monitor = mcp_monitor

        # Track focused panel
        self.focused_panel = "active_work"

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
            event_bus=self.event_bus
        )
        yield self._status_bar

        # Project overview
        self._project_overview = ProjectOverview(
            data_manager=self.data_manager,
            event_bus=self.event_bus,
            mcp_monitor=self.mcp_monitor
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
        # Subscribe to events
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)
        self.event_bus.subscribe(EventType.ERROR_DETECTED, self._on_error_detected)
        self.event_bus.subscribe(
            EventType.COMMAND_SUGGESTIONS_UPDATED,
            self._on_command_suggestions_updated
        )
        self.event_bus.subscribe(
            EventType.EXECUTION_STARTED,
            self._on_execution_started
        )
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
        # Cleanup if needed
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
        # TODO: Push help screen
        self.app.bell()

    def action_command_search(self) -> None:
        """Focus command search."""
        if self._command_palette_panel:
            self._command_palette_panel.focus()
            self.focused_panel = "command_palette"
            self._update_panel_focus_styles()

    def action_refresh(self) -> None:
        """Manually refresh all panels."""
        self.refresh_all_panels()
        self.notify("Dashboard refreshed", severity="information")

    def action_git_menu(self) -> None:
        """Show git menu."""
        # TODO: Show git actions menu
        self.notify("Git menu (coming soon)", severity="information")

    def action_focus_active_work(self) -> None:
        """Focus active work panel."""
        if self._active_work_panel:
            self._active_work_panel.focus()
            self.focused_panel = "active_work"
            self._update_panel_focus_styles()

    def action_focus_specs(self) -> None:
        """Focus specs (command palette panel)."""
        if self._command_palette_panel:
            self._command_palette_panel.focus()
            self.focused_panel = "command_palette"
            self._update_panel_focus_styles()

    def action_focus_history(self) -> None:
        """Focus history panel."""
        if self._history_panel:
            self._history_panel.focus()
            self.focused_panel = "history"
            self._update_panel_focus_styles()

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
