"""
TaskTree Widget - Hierarchical task display with expand/collapse functionality.

Displays parent tasks and subtasks in a tree structure with completion indicators.
Uses Textual's Tree widget for hierarchical navigation.
"""

from textual.app import ComposeResult
from textual.widgets import Tree, Static
from textual.widget import Widget
from textual.containers import Vertical

from ..models import TaskData, ParentTask, Subtask


class TaskTree(Widget):
    """
    Task tree widget for displaying hierarchical task structure.

    Shows parent tasks with completion indicators (✓/○) and subtasks
    with checkbox indicators ([x]/[ ]).

    Attributes:
        task_data: TaskData instance with parent tasks and subtasks
    """

    def __init__(self, task_data: TaskData | None = None, *args, **kwargs):
        """
        Initialize TaskTree widget.

        Args:
            task_data: Optional TaskData to display (defaults to empty)
        """
        super().__init__(*args, **kwargs)
        self.task_data = task_data or TaskData.empty()

    def compose(self) -> ComposeResult:
        """
        Compose the task tree layout.

        Yields:
            Tree widget with task hierarchy
        """
        with Vertical():
            # Create tree widget
            tree = Tree("Tasks", id="task-tree")
            tree.show_root = True
            tree.show_guides = True

            # Load tasks into tree
            self._populate_tree(tree)

            yield tree

    def _populate_tree(self, tree: Tree) -> None:
        """
        Populate tree with task data.

        Args:
            tree: Tree widget to populate
        """
        if not self.task_data or not self.task_data.parent_tasks:
            # No tasks available
            tree.root.add_leaf("[dim]No tasks available[/dim]")
            return

        # Add each parent task
        for parent_task in self.task_data.parent_tasks:
            self._add_parent_task(tree.root, parent_task)

    def _add_parent_task(self, root_node, parent_task: ParentTask) -> None:
        """
        Add a parent task to the tree.

        Args:
            root_node: Tree root node to add to
            parent_task: ParentTask to add
        """
        # Completion indicator
        if parent_task.is_complete:
            indicator = "[green]✓[/green]"
        else:
            indicator = "[dim]○[/dim]"

        # Progress display
        progress_text = f"[cyan]{parent_task.progress}%[/cyan]"

        # Parent task label
        label = f"{indicator} {parent_task.title} {progress_text}"

        # Add parent node
        parent_node = root_node.add(label, expand=True)

        # Add subtasks
        if parent_task.subtasks:
            for subtask in parent_task.subtasks:
                self._add_subtask(parent_node, subtask)

    def _add_subtask(self, parent_node, subtask: Subtask) -> None:
        """
        Add a subtask to a parent node.

        Args:
            parent_node: Parent tree node
            subtask: Subtask to add
        """
        # Checkbox indicator
        if subtask.complete:
            indicator = "[green][x][/green]"
        else:
            indicator = "[dim][ ][/dim]"

        # Subtask label
        label = f"  {indicator} {subtask.text}"

        # Add as leaf node
        parent_node.add_leaf(label)

    def load_tasks(self, task_data: TaskData) -> None:
        """
        Load new task data and refresh the tree.

        Args:
            task_data: TaskData to display
        """
        self.task_data = task_data

        # Get tree widget and repopulate
        try:
            tree = self.query_one("#task-tree", Tree)
            tree.clear()
            tree.root.label = "Tasks"
            self._populate_tree(tree)
        except Exception:
            # Tree not mounted yet, will populate on mount
            pass

    def update_tasks(self, task_data: TaskData) -> None:
        """
        Update task data (alias for load_tasks).

        Args:
            task_data: TaskData to display
        """
        self.load_tasks(task_data)
