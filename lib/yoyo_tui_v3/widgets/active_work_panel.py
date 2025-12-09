"""
ActiveWorkPanel widget for Yoyo Dev TUI.

Displays current active work (spec/fix) with task tree.
Enhanced with scroll support and click handlers.
"""

from textual.widget import Widget
from textual.containers import VerticalScroll
from textual.widgets import Static
from textual.message import Message
from textual.events import Click
from rich.text import Text
from rich.tree import Tree
from typing import List, Optional

from ..models import EventType, Event, ActiveWork, Task, TaskStatus
from ..utils.panel_icons import PanelIcons
from ..utils.headers import render_header


class ActiveWorkPanel(Widget):
    """
    Panel showing active work with hierarchical task tree.

    Displays:
    - Active spec/fix name
    - Task tree with status indicators
    - Links to all specs and fixes

    Features:
    - Scrollable content area
    - Click handlers for task items
    - Enhanced visual styling
    """

    # Custom message for task clicks
    class TaskClicked(Message):
        """Message sent when a task is clicked."""
        def __init__(self, task_id: str):
            self.task_id = task_id
            super().__init__()

    class LinkClicked(Message):
        """Message sent when a navigation link is clicked."""
        def __init__(self, link_type: str):
            self.link_type = link_type  # "specs" or "fixes"
            super().__init__()

    def __init__(self, data_manager, event_bus, **kwargs):
        """
        Initialize ActiveWorkPanel.

        Args:
            data_manager: DataManager instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)
        self.data_manager = data_manager
        self.event_bus = event_bus

        self._active_work: Optional[ActiveWork] = None
        self._all_specs_count = 0
        self._all_fixes_count = 0
        self._subscriptions = []  # Track handler references
        self._task_positions = {}  # Track task positions for click detection

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to events and track subscriptions
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

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

    def _update_display(self) -> None:
        """Update display with latest data."""
        try:
            # Fetch active work
            self._active_work = self.data_manager.get_active_work()

            # Fetch counts for navigation links
            all_specs = self.data_manager.get_all_specs()
            all_fixes = self.data_manager.get_all_fixes()

            self._all_specs_count = len(all_specs) if all_specs else 0
            self._all_fixes_count = len(all_fixes) if all_fixes else 0

        except Exception as e:
            # Handle errors gracefully
            self._active_work = None
            self._all_specs_count = 0
            self._all_fixes_count = 0

        # Trigger re-render
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def get_task_status_icon(self, status: TaskStatus) -> str:
        """
        Get icon for task status.

        Args:
            status: TaskStatus enum value

        Returns:
            Icon string for status
        """
        icon_map = {
            TaskStatus.COMPLETED: PanelIcons.COMPLETED,
            TaskStatus.IN_PROGRESS: PanelIcons.IN_PROGRESS,
            TaskStatus.PENDING: PanelIcons.PENDING
        }
        return icon_map.get(status, "○")

    def get_task_status_style(self, status: TaskStatus) -> str:
        """
        Get style for task status.

        Args:
            status: TaskStatus enum value

        Returns:
            Rich style string
        """
        style_map = {
            TaskStatus.COMPLETED: "green",
            TaskStatus.IN_PROGRESS: "yellow",
            TaskStatus.PENDING: "dim"
        }
        return style_map.get(status, "")

    def calculate_progress(self, tasks: List[Task]) -> float:
        """
        Calculate progress percentage from tasks.

        Args:
            tasks: List of tasks

        Returns:
            Progress percentage (0-100)
        """
        if not tasks:
            return 0.0

        completed = sum(1 for task in tasks if task.status == TaskStatus.COMPLETED)
        total = len(tasks)

        return (completed / total) * 100.0

    def build_task_tree(self, tasks: List[Task]) -> List[dict]:
        """
        Build task tree structure for rendering.

        Args:
            tasks: List of tasks

        Returns:
            List of tree nodes with structure info
        """
        tree_nodes = []

        for task in tasks:
            # Parent task node
            node = {
                "id": task.id,
                "title": task.title,
                "status": task.status,
                "level": 0,
                "is_parent": True,
                "subtasks": []
            }

            # Add subtasks
            for i, subtask in enumerate(task.subtasks):
                subtask_node = {
                    "id": f"{task.id}.{i+1}",
                    "title": subtask,
                    "level": 1,
                    "is_parent": False
                }
                node["subtasks"].append(subtask_node)

            tree_nodes.append(node)

        return tree_nodes

    def on_click(self, event: Click) -> None:
        """Handle click events for task selection."""
        # For now, clicking anywhere in the panel focuses it
        # Task-specific clicks can be implemented with more granular positioning
        self.add_class("panel-focused")

    def render(self) -> Text:
        """
        Render the active work panel with enhanced styling.

        Returns:
            Rich Text object with panel content
        """
        text = Text()

        # Enhanced header with box-drawing characters
        text.append_text(render_header("ACTIVE WORK", 40))
        text.append("\n")

        # Check if there's active work
        if not self._active_work or self._active_work.type == "none":
            text.append("No active work.\n\n", style="dim")
            text.append("Use ", style="dim")
            text.append("/create-new", style="bold yellow")
            text.append(" to start a feature.\n", style="dim")
        else:
            # Active work header with icon
            work_icon = PanelIcons.SPEC if self._active_work.type == "spec" else PanelIcons.FIX
            text.append(f"{work_icon} ", style="bold")
            text.append(self._active_work.name, style="bold magenta")
            text.append(f" ({self._active_work.progress:.0f}%)\n\n", style="cyan")

            # Task tree with enhanced styling
            if self._active_work.tasks:
                tree_nodes = self.build_task_tree(self._active_work.tasks)

                for node in tree_nodes:
                    # Parent task with status-colored icon
                    icon = self.get_task_status_icon(node["status"])
                    icon_style = self.get_task_status_style(node["status"])

                    text.append(f"  {icon} ", style=f"bold {icon_style}")
                    text.append(f"Task {node['id']}: ", style="bold")
                    text.append(f"{node['title']}\n")

                    # Subtasks with tree connectors
                    for i, subtask in enumerate(node["subtasks"]):
                        is_last = i == len(node["subtasks"]) - 1
                        connector = "└─" if is_last else "├─"
                        text.append(f"      {connector} {subtask['title']}\n", style="dim")

                    text.append("\n")  # Space between task groups
            else:
                text.append("No tasks yet.\n", style="dim")

        # Navigation links section
        text.append("─" * 38 + "\n\n", style="dim")
        text.append(f"{PanelIcons.TASK} All Specs ({self._all_specs_count})\n", style="cyan")
        text.append(f"{PanelIcons.FIX} All Fixes ({self._all_fixes_count})\n", style="yellow")

        return text
