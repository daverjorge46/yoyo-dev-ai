"""
DataManager Service - Coordinate data loading for TUI

Provides centralized data loading and management for the TUI application.
Coordinates loading tasks, project info, specs, and other data sources.
"""

from pathlib import Path
from typing import Optional

from ..models import TaskData
from .task_parser import TaskParser


class DataManager:
    """
    Manage data loading and coordination for TUI.

    Provides methods to:
    - Load active tasks from current project
    - Load project context information
    - Coordinate refresh of all data sources
    """

    @staticmethod
    def load_active_tasks() -> TaskData:
        """
        Load active tasks from current project.

        Auto-discovers tasks.md using priority system:
        1. tasks.md in current directory
        2. Most recent spec tasks.md
        3. Most recent fix tasks.md
        4. MASTER-TASKS.md

        Returns:
            TaskData with parsed tasks (empty if none found)

        Note:
            Handles missing directories gracefully - returns empty TaskData.
        """
        try:
            return TaskParser.find_and_parse_tasks()
        except (OSError, PermissionError) as e:
            # Handle file system errors gracefully
            import sys
            print(f"Warning: Error loading tasks: {e}", file=sys.stderr)
            return TaskData.empty()

    @staticmethod
    def load_project_info() -> dict:
        """
        Load project context information.

        Extracts project name, mission, and other metadata
        from .yoyo-dev/product/ directory.

        Returns:
            Dict with project information:
            - name: Project name
            - mission: Short mission statement
            - has_yoyo_dev: Whether .yoyo-dev exists

        Note:
            Handles missing directories gracefully - returns basic info.
        """
        from pathlib import Path
        import os

        try:
            cwd = Path(os.getcwd())
        except (OSError, RuntimeError):
            # Can't get current directory
            return {
                "name": "Unknown",
                "mission": "",
                "has_yoyo_dev": False
            }

        yoyo_dev = cwd / ".yoyo-dev"

        project_info = {
            "name": cwd.name,
            "mission": "",
            "has_yoyo_dev": False
        }

        # Check if .yoyo-dev exists
        try:
            project_info["has_yoyo_dev"] = yoyo_dev.exists()
        except (OSError, PermissionError):
            # Can't check directory - assume it doesn't exist
            pass

        # Try to load mission-lite.md
        if project_info["has_yoyo_dev"]:
            try:
                product_dir = yoyo_dev / "product"
                if product_dir.exists():
                    mission_lite = product_dir / "mission-lite.md"
                    if mission_lite.exists():
                        try:
                            content = mission_lite.read_text()
                            # Extract first non-empty line as mission
                            lines = [line.strip() for line in content.split('\n') if line.strip()]
                            if lines:
                                # Skip markdown headers
                                for line in lines:
                                    if not line.startswith('#'):
                                        project_info["mission"] = line
                                        break
                        except IOError:
                            pass
            except (OSError, PermissionError):
                # Can't read directory - skip silently
                pass

        return project_info

    @staticmethod
    def refresh_all_data() -> dict:
        """
        Refresh all data sources and return complete data snapshot.

        Loads:
        - Active tasks
        - Project info
        - Spec/fix count

        Returns:
            Dict with all data:
            - task_data: TaskData instance
            - project_info: Project metadata
            - specs_count: Number of specs
            - fixes_count: Number of fixes
        """
        task_data = DataManager.load_active_tasks()
        project_info = DataManager.load_project_info()

        # Count specs and fixes
        specs_count = DataManager._count_items(".yoyo-dev/specs")
        fixes_count = DataManager._count_items(".yoyo-dev/fixes")

        return {
            "task_data": task_data,
            "project_info": project_info,
            "specs_count": specs_count,
            "fixes_count": fixes_count
        }

    @staticmethod
    def _count_items(relative_path: str) -> int:
        """
        Count subdirectories in a path.

        Args:
            relative_path: Path relative to cwd

        Returns:
            Number of subdirectories (0 if path doesn't exist)
        """
        from pathlib import Path
        import os

        cwd = Path(os.getcwd())
        target_dir = cwd / relative_path

        if not target_dir.exists() or not target_dir.is_dir():
            return 0

        try:
            return len([d for d in target_dir.iterdir() if d.is_dir()])
        except (OSError, PermissionError):
            return 0
