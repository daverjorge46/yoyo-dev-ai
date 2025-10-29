"""
FixParser Service

Parses fix folders to extract FixData with defensive error handling.
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional

from ..models import FixData
from .task_parser import TaskParser

logger = logging.getLogger(__name__)


class FixParser:
    """
    Parse fix folders to extract structured FixData.

    Handles:
    - Folder name parsing (date extraction)
    - analysis.md title and problem summary extraction
    - state.json status parsing
    - tasks.md progress calculation
    - Defensive error handling (returns None on failure)
    """

    @staticmethod
    def parse(fix_folder: Path) -> Optional[FixData]:
        """
        Parse fix folder and extract all metadata.

        Args:
            fix_folder: Path to fix folder (e.g., .yoyo-dev/fixes/2025-10-16-fix-name)

        Returns:
            FixData with parsed information, or None if parsing fails
        """
        try:
            # Validate folder exists
            if not fix_folder.exists() or not fix_folder.is_dir():
                logger.error(f"Fix folder does not exist: {fix_folder}")
                return None

            # Extract folder metadata
            folder_name = fix_folder.name
            created_date = FixParser._extract_date(folder_name)
            clean_name = FixParser._extract_clean_name(folder_name)

            # Parse analysis.md for title and problem summary
            analysis_file = fix_folder / "analysis.md"
            if not analysis_file.exists():
                logger.error(f"analysis.md not found in {fix_folder}")
                return None

            title = FixParser._extract_title(analysis_file, clean_name)
            problem_summary = FixParser._extract_problem_summary(analysis_file)

            # Parse state.json for status
            state_file = fix_folder / "state.json"
            status = FixParser._extract_status(state_file)

            # Parse tasks.md for progress
            tasks_file = fix_folder / "tasks.md"
            task_data = TaskParser.parse(tasks_file)
            progress = task_data.progress
            total_tasks = task_data.total_tasks
            completed_tasks = task_data.completed_tasks

            return FixData(
                name=clean_name,
                folder_path=fix_folder,
                created_date=created_date,
                title=title,
                problem_summary=problem_summary,
                status=status,
                progress=progress,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks
            )

        except PermissionError as e:
            logger.error(f"Permission denied reading fix folder {fix_folder}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing fix folder {fix_folder}: {e}")
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
    def _extract_title(analysis_file: Path, fallback_name: str) -> str:
        """
        Extract title from analysis.md (first H1 heading).

        Args:
            analysis_file: Path to analysis.md
            fallback_name: Fallback name if no H1 found

        Returns:
            Title string, or fallback_name if not found
        """
        try:
            with open(analysis_file, 'r') as f:
                content = f.read()

            # Find first H1 heading
            match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            if match:
                return match.group(1).strip()

            # No H1 found, use fallback
            return fallback_name

        except Exception as e:
            logger.warning(f"Error reading analysis.md {analysis_file}: {e}")
            return fallback_name

    @staticmethod
    def _extract_problem_summary(analysis_file: Path) -> str:
        """
        Extract problem summary from analysis.md.

        Looks for "## Problem Summary" section and extracts first paragraph.

        Args:
            analysis_file: Path to analysis.md

        Returns:
            Problem summary text, or empty string if not found
        """
        try:
            with open(analysis_file, 'r') as f:
                content = f.read()

            # Find "## Problem Summary" section
            match = re.search(
                r'^##\s+Problem\s+Summary\s*\n\s*\n(.+?)(?:\n\n|$)',
                content,
                re.MULTILINE | re.IGNORECASE | re.DOTALL
            )

            if match:
                summary = match.group(1).strip()
                # Limit to first 200 characters
                if len(summary) > 200:
                    summary = summary[:197] + "..."
                return summary

            # No problem summary found
            return ""

        except Exception as e:
            logger.warning(f"Error extracting problem summary from {analysis_file}: {e}")
            return ""

    @staticmethod
    def _extract_status(state_file: Path) -> str:
        """
        Extract status from state.json.

        Args:
            state_file: Path to state.json

        Returns:
            Status string ("pending", "fixing", "complete", etc.)
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
