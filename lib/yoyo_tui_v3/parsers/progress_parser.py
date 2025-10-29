"""
ProgressParser Service

Parses execution-progress.json files to extract ExecutionProgress with defensive error handling.
"""

import json
import logging
from pathlib import Path
from typing import Optional

from ..models import ExecutionProgress

logger = logging.getLogger(__name__)


class ProgressParser:
    """
    Parse execution progress JSON files to extract structured ExecutionProgress.

    Handles:
    - JSON parsing with error handling
    - Optional field extraction
    - Defensive error handling (returns empty ExecutionProgress on failure)
    """

    @staticmethod
    def parse(progress_file: Path) -> ExecutionProgress:
        """
        Parse execution progress file and extract all data.

        Args:
            progress_file: Path to execution-progress.json

        Returns:
            ExecutionProgress with parsed information, or empty ExecutionProgress if parsing fails
        """
        try:
            # Validate file exists
            if not progress_file.exists() or not progress_file.is_file():
                logger.debug(f"Progress file does not exist: {progress_file}")
                return ExecutionProgress.empty()

            # Read and parse JSON
            with open(progress_file, 'r') as f:
                content = f.read()

            # Handle empty file
            if not content.strip():
                logger.debug(f"Progress file is empty: {progress_file}")
                return ExecutionProgress.empty()

            data = json.loads(content)

            # Extract fields (all optional except is_running)
            is_running = data.get("is_running", False)
            spec_or_fix_name = data.get("spec_or_fix_name")
            current_phase = data.get("current_phase")
            current_parent_task = data.get("current_parent_task")
            current_subtask = data.get("current_subtask")
            total_parent_tasks = data.get("total_parent_tasks", 0)
            total_subtasks = data.get("total_subtasks", 0)
            percentage = data.get("percentage", 0)
            current_action = data.get("current_action")
            started_at = data.get("started_at")
            last_updated = data.get("last_updated")

            return ExecutionProgress(
                is_running=is_running,
                spec_or_fix_name=spec_or_fix_name,
                current_phase=current_phase,
                current_parent_task=current_parent_task,
                current_subtask=current_subtask,
                total_parent_tasks=total_parent_tasks,
                total_subtasks=total_subtasks,
                percentage=percentage,
                current_action=current_action,
                started_at=started_at,
                last_updated=last_updated
            )

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in progress file {progress_file}: {e}")
            return ExecutionProgress.empty()
        except PermissionError as e:
            logger.error(f"Permission denied reading progress file {progress_file}: {e}")
            return ExecutionProgress.empty()
        except Exception as e:
            logger.error(f"Error parsing progress file {progress_file}: {e}")
            return ExecutionProgress.empty()
