#!/usr/bin/env python3
"""
Test suite for TaskTree loading behavior.

This test file reproduces Bug #1: TaskTree doesn't load data on mount.

PROBLEM:
The TaskTree widget starts in a loading state (_is_loading = True) and never
actually loads the task data when mounted. The loading state persists
indefinitely, showing "Loading tasks..." instead of actual task data.

EXPECTED BEHAVIOR:
- TaskTree should automatically load data when mounted
- Loading state should transition to loaded state
- Task data should be displayed after mount

ACTUAL BEHAVIOR:
- TaskTree stays in loading state indefinitely
- No automatic data loading on mount
- Manual call to load_tasks() is required

Following TDD approach - these tests should FAIL initially (red phase).
"""

import unittest
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.widgets.task_tree import TaskTree
from yoyo_tui.models import TaskData, ParentTask, Subtask


class TestTaskTreeLoadingOnMount(unittest.TestCase):
    """Test TaskTree's automatic data loading on mount."""

    def test_task_tree_initializes_in_loading_state(self):
        """
        Test that TaskTree starts in loading state.

        Expected: _is_loading should be True initially
        Actual: This works correctly

        PASS: This test documents current (correct) behavior
        """
        task_tree = TaskTree()

        assert task_tree._is_loading is True, \
            "TaskTree should start in loading state"

    def test_task_tree_loads_data_on_mount(self):
        """
        Test that TaskTree loads data when mounted.

        Expected: After compose() is called, task data should be loaded
        Actual: TaskTree stays in loading state, no automatic data load

        FAIL: Bug reproduction - TaskTree doesn't load data on mount
        """
        # Create task data
        parent_task = ParentTask(
            number=1,
            name="Test Task",
            completed=False,
            subtasks=[
                Subtask(text="Subtask 1", completed=True),
                Subtask(text="Subtask 2", completed=False),
            ]
        )
        task_data = TaskData(
            parent_tasks=[parent_task],
            total_tasks=1,
            total_subtasks=2,
            completed_subtasks=1,
            file_path=Path("/tmp/tasks.md")
        )

        # Create TaskTree with data
        task_tree = TaskTree(task_data=task_data)

        # Call compose (simulates mounting)
        widgets = list(task_tree.compose())

        # Expected: After compose, loading state should be False
        # Actual: Loading state remains True
        assert task_tree._is_loading is False, \
            "TaskTree should transition from loading to loaded state after mount"

        # Expected: Tree should contain task data
        # Actual: Tree shows "Loading tasks..." indefinitely
        tree = widgets[0]
        assert tree.root is not None, "Tree root should exist"

        # Tree should not show loading message
        tree_content = str(tree.root)
        assert "Loading tasks..." not in tree_content, \
            "Tree should not show loading message when data is available"

    def test_task_tree_displays_provided_data_after_mount(self):
        """
        Test that TaskTree displays provided task data after mount.

        Expected: Task data provided in constructor should be visible after mount
        Actual: Loading message is shown instead of task data

        FAIL: Bug reproduction - Data not displayed after mount
        """
        # Create task data
        parent_task = ParentTask(
            number=1,
            name="Feature Implementation",
            completed=False,
            subtasks=[
                Subtask(text="Write tests", completed=True),
                Subtask(text="Implement feature", completed=False),
            ]
        )
        task_data = TaskData(
            parent_tasks=[parent_task],
            total_tasks=1,
            total_subtasks=2,
            completed_subtasks=1,
            file_path=Path("/tmp/tasks.md")
        )

        # Create TaskTree with data
        task_tree = TaskTree(task_data=task_data)

        # Call compose
        widgets = list(task_tree.compose())
        tree = widgets[0]

        # Expected: Tree should contain parent task name
        # Actual: Tree shows loading message
        tree_content = str(tree.root)
        assert "Feature Implementation" in tree_content, \
            "Tree should display parent task name after mount"

    def test_task_tree_empty_state_shown_when_no_data(self):
        """
        Test that TaskTree shows empty state when no task data exists.

        Expected: After mount with no data, should show "No tasks found"
        Actual: Shows "Loading tasks..." indefinitely

        FAIL: Bug reproduction - Loading state instead of empty state
        """
        # Create TaskTree with no data (empty TaskData)
        task_tree = TaskTree(task_data=TaskData.empty())

        # Call compose
        widgets = list(task_tree.compose())
        tree = widgets[0]

        # Expected: Should show empty state message
        # Actual: Shows loading message
        tree_content = str(tree.root)
        assert "No tasks found" in tree_content, \
            "Tree should show empty state message when no tasks exist"
        assert "Loading tasks..." not in tree_content, \
            "Tree should not show loading message when empty data is provided"

    def test_task_tree_transitions_to_loaded_state_automatically(self):
        """
        Test that TaskTree automatically transitions from loading to loaded state.

        Expected: _is_loading should become False after mount with data
        Actual: _is_loading remains True, no automatic transition

        FAIL: Bug reproduction - No automatic state transition
        """
        parent_task = ParentTask(
            number=1,
            name="Test Task",
            completed=False,
            subtasks=[]
        )
        task_data = TaskData(
            parent_tasks=[parent_task],
            total_tasks=1,
            total_subtasks=0,
            completed_subtasks=0,
            file_path=Path("/tmp/tasks.md")
        )

        task_tree = TaskTree(task_data=task_data)

        # Before mount: loading state
        assert task_tree._is_loading is True

        # Call compose (mount)
        list(task_tree.compose())

        # Expected: After mount, should transition to loaded state
        # Actual: Remains in loading state
        assert task_tree._is_loading is False, \
            "TaskTree should automatically transition to loaded state after mount with data"


class TestTaskTreeManualLoading(unittest.TestCase):
    """Test TaskTree's manual load_tasks() method (current workaround)."""

    def test_load_tasks_transitions_from_loading_state(self):
        """
        Test that calling load_tasks() manually transitions from loading state.

        Expected: This works correctly (this is the current workaround)
        Actual: Works as expected

        PASS: Documents current workaround behavior
        """
        task_tree = TaskTree()

        # Initially loading
        assert task_tree._is_loading is True

        # Create task data
        parent_task = ParentTask(
            number=1,
            name="Test Task",
            completed=False,
            subtasks=[]
        )
        task_data = TaskData(
            parent_tasks=[parent_task],
            total_tasks=1,
            total_subtasks=0,
            completed_subtasks=0,
            file_path=Path("/tmp/tasks.md")
        )

        # Call load_tasks() manually
        task_tree.load_tasks(task_data)

        # Should transition to loaded state
        assert task_tree._is_loading is False, \
            "load_tasks() should transition from loading state"

    def test_load_tasks_before_mount_prepares_data(self):
        """
        Test that calling load_tasks() before mount prepares data for display.

        Expected: Data should be ready when compose() is called
        Actual: Works correctly with manual load_tasks() call

        PASS: Documents current workaround behavior
        """
        task_tree = TaskTree()

        parent_task = ParentTask(
            number=1,
            name="Test Task",
            completed=False,
            subtasks=[]
        )
        task_data = TaskData(
            parent_tasks=[parent_task],
            total_tasks=1,
            total_subtasks=0,
            completed_subtasks=0,
            file_path=Path("/tmp/tasks.md")
        )

        # Call load_tasks() before compose
        task_tree.load_tasks(task_data)

        # Now compose
        list(task_tree.compose())

        # Should not be in loading state
        assert task_tree._is_loading is False


class TestTaskTreeBugDocumentation(unittest.TestCase):
    """Document the exact bug behavior with clear expected vs actual."""

    def test_bug_reproduction_complete_workflow(self):
        """
        Complete bug reproduction showing exact issue.

        PROBLEM SUMMARY:
        ---------------
        TaskTree.__init__() sets _is_loading = True
        TaskTree.compose() calls _populate_tree()
        _populate_tree() checks if _is_loading is True
        If True, shows "Loading tasks..." and returns early
        _is_loading is NEVER set to False automatically
        Result: Loading message persists indefinitely

        EXPECTED:
        ---------
        1. TaskTree receives task_data in constructor
        2. On mount (compose), should check if task_data exists
        3. If task_data exists, set _is_loading = False
        4. Display task data instead of loading message

        ACTUAL:
        -------
        1. TaskTree receives task_data in constructor ✓
        2. On mount (compose), checks _is_loading flag
        3. _is_loading is still True (never changed)
        4. Shows "Loading tasks..." indefinitely
        5. Requires manual load_tasks() call to transition state

        FIX NEEDED:
        -----------
        In TaskTree.__init__() or compose(), add logic:

        if self.task_data and self.task_data.parent_tasks:
            self._is_loading = False

        Or in compose(), before calling _populate_tree():

        if not self._is_loading or self.task_data.parent_tasks:
            self._is_loading = False

        FAIL: This test reproduces the exact bug
        """
        # Create task data (simulating real usage)
        parent_task = ParentTask(
            number=1,
            name="Feature Implementation",
            completed=False,
            subtasks=[
                Subtask(text="Write tests", completed=True),
                Subtask(text="Implement", completed=False),
            ]
        )
        task_data = TaskData(
            parent_tasks=[parent_task],
            total_tasks=1,
            total_subtasks=2,
            completed_subtasks=1,
            file_path=Path("/tmp/tasks.md")
        )

        # User creates TaskTree with data (normal usage)
        task_tree = TaskTree(task_data=task_data)

        # Verify data was stored
        assert task_tree.task_data == task_data, \
            "Task data should be stored in constructor"

        # User mounts widget (compose is called)
        widgets = list(task_tree.compose())
        tree = widgets[0]

        # BUG: Still in loading state despite having data
        assert task_tree._is_loading is False, \
            "EXPECTED: Should transition to loaded state when data exists\n" \
            "ACTUAL: Remains in loading state (BUG)\n" \
            "FIX: Check for data in __init__() or compose() and set _is_loading = False"

        # BUG: Tree shows loading message instead of data
        tree_content = str(tree.root)
        assert "Loading tasks..." not in tree_content, \
            "EXPECTED: Should not show loading message when data exists\n" \
            "ACTUAL: Shows loading message indefinitely (BUG)\n" \
            "FIX: Transition _is_loading to False before _populate_tree()"

        assert "Feature Implementation" in tree_content, \
            "EXPECTED: Should display task data\n" \
            "ACTUAL: Loading message blocks display (BUG)\n" \
            "FIX: Set _is_loading = False when data is available"


if __name__ == '__main__':
    unittest.main()
