"""
ActiveWorkPanel widget for Yoyo Dev TUI.

Displays current active work (spec/fix) with task tree.
"""

from textual.widget import Widget
from rich.text import Text
from rich.tree import Tree
from typing import List, Optional

from ..models import EventType, Event, ActiveWork, Task, TaskStatus


class ActiveWorkPanel(Widget):
    """
    Panel showing active work with hierarchical task tree.

    Displays:
    - Active spec/fix name
    - Task tree with status indicators
    - Links to all specs and fixes
    """

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
            TaskStatus.COMPLETED: "✓",
            TaskStatus.IN_PROGRESS: "⚡",
            TaskStatus.PENDING: "□"
        }
        return icon_map.get(status, "○")

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

    def render(self) -> Text:
        """
        Render the active work panel.

        Returns:
            Rich Text object with panel content
        """
        text = Text()

        # Panel header
        text.append("ACTIVE WORK\n", style="bold cyan")
        text.append("─" * 40 + "\n", style="dim")

        # Check if there's active work
        if not self._active_work or self._active_work.type == "none":
            text.append("\nNo active work.\n", style="dim")
            text.append("Use ", style="dim")
            text.append("/create-new", style="bold yellow")
            text.append(" to start a feature.\n", style="dim")
        else:
            # Active work header
            work_icon = "⚡" if self._active_work.type == "spec" else "🐛"
            text.append(f"\n{work_icon} ", style="bold")
            text.append(self._active_work.name, style="bold magenta")
            text.append(f" ({self._active_work.progress:.0f}%)\n", style="cyan")

            # Task tree
            if self._active_work.tasks:
                text.append("\n")
                tree_nodes = self.build_task_tree(self._active_work.tasks)

                for node in tree_nodes:
                    # Parent task
                    icon = self.get_task_status_icon(node["status"])
                    text.append(f"  {icon} ", style="bold")
                    text.append(f"Task {node['id']}: {node['title']}\n")

                    # Subtasks
                    for subtask in node["subtasks"]:
                        text.append(f"    ├─ {subtask['title']}\n", style="dim")

            else:
                text.append("\nNo tasks yet.\n", style="dim")

        # Navigation links
        text.append("\n" + "─" * 40 + "\n", style="dim")
        text.append(f"📋 All Specs ({self._all_specs_count})\n", style="cyan")
        text.append(f"🐛 All Fixes ({self._all_fixes_count})\n", style="yellow")

        return text
