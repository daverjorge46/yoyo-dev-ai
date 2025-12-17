"""
MemoryPanel widget for Yoyo Dev TUI.

Displays memory system status including:
- Connection status
- Block count and types
- Active scope (project/global)
- Last updated timestamp
"""

from textual.widget import Widget
from textual.reactive import reactive
from rich.text import Text
from rich.panel import Panel
from datetime import datetime
from typing import Optional

from ..models import EventType, Event
from ..utils.panel_icons import PanelIcons
from ..services.memory_bridge import MemoryBridge, MemoryStatus


# =============================================================================
# Helper Functions
# =============================================================================

def format_memory_timestamp(timestamp: Optional[datetime]) -> str:
    """
    Format memory timestamp for display.

    Args:
        timestamp: Datetime to format, or None

    Returns:
        Human-readable timestamp string
    """
    if timestamp is None:
        return "Never"

    now = datetime.now()

    # Handle timezone-aware timestamps
    if timestamp.tzinfo is not None:
        # Convert to naive datetime for comparison
        timestamp = timestamp.replace(tzinfo=None)

    diff = now - timestamp
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} min ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hr ago"
    else:
        days = seconds // 86400
        return f"{days} day{'s' if days > 1 else ''} ago"


# =============================================================================
# MemoryPanel Widget
# =============================================================================

class MemoryPanel(Widget):
    """
    Memory status panel for TUI dashboard.

    Displays:
    - Connection status (connected/disconnected)
    - Total block count
    - Breakdown by type (persona, project, user, corrections)
    - Active scope
    - Last updated timestamp

    Can be embedded in ProjectOverview or used standalone.
    """

    # Reactive properties
    is_expanded: reactive[bool] = reactive(False)

    # CSS styling
    DEFAULT_CSS = """
    MemoryPanel {
        height: auto;
        padding: 1;
    }
    """

    def __init__(
        self,
        memory_bridge: MemoryBridge,
        event_bus,
        **kwargs
    ):
        """
        Initialize MemoryPanel.

        Args:
            memory_bridge: MemoryBridge instance for database access
            event_bus: EventBus instance for event subscription
        """
        super().__init__(**kwargs)
        self._memory_bridge = memory_bridge
        self._event_bus = event_bus

        # Current status (cached)
        self._status: MemoryStatus = MemoryStatus.disconnected()

        # Track subscriptions for cleanup
        self._subscriptions = []

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to state updates
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self._event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        # Initial update
        self._update_display()

    def on_unmount(self) -> None:
        """Called when widget is unmounted. Clean up subscriptions."""
        for event_type, handler in self._subscriptions:
            self._event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self._update_display()

    def _update_display(self) -> None:
        """Update display with latest memory status."""
        try:
            self._status = self._memory_bridge.get_status()
        except Exception as e:
            self._status = MemoryStatus.disconnected(str(e))

        # Trigger re-render
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def render(self) -> Text:
        """
        Render the memory status panel.

        Returns:
            Rich Text object with memory status content
        """
        content = Text()

        # Header with brain icon
        content.append("  Memory", style="bold cyan")

        if not self._status.connected:
            # Disconnected state
            content.append("\n")
            content.append("  ", style="dim")
            content.append(" Not initialized", style="dim red")

            if self._status.error_message:
                content.append(f"\n  {self._status.error_message[:40]}", style="dim")
        else:
            # Connected state
            content.append("\n")

            # Block count with icon
            content.append("  ", style="dim")
            content.append(" ", style="bold green")
            content.append(f" {self._status.block_count} blocks", style="green")

            # Scope
            scope_icon = "" if self._status.scope == "project" else ""
            content.append(f" ({scope_icon} {self._status.scope})", style="dim")

            # Block type breakdown (if expanded or has multiple types)
            if self.is_expanded or len(self._status.block_types) > 0:
                content.append("\n")
                for block_type, count in self._status.block_types.items():
                    icon = self._get_block_type_icon(block_type)
                    content.append(f"    {icon} {block_type}: {count}\n", style="dim")

            # Last updated
            if self._status.last_updated:
                formatted = format_memory_timestamp(self._status.last_updated)
                content.append(f"  Updated: {formatted}", style="dim")

        return content

    def _get_block_type_icon(self, block_type: str) -> str:
        """
        Get icon for block type.

        Args:
            block_type: Type of memory block

        Returns:
            Icon character
        """
        icons = {
            "persona": "",  # Robot
            "project": "",  # Folder
            "user": "",    # User
            "corrections": ""  # Pencil
        }
        return icons.get(block_type, "")

    def get_summary_line(self) -> Text:
        """
        Get a single-line summary for compact display.

        Returns:
            Rich Text with compact summary
        """
        text = Text()

        if not self._status.connected:
            text.append(" Memory: ", style="dim")
            text.append("Not initialized", style="dim red")
        else:
            text.append(" Memory: ", style="dim")
            text.append(f"{self._status.block_count}", style="bold green")
            text.append(f" blocks ({self._status.scope})", style="dim")

        return text


# =============================================================================
# Compact Memory Status Widget
# =============================================================================

class MemoryStatusLine(Widget):
    """
    Compact single-line memory status for embedding in other widgets.

    Shows: " Memory: 4 blocks (project)"
    """

    def __init__(
        self,
        memory_bridge: MemoryBridge,
        event_bus,
        **kwargs
    ):
        """
        Initialize MemoryStatusLine.

        Args:
            memory_bridge: MemoryBridge instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)
        self._memory_bridge = memory_bridge
        self._event_bus = event_bus
        self._status: MemoryStatus = MemoryStatus.disconnected()
        self._subscriptions = []

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self._event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)
        self._update_display()

    def on_unmount(self) -> None:
        """Called when widget is unmounted."""
        for event_type, handler in self._subscriptions:
            self._event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self._update_display()

    def _update_display(self) -> None:
        """Update display with latest status."""
        try:
            self._status = self._memory_bridge.get_status()
        except Exception:
            self._status = MemoryStatus.disconnected()
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def render(self) -> Text:
        """Render compact memory status."""
        text = Text()

        if not self._status.connected:
            text.append(" Memory: ", style="bold cyan")
            text.append("Not initialized", style="dim")
        else:
            text.append(" Memory: ", style="bold cyan")
            text.append(f"{self._status.block_count}", style="bold green")
            text.append(" blocks", style="dim")

            # Show scope indicator
            scope_icon = "" if self._status.scope == "project" else ""
            text.append(f" ({scope_icon} {self._status.scope})", style="dim")

        return text
