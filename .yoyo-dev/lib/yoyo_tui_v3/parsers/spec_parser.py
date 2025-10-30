"""
SpecParser Service

Parses spec folders to extract SpecData with defensive error handling.
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional

from ..models import SpecData
from .task_parser import TaskParser

logger = logging.getLogger(__name__)


class SpecParser:
    """
    Parse spec folders to extract structured SpecData.

    Handles:
    - Folder name parsing (date extraction)
    - spec.md title extraction
    - state.json status parsing
    - tasks.md progress calculation
    - Sub-spec file detection
    - Defensive error handling (returns None on failure)
    """

    @staticmethod
    def parse(spec_folder: Path) -> Optional[SpecData]:
        """
        Parse spec folder and extract all metadata.

        Args:
            spec_folder: Path to spec folder (e.g., .yoyo-dev/specs/2025-10-15-feature-name)

        Returns:
            SpecData with parsed information, or None if parsing fails
        """
        try:
            # Validate folder exists
            if not spec_folder.exists() or not spec_folder.is_dir():
                logger.error(f"Spec folder does not exist: {spec_folder}")
                return None

            # Extract folder metadata
            folder_name = spec_folder.name
            created_date = SpecParser._extract_date(folder_name)
            clean_name = SpecParser._extract_clean_name(folder_name)

            # Parse spec.md for title
            spec_file = spec_folder / "spec.md"
            if not spec_file.exists():
                logger.error(f"spec.md not found in {spec_folder}")
                return None

            title = SpecParser._extract_title(spec_file, clean_name)

            # Parse state.json for status
            state_file = spec_folder / "state.json"
            status = SpecParser._extract_status(state_file)

            # Parse tasks.md for progress
            tasks_file = spec_folder / "tasks.md"
            task_data = TaskParser.parse(tasks_file)
            progress = task_data.progress
            total_tasks = task_data.total_tasks
            completed_tasks = task_data.completed_tasks

            # Check for sub-spec files
            sub_specs_dir = spec_folder / "sub-specs"
            has_technical_spec = (sub_specs_dir / "technical-spec.md").exists()
            has_database_schema = (sub_specs_dir / "database-schema.md").exists()
            has_api_spec = (sub_specs_dir / "api-spec.md").exists()

            return SpecData(
                name=clean_name,
                folder_path=spec_folder,
                created_date=created_date,
                title=title,
                status=status,
                progress=progress,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                has_technical_spec=has_technical_spec,
                has_database_schema=has_database_schema,
                has_api_spec=has_api_spec
            )

        except PermissionError as e:
            logger.error(f"Permission denied reading spec folder {spec_folder}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing spec folder {spec_folder}: {e}")
            return None

    @staticmethod
    def _extract_date(folder_name: str) -> str:
        """
        Extract date from folder name (YYYY-MM-DD-name format).

        Args:
            folder_name: Folder name with date prefix

        Returns:
            Date string in YYYY-MM-DD format, or "unknown" if not found
        """
        # Match YYYY-MM-DD pattern at start
        match = re.match(r'^(\d{4}-\d{2}-\d{2})', folder_name)
        if match:
            return match.group(1)
        return "unknown"

    @staticmethod
    def _extract_clean_name(folder_name: str) -> str:
        """
        Extract clean name from folder name (remove YYYY-MM-DD- prefix).

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
    def _extract_title(spec_file: Path, fallback_name: str) -> str:
        """
        Extract title from spec.md (first H1 heading).

        Args:
            spec_file: Path to spec.md
            fallback_name: Fallback name if no H1 found

        Returns:
            Title string, or fallback_name if not found
        """
        try:
            with open(spec_file, 'r') as f:
                content = f.read()

            # Find first H1 heading
            match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            if match:
                return match.group(1).strip()

            # No H1 found, use fallback
            return fallback_name

        except Exception as e:
            logger.warning(f"Error reading spec.md {spec_file}: {e}")
            return fallback_name

    @staticmethod
    def _extract_status(state_file: Path) -> str:
        """
        Extract status from state.json.

        Args:
            state_file: Path to state.json

        Returns:
            Status string ("pending", "implementation", "complete", etc.)
        """
        try:
            if not state_file.exists():
                return "pending"

            with open(state_file, 'r') as f:
                state_data = json.load(f)

            # Get current_phase as status
            status = state_data.get("current_phase", "pending")
            return status

        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON in state file {state_file}: {e}")
            return "pending"
        except Exception as e:
            logger.warning(f"Error reading state file {state_file}: {e}")
            return "pending"
