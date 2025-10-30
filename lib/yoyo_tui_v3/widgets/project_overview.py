"""
ProjectOverview widget for Yoyo Dev TUI.

Displays mission, tech stack, project stats, and MCP status.
"""

from textual.widget import Widget
from textual.reactive import reactive
from textual.containers import Container
from rich.text import Text
from rich.panel import Panel

from ..models import EventType, Event


class ProjectOverview(Widget):
    """
    Project overview panel showing mission, tech stack, stats, and MCP status.

    Can be expanded or collapsed to save screen space.
    """

    # Reactive properties
    is_expanded: reactive[bool] = reactive(True)

    def __init__(self, data_manager, event_bus, mcp_monitor=None, **kwargs):
        """
        Initialize ProjectOverview.

        Args:
            data_manager: DataManager instance
            event_bus: EventBus instance
            mcp_monitor: MCPServerMonitor instance (optional)
        """
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus
        self.mcp_monitor = mcp_monitor

        self._mission = ""
        self._tech_stack = []
        self._stats = None
        self._mcp_status = None

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)
        self.event_bus.subscribe(EventType.MCP_STATUS_CHANGED, self._on_mcp_status_changed)

        # Initial data load
        self._update_display()

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self._update_display()

    def _on_mcp_status_changed(self, event: Event) -> None:
        """Handle MCP_STATUS_CHANGED events."""
        self._update_display()

    def _update_display(self) -> None:
        """Update display with latest data."""
        try:
            # Fetch mission
            self._mission = self.data_manager.get_mission_statement() or "No mission defined"

            # Truncate if too long (keep first line only, max 100 chars)
            if '\n' in self._mission:
                self._mission = self._mission.split('\n')[0]
            if len(self._mission) > 100:
                self._mission = self._mission[:97] + "..."

            # Fetch tech stack
            self._tech_stack = self.data_manager.get_tech_stack_summary() or []

            # Fetch project stats
            self._stats = self.data_manager.get_project_stats()

            # Fetch MCP status
            self._mcp_status = self.data_manager.get_mcp_status()

        except Exception as e:
            # Handle errors gracefully
            self._mission = self._mission or "Error loading mission"
            self._tech_stack = self._tech_stack or []
            self._stats = self._stats  # Keep previous stats
            self._mcp_status = self._mcp_status  # Keep previous status

        # Trigger re-render
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def toggle_expansion(self) -> None:
        """Toggle between expanded and collapsed states."""
        self.is_expanded = not self.is_expanded
        self.refresh()

    def expand(self) -> None:
        """Expand the widget to show full information."""
        self.is_expanded = True
        self.refresh()

    def collapse(self) -> None:
        """Collapse the widget to show minimal information."""
        self.is_expanded = False
        self.refresh()

    def get_mcp_status_icon(self, connected: bool) -> str:
        """
        Get icon for MCP connection status.

        Args:
            connected: Whether MCP is connected

        Returns:
            Icon string
        """
        return "✓" if connected else "✗"

    def render(self) -> Panel:
        """
        Render the project overview.

        Returns:
            Rich Panel with project overview content
        """
        if not self.is_expanded:
            # Collapsed view - just show mission
            content = Text()
            content.append("📋 ", style="bold")
            content.append(self._mission, style="italic")
            return Panel(
                content,
                title="Project Overview",
                border_style="cyan",
                expand=False
            )

        # Expanded view - show all information
        content = Text()

        # Mission
        content.append("📋 Mission\n", style="bold cyan")
        content.append(f"  {self._mission}\n\n", style="italic")

        # Tech Stack
        content.append("🔧 Tech Stack\n", style="bold cyan")
        if self._tech_stack:
            tech_str = ", ".join(self._tech_stack)
            content.append(f"  {tech_str}\n\n")
        else:
            content.append("  Not specified\n\n", style="dim")

        # Project Stats
        content.append("📊 Quick Stats\n", style="bold cyan")
        if self._stats:
            content.append(f"  Active Specs: ", style="dim")
            content.append(f"{self._stats.active_specs}\n")

            content.append(f"  Active Fixes: ", style="dim")
            content.append(f"{self._stats.active_fixes}\n")

            content.append(f"  Pending Tasks: ", style="dim")
            content.append(f"{self._stats.pending_tasks}\n")

            content.append(f"  Recent Errors: ", style="dim")
            error_style = "red" if self._stats.recent_errors > 0 else "green"
            content.append(f"{self._stats.recent_errors}\n", style=error_style)
        else:
            content.append("  No stats available\n", style="dim")

        content.append("\n")

        # MCP Status
        content.append("🔌 MCP Server\n", style="bold cyan")
        if self._mcp_status:
            icon = self.get_mcp_status_icon(self._mcp_status.connected)
            status_text = "Connected" if self._mcp_status.connected else "Disconnected"
            status_style = "green" if self._mcp_status.connected else "red"

            content.append(f"  {icon} ", style=f"bold {status_style}")
            content.append(f"{status_text}", style=status_style)

            if self._mcp_status.server_name:
                content.append(f" ({self._mcp_status.server_name})")

            if self._mcp_status.error_message and not self._mcp_status.connected:
                content.append(f"\n  {self._mcp_status.error_message}", style="dim")
        else:
            content.append("  Status unknown\n", style="dim")

        return Panel(
            content,
            title="Project Overview",
            border_style="cyan",
            expand=False
        )
