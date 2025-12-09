"""
ProjectOverview widget for Yoyo Dev TUI.

Displays mission, tech stack, project stats, and MCP status.
Enhanced with scroll support and click handlers.
"""

from textual.widget import Widget
from textual.reactive import reactive
from textual.containers import Container, VerticalScroll
from textual.message import Message
from textual.events import Click
from rich.text import Text
from rich.panel import Panel
from typing import Optional

from ..models import EventType, Event
from ..utils.panel_icons import PanelIcons
from ..utils.headers import render_header


class ProjectOverview(Widget):
    """
    Project overview panel showing mission, tech stack, stats, and MCP status.

    Can be expanded or collapsed to save screen space.

    Features:
    - Scrollable content area for expanded view
    - Click handlers for expand/collapse
    - Enhanced visual styling
    """

    # Reactive properties
    is_expanded: reactive[bool] = reactive(True)

    # Custom message for section clicks
    class SectionClicked(Message):
        """Message sent when a section is clicked."""
        def __init__(self, section: str):
            self.section = section  # "mission", "tech", "stats", "mcp"
            super().__init__()

    class ExpandToggled(Message):
        """Message sent when expand/collapse is toggled."""
        def __init__(self, expanded: bool):
            self.expanded = expanded
            super().__init__()

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
        self._subscriptions = []  # Track handler references

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events and track subscriptions
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        self._subscriptions.append((EventType.MCP_STATUS_CHANGED, self._on_mcp_status_changed))
        self.event_bus.subscribe(EventType.MCP_STATUS_CHANGED, self._on_mcp_status_changed)

        # Initial data load
        self._update_display()

    def on_unmount(self) -> None:
        """Called when widget is unmounted. Clean up subscriptions."""
        # Unsubscribe all handlers
        for event_type, handler in self._subscriptions:
            self.event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

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

    def on_click(self, event: Click) -> None:
        """
        Handle click events for expand/collapse toggle.

        Clicking on the panel toggles between expanded and collapsed states.
        """
        self.toggle_expansion()
        self.post_message(self.ExpandToggled(self.is_expanded))

    def get_mcp_status_icon(self, connected: bool) -> str:
        """
        Get icon for MCP connection status using PanelIcons.

        Args:
            connected: Whether MCP is connected

        Returns:
            Icon string
        """
        return PanelIcons.CONNECTED if connected else PanelIcons.DISCONNECTED

    def render(self) -> Panel:
        """
        Render the project overview.

        Returns:
            Rich Panel with project overview content
        """
        if not self.is_expanded:
            # Collapsed view - just show mission with expand hint
            content = Text()
            content.append(f"{PanelIcons.MISSION} ", style="bold")
            content.append(self._mission, style="italic")
            content.append(f"  {PanelIcons.EXPAND} click to expand", style="dim")
            return Panel(
                content,
                title="Project Overview",
                border_style="cyan",
                expand=False
            )

        # Expanded view - show all information with enhanced styling
        content = Text()

        # Collapse hint
        content.append(f"  {PanelIcons.COLLAPSE} click to collapse\n\n", style="dim")

        # Mission
        content.append(f"{PanelIcons.MISSION} Mission\n", style="bold cyan")
        content.append(f"  {self._mission}\n\n", style="italic")

        # Tech Stack (show only first 5 main technologies)
        content.append(f"{PanelIcons.TECH} Tech Stack\n", style="bold cyan")
        if self._tech_stack:
            # Show only first 5 technologies for dashboard overview
            main_tech = self._tech_stack[:5]
            tech_str = ", ".join(main_tech)
            if len(self._tech_stack) > 5:
                tech_str += f" (+{len(self._tech_stack) - 5} more)"
            content.append(f"  {tech_str}\n\n")
        else:
            content.append("  Not specified\n\n", style="dim")

        # Project Stats
        content.append(f"{PanelIcons.STATS} Quick Stats\n", style="bold cyan")
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
        content.append(f"{PanelIcons.MCP} MCP Server\n", style="bold cyan")
        if self._mcp_status:
            icon = self.get_mcp_status_icon(self._mcp_status.connected)
            status_text = "Connected" if self._mcp_status.connected else "Disconnected"
            status_style = "green" if self._mcp_status.connected else "red"

            content.append(f"  {icon} ", style=f"bold {status_style}")
            content.append(f"{status_text}", style=status_style)

            # Show server count and names
            if self._mcp_status.enabled_servers:
                server_count = len(self._mcp_status.enabled_servers)
                content.append(f" (Docker MCP Gateway: {server_count} servers)\n")
                # List individual server names
                for server in self._mcp_status.enabled_servers:
                    content.append(f"    • {server}\n", style="dim")
            elif self._mcp_status.server_name:
                content.append(f" ({self._mcp_status.server_name})\n")

            if self._mcp_status.error_message and not self._mcp_status.connected:
                content.append(f"  {self._mcp_status.error_message}\n", style="dim")
        else:
            content.append("  Status unknown\n", style="dim")

        return Panel(
            content,
            title="Project Overview",
            border_style="cyan",
            expand=False
        )
