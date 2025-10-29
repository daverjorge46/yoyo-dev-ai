"""
TaskTree Widget - Hierarchical task display with expand/collapse functionality.

Displays parent tasks and subtasks in a tree structure with completion indicators.
Uses Textual's Tree widget for hierarchical navigation.
"""

import logging
from textual.app import ComposeResult
from textual.widgets import Tree, Static
from textual.widget import Widget
from textual.containers import Vertical

from ..models import TaskData, ParentTask, Subtask

logger = logging.getLogger(__name__)


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
        self._is_loading = True  # Start in loading state
        logger.debug(f"TaskTree.__init__: _is_loading={self._is_loading}, has_data={bool(task_data and task_data.parent_tasks)}")

    def compose(self) -> ComposeResult:
        """
        Compose the task tree layout.

        Yields:
            Tree widget with task hierarchy
        """
        logger.debug(f"TaskTree.compose: _is_loading={self._is_loading}, has_data={bool(self.task_data and self.task_data.parent_tasks)}")

        with Vertical():
            # Create tree widget
            tree = Tree("Tasks", id="task-tree")
            tree.show_root = True
            tree.show_guides = True

            # If we have task data, transition out of loading state
            if self.task_data and self.task_data.parent_tasks:
                logger.debug("TaskTree.compose: Transitioning from loading state (data available)")
                self._is_loading = False

            # Load tasks into tree
            self._populate_tree(tree)

            yield tree

    def _populate_tree(self, tree: Tree) -> None:
        """
        Populate tree with task data.

        Args:
            tree: Tree widget to populate
        """
        logger.debug(f"TaskTree._populate_tree: _is_loading={self._is_loading}, num_tasks={len(self.task_data.parent_tasks) if self.task_data else 0}")

        # Show loading state
        if self._is_loading:
            logger.debug("TaskTree._populate_tree: Showing loading state")
            tree.root.add_leaf("[dim italic]Loading tasks...[/dim italic]")
            return

        # Show empty state with helpful message
        if not self.task_data or not self.task_data.parent_tasks:
            logger.debug("TaskTree._populate_tree: Showing empty state")
            tree.root.add_leaf("[dim]No tasks found[/dim]")
            tree.root.add_leaf("[dim italic]Run /create-new to get started[/dim italic]")
            return

        # Add each parent task
        logger.debug(f"TaskTree._populate_tree: Adding {len(self.task_data.parent_tasks)} parent tasks")
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
        if parent_task.completed:
            indicator = "[green]✓[/green]"
        else:
            indicator = "[dim]○[/dim]"

        # Progress display
        progress_text = f"[cyan]{parent_task.progress}%[/cyan]"

        # Parent task label
        label = f"{indicator} {parent_task.name} {progress_text}"

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
        if subtask.completed:
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
        logger.debug(f"TaskTree.load_tasks: Received {len(task_data.parent_tasks) if task_data else 0} tasks")
        self.task_data = task_data
        self._is_loading = False  # Data has loaded
        logger.debug(f"TaskTree.load_tasks: Set _is_loading=False")

        # Get tree widget and repopulate
        try:
            tree = self.query_one("#task-tree", Tree)
            tree.clear()
            tree.root.label = "Tasks"
            self._populate_tree(tree)
            logger.debug("TaskTree.load_tasks: Tree repopulated successfully")
        except Exception as e:
            # Tree not mounted yet, will populate on mount
            logger.debug(f"TaskTree.load_tasks: Tree not mounted yet ({e}), will populate on mount")

    def update_tasks(self, task_data: TaskData) -> None:
        """
        Update task data (alias for load_tasks).

        Args:
            task_data: TaskData to display
        """
        self.load_tasks(task_data)
