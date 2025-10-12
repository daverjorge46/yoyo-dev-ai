"""
TaskParser Service

Parses tasks.md and MASTER-TASKS.md files to extract task data.
Reuses proven parsing logic from yoyo-dashboard.py with improvements.
"""

import re
from pathlib import Path
from typing import Optional

from ..models import TaskData, ParentTask, Subtask


class TaskParser:
    """
    Parse task files (tasks.md, MASTER-TASKS.md) into structured data.

    Handles:
    - Parent tasks (## Task N: Name)
    - Completed parent tasks (## Task N: Name ✅)
    - Subtasks (- [ ] or - [x])
    - Progress calculation
    - Metadata extraction from file path
    """

    @staticmethod
    def parse(task_file: Path) -> TaskData:
        """
        Parse task file and extract all task data.

        Args:
            task_file: Path to tasks.md or MASTER-TASKS.md

        Returns:
            TaskData with parsed information (empty if file doesn't exist)
        """
        if not task_file.exists():
            return TaskData.empty()

        try:
            with open(task_file, 'r') as f:
                content = f.read()

            # Parse all parent tasks
            parent_tasks = TaskParser._parse_parent_tasks(content)

            # Calculate overall statistics
            total_tasks = len(parent_tasks)
            completed_tasks = sum(1 for task in parent_tasks if task.completed)

            total_subtasks = sum(len(task.subtasks) for task in parent_tasks)
            completed_subtasks = sum(
                sum(1 for st in task.subtasks if st.completed)
                for task in parent_tasks
            )

            # Calculate progress
            progress = TaskParser._calculate_progress(
                completed_tasks, total_tasks,
                completed_subtasks, total_subtasks
            )

            return TaskData(
                file_path=task_file,
                parent_tasks=parent_tasks,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                total_subtasks=total_subtasks,
                completed_subtasks=completed_subtasks,
                progress=progress
            )

        except IOError:
            return TaskData.empty()

    @staticmethod
    def _parse_parent_tasks(content: str) -> list[ParentTask]:
        """
        Parse all parent tasks from content.

        Args:
            content: Raw file content

        Returns:
            List of ParentTask objects
        """
        parent_tasks = []

        # Split content into sections by parent task headers
        # Match: ## Task 1: Name or ## Task 1: Name ✅
        task_pattern = r'^##\s+Task\s+(\d+):\s+(.+?)(\s+✅)?$'
        task_sections = re.split(r'^##\s+Task', content, flags=re.MULTILINE)

        for section in task_sections[1:]:  # Skip first split (before first task)
            # Re-add the "Task" prefix for pattern matching
            section = "Task" + section

            match = re.match(task_pattern, "## " + section.split('\n')[0], re.MULTILINE)
            if not match:
                continue

            task_number = int(match.group(1))
            task_name = match.group(2).strip()
            is_completed = match.group(3) is not None

            # Extract subtasks from this section
            subtasks = TaskParser._parse_subtasks(section)

            parent_tasks.append(ParentTask(
                number=task_number,
                name=task_name,
                completed=is_completed,
                subtasks=subtasks
            ))

        return parent_tasks

    @staticmethod
    def _parse_subtasks(section: str) -> list[Subtask]:
        """
        Parse subtasks from a parent task section.

        Args:
            section: Content of a single parent task section

        Returns:
            List of Subtask objects
        """
        subtasks = []

        # Match: - [x] or - [ ] followed by task text
        subtask_pattern = r'^-\s+\[([x ])\]\s+(.+)$'

        for line in section.split('\n'):
            match = re.match(subtask_pattern, line)
            if match:
                is_completed = match.group(1) == 'x'
                text = match.group(2).strip()

                subtasks.append(Subtask(
                    text=text,
                    completed=is_completed
                ))

        return subtasks

    @staticmethod
    def _calculate_progress(
        completed_tasks: int,
        total_tasks: int,
        completed_subtasks: int,
        total_subtasks: int
    ) -> int:
        """
        Calculate overall progress percentage.

        Progress is based on subtasks if they exist, otherwise parent tasks.

        Args:
            completed_tasks: Number of completed parent tasks
            total_tasks: Total number of parent tasks
            completed_subtasks: Number of completed subtasks
            total_subtasks: Total number of subtasks

        Returns:
            Progress percentage (0-100)
        """
        # Prefer subtask-based progress
        if total_subtasks > 0:
            return int((completed_subtasks / total_subtasks) * 100)

        # Fallback to parent task progress
        if total_tasks > 0:
            if completed_tasks == total_tasks:
                return 100
            return int((completed_tasks / total_tasks) * 100)

        return 0
