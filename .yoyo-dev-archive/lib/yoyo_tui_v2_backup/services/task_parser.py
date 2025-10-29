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

            # Extract source metadata from file path
            source_type, spec_name, fix_name = TaskParser._extract_source_metadata(task_file)

            return TaskData(
                file_path=task_file,
                parent_tasks=parent_tasks,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                total_subtasks=total_subtasks,
                completed_subtasks=completed_subtasks,
                progress=progress,
                source_type=source_type,
                spec_name=spec_name,
                fix_name=fix_name
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
    def find_and_parse_tasks() -> TaskData:
        """
        Auto-discover and parse tasks.md from project.

        Search order:
        1. tasks.md in current working directory (highest priority)
        2. tasks.md in .yoyo-dev/specs/*/tasks.md (most recent)
        3. tasks.md in .yoyo-dev/fixes/*/tasks.md (most recent)
        4. MASTER-TASKS.md in current working directory

        Returns:
            TaskData with parsed information (empty if no tasks found)
        """
        from pathlib import Path
        import os

        cwd = Path(os.getcwd())

        # Priority 1: tasks.md in current directory
        cwd_tasks = cwd / "tasks.md"
        if cwd_tasks.exists():
            return TaskParser.parse(cwd_tasks)

        # Priority 2: Most recent spec tasks.md
        yoyo_dev = cwd / ".yoyo-dev"
        if yoyo_dev.exists():
            specs_dir = yoyo_dev / "specs"
            if specs_dir.exists() and specs_dir.is_dir():
                spec_tasks = TaskParser._find_most_recent_tasks(specs_dir)
                if spec_tasks:
                    return TaskParser.parse(spec_tasks)

            # Priority 3: Most recent fix tasks.md
            fixes_dir = yoyo_dev / "fixes"
            if fixes_dir.exists() and fixes_dir.is_dir():
                fix_tasks = TaskParser._find_most_recent_tasks(fixes_dir)
                if fix_tasks:
                    return TaskParser.parse(fix_tasks)

        # Priority 4: MASTER-TASKS.md in current directory
        master_tasks = cwd / "MASTER-TASKS.md"
        if master_tasks.exists():
            return TaskParser.parse(master_tasks)

        # No tasks found
        return TaskData.empty()

    @staticmethod
    def _find_most_recent_tasks(parent_dir: Path) -> Optional[Path]:
        """
        Find most recent tasks.md in subdirectories.

        Looks for tasks.md in subdirectories, sorted by directory name (reverse).
        This works because directories are named YYYY-MM-DD-feature-name.

        Args:
            parent_dir: Parent directory to search (e.g., .yoyo-dev/specs)

        Returns:
            Path to most recent tasks.md, or None if not found
        """
        try:
            # Get all subdirectories, sorted by name (reverse = most recent first)
            subdirs = sorted(
                [d for d in parent_dir.iterdir() if d.is_dir()],
                reverse=True
            )

            # Find first subdirectory with tasks.md
            for subdir in subdirs:
                tasks_file = subdir / "tasks.md"
                if tasks_file.exists():
                    return tasks_file

            return None

        except (OSError, PermissionError):
            return None

    @staticmethod
    def _extract_source_metadata(task_file: Path) -> tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Extract source metadata from task file path.

        Determines the source type (spec, fix, master) and extracts clean names
        from the file path structure.

        Args:
            task_file: Path to the task file

        Returns:
            Tuple of (source_type, spec_name, fix_name)
            - source_type: "spec", "fix", "master", or "unknown"
            - spec_name: Clean spec name (without date) or None
            - fix_name: Clean fix name (without date) or None
        """
        try:
            path_parts = task_file.parts

            # Check if path contains .yoyo-dev
            if ".yoyo-dev" in path_parts:
                yoyo_idx = path_parts.index(".yoyo-dev")

                # Check for specs
                if yoyo_idx + 1 < len(path_parts) and path_parts[yoyo_idx + 1] == "specs":
                    if yoyo_idx + 2 < len(path_parts):
                        folder_name = path_parts[yoyo_idx + 2]
                        clean_name = TaskParser._extract_clean_name(folder_name)
                        return ("spec", clean_name, None)

                # Check for fixes
                if yoyo_idx + 1 < len(path_parts) and path_parts[yoyo_idx + 1] == "fixes":
                    if yoyo_idx + 2 < len(path_parts):
                        folder_name = path_parts[yoyo_idx + 2]
                        clean_name = TaskParser._extract_clean_name(folder_name)
                        return ("fix", None, clean_name)

            # Check if it's MASTER-TASKS.md
            if task_file.name == "MASTER-TASKS.md":
                return ("master", None, None)

            # Unknown source
            return ("unknown", None, None)

        except Exception:
            return ("unknown", None, None)

    @staticmethod
    def _extract_clean_name(folder_name: str) -> str:
        """
        Extract clean name from folder name by removing date prefix.

        Converts "2025-10-15-feature-name" to "feature-name".

        Args:
            folder_name: Folder name with date prefix

        Returns:
            Clean name without date prefix
        """
        # Split by hyphen and check if first three parts are date
        parts = folder_name.split('-')

        # If we have at least 4 parts (YYYY-MM-DD-name), remove date
        if len(parts) >= 4:
            # Check if first part looks like a year (4 digits)
            if len(parts[0]) == 4 and parts[0].isdigit():
                # Return everything after the date (parts[3:])
                return '-'.join(parts[3:])

        # Return original if no date pattern found
        return folder_name

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
